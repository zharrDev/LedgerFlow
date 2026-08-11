/** Aturan format jawaban — dipakai semua agent agar UI bisa render rapi (bukan markdown mentah). */
export const AI_RESPONSE_FORMAT_RULES = `
Format jawaban (WAJIB — untuk tampilan aplikasi):
- JANGAN pakai markdown: tidak ada ##, **, \`\`\`, tabel markdown, atau simbol #.
- Struktur jawaban analisis:
  Ringkasan:
  (1-2 kalimat kesimpulan utama)

  Detail:
  - poin pertama dengan angka Rp bila relevan
  - poin kedua

  Rekomendasi:
  - saran praktis 1
  - saran praktis 2
- Angka uang selalu Rp dengan pemisah ribuan (contoh: Rp 12.500.000).
- Judul bagian cukup tulis "Ringkasan:", "Detail:", "Rekomendasi:" tanpa simbol khusus.
- Bahasa Indonesia natural, profesional, mudah dibaca pemilik usaha.
`;
