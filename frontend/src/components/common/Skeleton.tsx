// frontend/src/components/common/Skeleton.tsx
// Komponen skeleton loading — menampilkan placeholder berkedip saat data
// sedang dimuat. Menggunakan animasi CSS murni (bukan Framer Motion) supaya
// lightweight dan tidak menambah bundle size.

interface SkeletonProps {
  className?: string;
  variant?: "rect" | "circle" | "text" | "card";
}

const SHAPES = {
  rect: "rounded",
  circle: "rounded-full",
  text: "rounded h-4",
  card: "rounded-xl",
} as const;

export function Skeleton({ className = "", variant = "rect" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700/50 ${SHAPES[variant]} ${className}`}
    />
  );
}

// ── Pre-built Skeletons ────────────────────────────────────────────

/** Skeleton untuk transaction card / journal entry card */
export function TransactionCardSkeleton() {
  return (
    <div className="bg-white dark:bg-darkCard rounded-xl p-4 shadow-sm border border-gray-200/60 dark:border-gray-700/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton variant="circle" className="w-10 h-10 shrink-0" />
          <div className="space-y-2">
            <Skeleton variant="text" className="w-32" />
            <Skeleton variant="text" className="w-24 h-3" />
          </div>
        </div>
        <div className="text-right space-y-2">
          <Skeleton variant="text" className="w-20 h-5 ml-auto" />
          <Skeleton variant="text" className="w-16 h-3 ml-auto" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton untuk list transaksi/jurnal */
export function TransactionListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <TransactionCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Skeleton untuk KPI card / stat card di dashboard */
export function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-darkCard rounded-xl p-5 shadow-sm border border-gray-200/60 dark:border-gray-700/30">
      <div className="flex items-center justify-between">
        <div className="space-y-2.5 flex-1">
          <Skeleton variant="text" className="w-24 h-3" />
          <Skeleton variant="text" className="w-36 h-7" />
        </div>
        <Skeleton variant="circle" className="w-12 h-12 shrink-0" />
      </div>
    </div>
  );
}

/** Skeleton untuk dashboard KPI row */
export function DashboardKpiSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Skeleton untuk table row */
export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 py-3 px-4">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} variant="text" className="flex-1 h-4" />
      ))}
    </div>
  );
}

/** Skeleton untuk page header */
export function PageHeaderSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton variant="text" className="w-48 h-8" />
      <Skeleton variant="text" className="w-72 h-4" />
    </div>
  );
}
