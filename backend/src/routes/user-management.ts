import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
import { dbErrorResponse } from "../lib/errors.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { normalizePhoneNumber, sendWhatsAppInviteNotification } from "../lib/whatsapp.js";
import {
  createNotification,
  createNotificationsForUsers,
} from "../lib/notify.js";

const userMgmt = new Hono();

userMgmt.use("*", authMiddleware);

// Model role baru: per company hanya ada owner & akuntan.
// (Role "admin" per-company dihapus — admin aplikasi sekarang adalah
// pemilik aplikasi yang masuk lewat gerbang terpisah, read-only + moderasi.)
const ALLOWED_ROLES = ["akuntan", "owner"] as const;

// Hitung jumlah owner AKTIF di sebuah perusahaan (untuk proteksi owner
// terakhir). Sumber tunggal: company_members — tabel users tidak lagi
// dihitung (kolom users.role kini legacy; company_members satu-satunya
// sumber kebenaran role & keanggotaan).
async function countOwners(companyId: string): Promise<number> {
  const { count, error } = await supabase
    .from("company_members")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("role", "owner")
    .eq("status", "active");

  if (error) {
    console.error("[user-management] countOwners error:", error);
    return 0;
  }
  return count ?? 0;
}

async function getCompanyName(companyId: string): Promise<string> {
  const { data } = await supabase
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .single();
  return data?.name || "";
}

