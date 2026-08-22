import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";

export function TermsPage() {
  const { language } = useLanguage();
  const id = language === "id";

  const sections: { title: string; body: string }[] = [
    {
      title: id ? "1. Penerimaan Ketentuan" : "1. Acceptance of Terms",
      body: id
        ? "Dengan mendaftar dan menggunakan LedgerFlow, Anda menyetujui syarat dan ketentuan ini. Jika tidak setuju, mohon jangan menggunakan layanan kami."
        : "By registering for and using LedgerFlow, you agree to these terms and conditions. If you do not agree, please do not use our service.",
    },
    {
      title: id ? "2. Penggunaan Layanan" : "2. Use of Service",
      body: id
        ? "Layanan disediakan untuk membantu pencatatan keuangan usaha Anda. Anda bertanggung jawab atas keakuratan data yang diinput, menjaga kerahasiaan akun, serta memastikan penggunaan sesuai hukum yang berlaku."
        : "The service is provided to help record your business finances. You are responsible for the accuracy of the data you enter, keeping your account credentials confidential, and ensuring your usage complies with applicable law.",
    },
    {
      title: id ? "3. Data & Privasi" : "3. Data & Privacy",
      body: id
        ? "Data keuangan Anda disimpan secara aman dan hanya digunakan untuk menjalankan layanan. Kami tidak menjual data Anda ke pihak ketiga. Lihat kebijakan privasi untuk informasi lebih lanjut."
        : "Your financial data is stored securely and only used to operate the service. We never sell your data to third parties. See our privacy policy for more information.",
    },
    {
      title: id ? "4. Langganan & Pembayaran" : "4. Subscriptions & Payments",
      body: id
        ? "Fitur premium tersedia melalui langganan berbayar. Pembayaran diproses oleh Midtrans. Pembatalan langganan berlaku sesuai ketentuan yang tertera di halaman Pricing."
        : "Premium features are available through a paid subscription. Payments are processed by Midtrans. Cancellations follow the terms shown on the Pricing page.",
    },
    {
      title: id ? "5. Pembatasan Tanggung Jawab" : "5. Limitation of Liability",
      body: id
        ? 'LedgerFlow disediakan sebagaimana adanya ("as is"). Kami tidak bertanggung jawab atas kerugian langsung maupun tidak langsung akibat penggunaan atau ketidakmampuan menggunakan layanan, termasuk kesalahan pencatatan yang dilakukan pengguna.'
        : 'LedgerFlow is provided "as is". We are not liable for direct or indirect losses arising from the use of or inability to use the service, including bookkeeping errors made by users.',
    },
    {
      title: id ? "6. Perubahan Ketentuan" : "6. Changes to These Terms",
      body: id
        ? "Kami dapat memperbarui ketentuan ini sewaktu-waktu. Perubahan akan diumumkan melalui aplikasi dan berlaku setelah dipublikasikan."
        : "We may update these terms from time to time. Changes will be announced in the app and take effect once published.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/30 dark:from-darkBg dark:via-darkBg dark:to-primary-900/10">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
        <Link
          to="/register"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400 mb-6 transition"
        >
          <ArrowLeft size={16} /> {id ? "Kembali ke pendaftaran" : "Back to sign up"}
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shadow-md">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              {id ? "Syarat & Ketentuan" : "Terms & Conditions"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {id ? "Terakhir diperbarui: 14 Agustus 2026" : "Last updated: August 14, 2026"}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-md p-6 sm:p-8 space-y-6 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                {section.title}
              </h2>
              <p>{section.body}</p>
            </section>
          ))}

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-medium shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
            >
              <ArrowLeft size={16} /> {id ? "Kembali" : "Back"}
            </Link>
            <span className="text-xs text-gray-400">© 2026 LedgerFlow</span>
          </div>
        </div>
      </div>
    </div>
  );
}
