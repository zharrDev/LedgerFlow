import {
  BookOpen,
  FileText,
  Loader2,
  Search,
} from "lucide-react";
import { filterQuickNav, type QuickNavItem } from "../data/quickNav";

export interface AccountHit {
  id: string;
  code: string;
  name: string;
}

export interface JournalHit {
  id: string;
  number: string;
  description: string;
  date: string;
}

interface HeaderSearchResultsProps {
  query: string;
  loading?: boolean;
  accounts: AccountHit[];
  journals: JournalHit[];
  onNavigate: (path: string) => void;
  compact?: boolean;
}

export function HeaderSearchResults({
  query,
  loading,
  accounts,
  journals,
  onNavigate,
  compact,
}: HeaderSearchResultsProps) {
  const q = query.trim();
  const navHits: QuickNavItem[] = filterQuickNav(q);
  const hasQuery = q.length > 0;
  const empty =
    hasQuery &&
    !loading &&
    navHits.length === 0 &&
    accounts.length === 0 &&
    journals.length === 0;

  return (
    <div
      className={
        compact
          ? "flex-1 p-4 sm:p-6 overflow-y-auto scrollbar-thin"
          : "absolute left-0 right-0 top-full mt-2 max-h-[min(28rem,70vh)] overflow-y-auto scrollbar-thin rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-2xl z-50"
      }
    >
      {loading && (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500">
          <Loader2 size={14} className="animate-spin" />
          Mencari...
        </div>
      )}

      {empty && (
        <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Tidak ditemukan hasil untuk &ldquo;{q}&rdquo;
        </div>
      )}

      {!empty && (
        <div className="py-2">
          <p className="px-4 pt-1 pb-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {hasQuery ? "Navigasi" : "Pencarian Cepat"}
          </p>
          <div className="space-y-0.5 px-2">
            {navHits.map((item) => (
              <button
                key={item.link}
                type="button"
                onClick={() => onNavigate(item.link)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-primary-50 dark:hover:bg-primary-500/10 hover:text-primary-600 transition-colors"
              >
                <item.icon size={16} className="text-gray-400 shrink-0" />
                <span className="font-medium truncate">{item.label}</span>
              </button>
            ))}
          </div>

          {accounts.length > 0 && (
            <>
              <p className="px-4 pt-3 pb-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Akun
              </p>
              <div className="space-y-0.5 px-2">
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() =>
                      onNavigate(
                        `/chart-of-accounts?search=${encodeURIComponent(acc.code || acc.name)}`,
                      )
                    }
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
                  >
                    <BookOpen size={16} className="text-cyan-500 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="font-mono text-xs text-primary-500 mr-2">
                        {acc.code}
                      </span>
                      <span className="font-medium truncate">{acc.name}</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {journals.length > 0 && (
            <>
              <p className="px-4 pt-3 pb-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Jurnal
              </p>
              <div className="space-y-0.5 px-2 pb-1">
                {journals.map((j) => (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() =>
                      onNavigate(
                        `/journal-entries?search=${encodeURIComponent(j.number || j.description)}`,
                      )
                    }
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
                  >
                    <FileText size={16} className="text-emerald-500 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 mr-2">
                        {j.number}
                      </span>
                      <span className="font-medium line-clamp-1">
                        {j.description || "Tanpa deskripsi"}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {!hasQuery && (
            <p className="px-4 py-2 text-[11px] text-gray-400 flex items-center gap-1.5">
              <Search size={12} />
              Ketik untuk mencari halaman, akun, atau jurnal
            </p>
          )}
        </div>
      )}
    </div>
  );
}