// POST /api/users-management
// Undang anggota via NOMOR WHATSAPP (bukan email). Anggota baru selalu dibuat
// sebagai akuntan — role owner hanya bisa diberikan lewat route ganti role.
// Multi-company: nomor yang SUDAH punya akun (member di company lain) tetap
// bisa diundang ke company ini — cukup tambah baris membership baru di
// company_members untuk kombinasi (user, company) ini.
userMgmt.post("/", requireRole("owner"), async (c) => {
  try {
    const { company_id: companyId, sub: myId } = c.get("user");
    const { name, phone, role } = await c.req.json();

    if (!name || !phone || !role) {
      return c.json(
        { error: "Nama, nomor WhatsApp, dan role wajib diisi." },
        400,
      );
    }
    if (role !== "akuntan") {
      return c.json({ error: "Anggota baru hanya bisa dibuat dengan role akuntan." }, 400);
    }

    let normalizedPhone: string;
    try {
      normalizedPhone = normalizePhoneNumber(phone);
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }

    const companyName = await getCompanyName(companyId);

    // ── Kasus 1: nomor SUDAH punya akun (profil ada di users) ──
    const { data: existingProfile, error: findErr } = await supabase
      .from("users")
      .select("id, name, email, phone, avatar_url")
      .eq("phone", normalizedPhone)
      .maybeSingle();

    if (findErr) {
      console.error("[user-mgmt] lookup profile error:", findErr);
      return c.json({ error: "Gagal memeriksa nomor." }, 500);
    }

    if (existingProfile) {
      // Sudah jadi member COMPANY INI spesifik? → tolak dengan pesan jelas.
      const { data: existingMembership } = await supabase
        .from("company_members")
        .select("id, status")
        .eq("user_id", existingProfile.id)
        .eq("company_id", companyId)
        .maybeSingle();

      if (existingMembership) {
        return c.json(
          { error: "Nomor ini sudah jadi anggota perusahaan ini." },
          400,
        );
      }

      // BELUM member company ini (tapi sudah punya akun / member company
      // lain) → INSERT membership baru. INI yang membuat multi-company
      // beneran jalan: akun sama, company berbeda, role independen.
      const { error: memberError } = await supabase
        .from("company_members")
        .insert({
          user_id: existingProfile.id,
          company_id: companyId,
          role,
          status: "active",
        });

      if (memberError) {
        console.error("[user-mgmt] insert membership error:", memberError);
        return c.json({ error: "Gagal menambahkan anggota." }, 500);
      }

      const displayName = existingProfile.name || name;
      sendWhatsAppInviteNotification(
        normalizedPhone,
        displayName,
        companyName,
        role,
      ).catch((err) =>
        console.error("[user-mgmt] kirim WA undangan gagal:", err?.message ?? err),
      );

      createNotification({
        userId: existingProfile.id,
        companyId,
        type: "member_invited",
        title: "Anda Ditambahkan ke Perusahaan Baru",
        message: `Anda ditambahkan sebagai ${role} di ${companyName || "perusahaan baru"}. Pindahkan perusahaan dari menu di sidebar.`,
        link: "/dashboard",
      }).catch(console.error);

      await notifyOtherOwners(companyId, myId, {
        title: "Anggota Baru Ditambahkan",
        message: `${displayName} (${normalizedPhone}) telah ditambahkan sebagai ${role}.`,
      });

      console.log(
        `[user-mgmt] Member EXISTING ditambahkan oleh ${myId}: ${normalizedPhone} (role=${role}) company=${companyId}`,
      );

      return c.json(
        {
          id: existingProfile.id,
          name: displayName,
          email: existingProfile.email ?? null,
          phone: normalizedPhone,
          role,
          status: "active",
          avatar_url: existingProfile.avatar_url ?? null,
        },
        201,
      );
    }

    // ── Kasus 2: nomor BELUM punya akun sama sekali ──
    // Pola sama dengan register WA-OTP: buat auth user dengan phone.
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        phone: `+${normalizedPhone}`,
        phone_confirm: true,
      });

    if (authError) {
      console.error("[user-mgmt] create auth user error:", authError);
      // Jangan bocorkan detail Supabase Auth; pesan generik saja.
      return c.json(
        { error: "Gagal membuat akun. Periksa kembali nomor yang dimasukkan." },
        400,
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .insert({
        id: authData.user.id,
        company_id: companyId, // legacy default-company; sumber kebenaran = company_members
        phone: normalizedPhone,
        name,
        role, // legacy, tidak dipercaya untuk otorisasi
        email: null,
        email_verified: true,
      })
      .select("id, name, phone, avatar_url, created_at")
      .single();

    if (profileError) {
      console.error("[user-mgmt] insert profile error:", profileError);
      // Kompensasi: auth user yang baru dibuat jangan dibiarkan yatim.
      await supabase.auth.admin.deleteUser(authData.user.id).catch(console.error);
      return c.json({ error: "Gagal menyimpan anggota." }, 500);
    }

    const { error: memberError } = await supabase
      .from("company_members")
      .insert({
        user_id: profile.id,
        company_id: companyId,
        role,
        status: "active",
      });

    if (memberError) {
      console.error("[user-mgmt] insert membership error:", memberError);
      // Kompensasi: batalkan profil & auth user agar tidak ada data yatim.
      await supabase.from("users").delete().eq("id", profile.id);
      await supabase.auth.admin.deleteUser(authData.user.id).catch(console.error);
      return c.json({ error: "Gagal menyimpan anggota." }, 500);
    }

    sendWhatsAppInviteNotification(
      normalizedPhone,
      name,
      companyName,
      role,
    ).catch((err) =>
      console.error("[user-mgmt] kirim WA undangan gagal:", err?.message ?? err),
    );

    createNotification({
      userId: profile.id,
      companyId,
      type: "member_invited",
      title: "Selamat Datang di LedgerFlow",
      message: `Anda ditambahkan sebagai ${role} di ${companyName || "perusahaan baru"}. Login dengan OTP WhatsApp untuk mulai.`,
      link: "/dashboard",
    }).catch(console.error);

    await notifyOtherOwners(companyId, myId, {
      title: "Anggota Baru Ditambahkan",
      message: `${name} (${normalizedPhone}) telah ditambahkan sebagai ${role}.`,
    });

    console.log(
      `[user-mgmt] Member NEW dibuat oleh ${myId}: ${normalizedPhone} (role=${role}) company=${companyId}`,
    );

    return c.json(
      {
        id: profile.id,
        name: profile.name,
        email: null,
        phone: profile.phone,
        role,
        status: "active",
        avatar_url: profile.avatar_url ?? null,
        created_at: profile.created_at,
      },
      201,
    );
  } catch (err) {
    console.error("ADD MEMBER CRASH:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Notifikasi in-app untuk owner AKTIF lain (kecuali yang melakukan invite).
// Owner diambil dari company_members (sumber kebenaran).
async function notifyOtherOwners(
  companyId: string,
  actorId: string,
  payload: { title: string; message: string },
) {
  try {
    const { data: memberships } = await supabase
      .from("company_members")
      .select("user_id")
      .eq("company_id", companyId)
      .eq("role", "owner")
      .eq("status", "active")
      .neq("user_id", actorId);

    if (!memberships?.length) return;
    createNotificationsForUsers(
      memberships.map((m) => m.user_id),
      { companyId, type: "member_invited", ...payload, link: "/settings" },
    ).catch(console.error);
  } catch (err) {
    console.error("[user-mgmt] notifyOtherOwners error:", err);
  }
}

// GET / (list) — hanya owner
// Sumber data: company_members (sumber kebenaran keanggotaan) + profil user
// dari users. company_members.user_id menunjuk auth.users (bukan public.users)
// sehingga join via PostgREST tidak bisa — profil diambil query terpisah lalu
// digabung manual (pola sama dengan admin-gate).
userMgmt.get("/", requireRole("owner"), async (c) => {
  const { company_id } = c.get("user");
  const { search, sort, role, status, page, limit } = c.req.query();

  // Search (nama/email/telepon) butuh id profil dulu — ilike hanya ada di
  // tabel users. Batasi 1000 id agar query .in tetap ringan.
  let searchIds: string[] | null = null;
  if (search) {
    const { data: matched, error: searchErr } = await supabase
      .from("users")
      .select("id")
      .or(
        `name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`,
      )
      .limit(1000);
    if (searchErr) return dbErrorResponse(c, searchErr);
    searchIds = (matched ?? []).map((u) => u.id);
    if (searchIds.length === 0) {
      return c.json({ data: [], total: 0, page: 1, limit: parseInt(limit || "20") });
    }
  }

  let query = supabase
    .from("company_members")
    .select("user_id, role, status, created_at", { count: "exact" })
    .eq("company_id", company_id);

  if (role) query = query.eq("role", role);
  if (status) query = query.eq("status", status);
  if (searchIds) query = query.in("user_id", searchIds);

  // Sort di level membership: created_at & role. Sort by name dilakukan di
  // JS setelah profil digabung (halaman maks 100 baris, tetap ringan).
  const sortFieldRaw = sort?.startsWith("-") ? sort.slice(1) : sort || "created_at";
  const sortDir = sort?.startsWith("-") ? ("desc" as const) : ("asc" as const);
  const jsSort = sortFieldRaw === "name";
  const dbSortField = jsSort ? "created_at" : sortFieldRaw;
  query = query.order(dbSortField, { ascending: sortDir === "asc" });

  const pageNum = Math.max(1, parseInt(page || "1"));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit || "20")));
  const offset = (pageNum - 1) * limitNum;
  query = query.range(offset, offset + limitNum - 1);

  const { data: memberships, error, count } = await query;
  if (error) return dbErrorResponse(c, error);

  const memberRows = memberships ?? [];
  const userIds = memberRows.map((m) => m.user_id);

  const { data: profiles } = userIds.length
    ? await supabase
        .from("users")
        .select("id, name, email, phone, avatar_url, created_at")
        .in("id", userIds)
    : { data: [] };
  const profileMap = new Map<string, any>(
    (profiles ?? []).map((p) => [(p as any).id, p]),
  );

  let data = memberRows.map((m) => {
    const p = (profileMap.get(m.user_id) ?? {}) as any;
    return {
      id: m.user_id,
      name: p.name ?? "",
      email: p.email ?? null,
      phone: p.phone ?? null,
      role: m.role,
      status: m.status,
      avatar_url: p.avatar_url ?? null,
      member_since: m.created_at,
      created_at: p.created_at ?? m.created_at,
    };
  });

  if (jsSort) {
    data.sort((a, b) =>
      sortDir === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name),
    );
  }

  return c.json({ data, total: count || 0, page: pageNum, limit: limitNum });
});

