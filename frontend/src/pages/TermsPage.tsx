import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/30 dark:from-darkBg dark:via-darkBg dark:to-primary-900/10">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
        <Link
          to="/register"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400 mb-6 transition"
        >
          <ArrowLeft size={16} /> Kembali ke pendaftaran
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shadow-md">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              Syarat &amp; Ketentuan
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Terakhir diperbarui: 14 Agustus 2026
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-md p-6 sm:p-8 space-y-6 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
              1. Penerimaan Ketentuan
            </h2>
            <p>
              Dengan mendaftar dan menggunakan LedgerFlow, Anda menyetujui
              syarat dan ketentuan ini. Jika tidak setuju, mohon jangan
              menggunakan layanan kami.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
              2. Penggunaan Layanan
            </h2>
            <p>
              Layanan disediakan untuk membantu pencatatan keuangan usaha
              Anda. Anda bertanggung jawab atas keakuratan data yang diinput,
              menjaga kerahasiaan akun, serta memastikan penggunaan sesuai
              hukum yang berlaku.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
              3. Data &amp; Privasi
            </h2>
            <p>
              Data keuangan Anda disimpan secara aman dan hanya digunakan
              untuk menjalankan layanan. Kami tidak menjual data Anda ke pihak
              ketiga. Lihat kebijakan privasi untuk informasi lebih lanjut.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
              4. Langganan &amp; Pembayaran
            </h2>
            <p>
              Fitur premium tersedia melalui langganan berbayar. Pembayaran
              diproses oleh Midtrans. Pembatalan langganan berlaku sesuai
              ketentuan yang tertera di halaman Pricing.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
              5. Pembatasan Tanggung Jawab
            </h2>
            <p>
              LedgerFlow disediakan sebagaimana adanya ("as is"). Kami tidak
              bertanggung jawab atas kerugian langsung maupun tidak langsung
              akibat penggunaan atau ketidakmampuan menggunakan layanan,
              termasuk kesalahan pencatatan yang dilakukan pengguna.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
              6. Perubahan Ketentuan
            </h2>
            <p>
              Kami dapat memperbarui ketentuan ini sewaktu-waktu. Perubahan
              akan diumumkan melalui aplikasi dan berlaku setelah
              dipublikasikan.
            </p>
          </section>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-medium shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
            >
              <ArrowLeft size={16} /> Kembali
            </Link>
            <span className="text-xs text-gray-400">© 2026 LedgerFlow</span>
          </div>
        </div>
      </div>
    </div>
  );
}