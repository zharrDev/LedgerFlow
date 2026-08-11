import { Loader2 } from "lucide-react";

interface AiCfoLoadingIndicatorProps {
  variant?: "initial" | "analyzing";
}

export function AiCfoLoadingIndicator({
  variant = "analyzing",
}: AiCfoLoadingIndicatorProps) {
  const title =
    variant === "initial"
      ? "Menyiapkan ringkasan keuangan..."
      : "AI sedang menganalisis data...";

  return (
    <div className="rounded-xl border border-primary-500/20 bg-primary-500/5 dark:bg-primary-500/10 px-4 py-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
        <Loader2 size={16} className="animate-spin text-primary-500 shrink-0" />
        {title}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed pl-6">
        Model gratis OpenRouter kadang butuh{" "}
        <strong className="font-medium text-gray-600 dark:text-gray-300">
          30–90 detik
        </strong>{" "}
        (memanggil data + menyusun jawaban). Aplikasi masih berjalan — mohon
        tunggu, jangan tutup halaman.
      </p>
    </div>
  );
}
