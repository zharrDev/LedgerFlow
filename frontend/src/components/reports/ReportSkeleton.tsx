/** Skeleton placeholder for financial report pages (first load only). */
export function ReportSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden>
      <div
        className={`grid gap-4 ${
          cards === 3
            ? "grid-cols-1 sm:grid-cols-3"
            : cards === 2
              ? "grid-cols-1 sm:grid-cols-2"
              : "grid-cols-1"
        }`}
      >
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 p-5 h-24"
          />
        ))}
      </div>
      <div className="rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 overflow-hidden">
        <div className="h-16 bg-gray-100 dark:bg-gray-800/50" />
        <div className="p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex justify-between gap-4">
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded flex-1 max-w-[60%]" />
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Thin refetch indicator — keeps previous data visible underneath. */
export function ReportRefetchBar({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-primary-600 dark:text-primary-400 py-1">
      <div className="w-3.5 h-3.5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin shrink-0" />
      <span>{label}</span>
    </div>
  );
}
