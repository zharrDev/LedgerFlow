import { useState, useMemo, useEffect } from "react";

// Hook pagination sederhana untuk memotong list per halaman
export function usePagination<T>(items: T[], initialPageSize = 5) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Jaga agar nomor halaman tetap valid saat jumlah data berubah
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    if (page < 1) setPage(1);
  }, [page, totalPages]);

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setPage(1);
  };

  // Ambil item yang tampil di halaman aktif
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const startIndex = items.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, items.length);

  return {
    page,
    setPage,
    totalPages,
    pageItems,
    pageSize,
    setPageSize,
    totalItems: items.length,
    startIndex,
    endIndex,
    canPrev: page > 1,
    canNext: page < totalPages,
    next: () => setPage((p) => Math.min(totalPages, p + 1)),
    prev: () => setPage((p) => Math.max(1, p - 1)),
    goTo: (p: number) => setPage(Math.min(totalPages, Math.max(1, p))),
  };
}
