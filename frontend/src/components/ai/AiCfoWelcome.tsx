import { Bot, BarChart3, Wallet, TrendingDown, ShieldAlert } from "lucide-react";
import { getTimeGreeting, getQuickActions } from "../../utils/aiCfoPrompt";
import type { DashboardSummary } from "../../hooks/useDashboardData";

const ACTION_ICONS = {
  summary: BarChart3,
  cashflow: Wallet,
  expense: TrendingDown,
  risk: ShieldAlert,
} as const;

interface AiCfoWelcomeProps {
  userName?: string;
  summary: DashboardSummary | null;
  disabled?: boolean;
  onQuickAction: (prompt: string, displayText: string) => void;
  todaySessionCount?: number;
}

export function AiCfoWelcome({
  userName,
  summary,
  disabled,
  onQuickAction,
  todaySessionCount = 0,
}: AiCfoWelcomeProps) {
  const greeting = getTimeGreeting();
  const firstName = userName?.split(" ")[0] || "there";
  const actions = getQuickActions(summary);

  return (
    <div className="flex flex-col items-center justify-center text-center px-2 py-8 sm:py-12">
      <div className="mb-4 p-4 rounded-2xl bg-gradient-to-br from-primary-500/15 to-emerald-500/15 border border-primary-500/20">
        <Bot size={36} className="text-primary-500 mx-auto" />
      </div>

      <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
        {greeting}, {firstName}!
      </h2>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed">
        Saya AI CFO LedgerFlow — siap membantu analisis keuangan bisnis Anda.
        Ada yang bisa saya bantu hari ini?
      </p>
      {todaySessionCount > 0 && (
        <p className="mt-2 text-xs text-primary-600 dark:text-primary-400">
          {todaySessionCount} percakapan tersimpan — klik{" "}
          <strong className="font-medium">Riwayat</strong> di atas untuk melanjutkan.
        </p>
      )}

      <div className="mt-8 w-full max-w-md">
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
          Pilih topik atau ketik pertanyaan sendiri
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {actions.map((action) => {
            const Icon = ACTION_ICONS[action.id as keyof typeof ACTION_ICONS] ?? BarChart3;
            return (
              <button
                key={action.id}
                type="button"
                disabled={disabled}
                onClick={() => onQuickAction(action.prompt, action.displayText)}
                className="flex items-center gap-2.5 text-left px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/80 hover:border-primary-500/40 hover:bg-primary-500/5 dark:hover:bg-primary-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <span className="p-1.5 rounded-lg bg-primary-500/10 text-primary-500 group-hover:bg-primary-500/20 shrink-0">
                  <Icon size={16} />
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