// PUT /:id/role — hanya owner
// Owner boleh mengubah role siapa pun antara akuntan <-> owner,
// dengan proteksi: owner terakhir tidak boleh didemote.
// Target & penulisan role murni di company_members (sumber kebenaran),
// untuk kombinasi (user_id, company_id) milik owner yang login.
userMgmt.put("/:id/role", requireRole("owner"), async (c) => {
  const { company_id } = c.get("user");
  const id = c.req.param("id");
  const { role } = await c.req.json();

  if (!ALLOWED_ROLES.includes(role)) {
    return c.json(
      { error: "Role tidak valid. Pilih: akuntan atau owner." },
      400,
    );
  }

  const { data: membership } = await supabase
    .from("company_members")
    .select("user_id, role")
    .eq("user_id", id)
    .eq("company_id", company_id)
    .maybeSingle();

  if (!membership) {
    return c.json(
      { error: "User bukan anggota perusahaan ini" },
      404,
    );
  }

  if (membership.role === "owner" && role !== "owner") {
    const owners = await countOwners(company_id);
    if (owners <= 1) {
      return c.json(
        { error: "Tidak bisa menurunkan role owner terakhir." },
        400,
      );
    }
  }

  const { error } = await supabase
    .from("company_members")
    .update({ role })
    .eq("user_id", id)
    .eq("company_id", company_id);

  if (error) return dbErrorResponse(c, error);

  return c.json({ message: "Role berhasil diubah" });
});

// DELETE /:id — hanya owner
// HAPUS DARI COMPANY, BUKAN HAPUS AKUN: yang dihapus hanya baris
// company_members untuk kombinasi (user_id, company_id) ini. Akun Supabase
// Auth & profil user TETAP UTUH — user yang juga member company lain tidak
// kehilangan akses di company tersebut. Penghapusan akun total (bila user
// tidak lagi member di company mana pun) adalah langkah OPSIONAL TERPISAH
// lewat portal admin, tidak digabung di sini.
userMgmt.delete("/:id", requireRole("owner"), async (c) => {
  const { company_id, sub: myId } = c.get("user");
  const id = c.req.param("id");

  if (id === myId) {
    return c.json({ error: "Tidak bisa menghapus akun sendiri." }, 400);
  }

  const { data: membership } = await supabase
    .from("company_members")
    .select("id, role, user_id")
    .eq("user_id", id)
    .eq("company_id", company_id)
    .maybeSingle();

  if (!membership) {
    return c.json({ error: "User bukan anggota perusahaan ini" }, 404);
  }

  // Proteksi owner terakhir: hanya owner AKTIF yang dihitung.
  if (membership.role === "owner") {
    const owners = await countOwners(company_id);
    if (owners <= 1) {
      return c.json(
        { error: "Tidak bisa menghapus satu-satunya Owner." },
        400,
      );
    }
  }

  const { error: deleteError } = await supabase
    .from("company_members")
    .delete()
    .eq("user_id", id)
    .eq("company_id", company_id);

  if (deleteError) return dbErrorResponse(c, deleteError);

  // Info (tidak fatal): sisa membership user di company lain. Dipakai untuk
  // log & respons — keputusan menghapus akun Auth sepenuhnya TIDAK diambil
  // otomatis di endpoint ini (langkah opsional terpisah via portal admin).
  const { count: remainingMemberships } = await supabase
    .from("company_members")
    .select("id", { count: "exact", head: true })
    .eq("user_id", id);

  const lastCompany = (remainingMemberships ?? 0) === 0;
  if (lastCompany) {
    console.log(
      `[user-mgmt] user ${id} tidak lagi member di company mana pun. Akun Auth dibiarkan ada (opsi hapus total tersedia via portal admin).`,
    );
  }

  console.log(
    `[user-mgmt] member ${id} dihapus dari company ${company_id} oleh ${myId} (sisa membership: ${remainingMemberships ?? 0})`,
  );

  return c.json({
    message: lastCompany
      ? "User berhasil dihapus dari perusahaan ini. Akunnya tidak lagi terhubung ke perusahaan mana pun."
      : "User berhasil dihapus dari perusahaan ini.",
    remaining_companies: remainingMemberships ?? 0,
  });
});

// PATCH /:id/suspend & /:id/reactivate — hanya owner
// Nonaktifkan-aktifkan sementara anggota untuk COMPANY INI SAJA: yang diubah
// kolom `status` di company_members untuk kombinasi (user_id, company_id)
// milik owner yang login. Sifatnya per-company — user yang juga member di
// company lain TIDAK terpengaruh di sana. (Suspend global lintas-company
// tetap menjadi wewenang admin aplikasi via portal admin / users.status.)
// Token user yang di-suspend langsung ditolak authMiddleware pada request
// berikutnya (cek membership aktif per request).

userMgmt.patch("/:id/suspend", requireRole("owner"), async (c) => {
  const { company_id, sub: myId } = c.get("user");
  const id = c.req.param("id");

  if (id === myId) {
    return c.json({ error: "Tidak bisa menonaktifkan akun sendiri." }, 400);
  }

  const { data: membership } = await supabase
    .from("company_members")
    .select("role, status")
    .eq("user_id", id)
    .eq("company_id", company_id)
    .maybeSingle();

  if (!membership) {
    return c.json({ error: "User bukan anggota perusahaan ini" }, 404);
  }
  if (membership.status === "suspended") {
    return c.json({ error: "User sudah dalam status suspend." }, 400);
  }
  if (membership.role === "owner") {
    const owners = await countOwners(company_id);
    if (owners <= 1) {
      return c.json(
        { error: "Tidak bisa menonaktifkan satu-satunya Owner." },
        400,
      );
    }
  }

  const { error } = await supabase
    .from("company_members")
    .update({ status: "suspended" })
    .eq("user_id", id)
    .eq("company_id", company_id);

  if (error) return dbErrorResponse(c, error);
  return c.json({ message: "User dinonaktifkan dari perusahaan ini.", status: "suspended" });
});

userMgmt.patch("/:id/reactivate", requireRole("owner"), async (c) => {
  const { company_id } = c.get("user");
  const id = c.req.param("id");

  const { data: membership } = await supabase
    .from("company_members")
    .select("status")
    .eq("user_id", id)
    .eq("company_id", company_id)
    .maybeSingle();

  if (!membership) {
    return c.json({ error: "User bukan anggota perusahaan ini" }, 404);
  }
  if (membership.status === "active") {
    return c.json({ error: "User sudah aktif." }, 400);
  }

  const { error } = await supabase
    .from("company_members")
    .update({ status: "active" })
    .eq("user_id", id)
    .eq("company_id", company_id);

  if (error) return dbErrorResponse(c, error);
  return c.json({ message: "User diaktifkan kembali.", status: "active" });
});

export default userMgmt;