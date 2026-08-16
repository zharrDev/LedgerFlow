import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * ErrorBoundary global — menangkap error render React agar halaman tidak
 * menjadi kosong/putih tanpa pesan. Menampilkan kartu error dengan tombol
 * reload supaya user tahu apa yang terjadi (dan bisa coba lagi).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(err: unknown): State {
    return {
      hasError: true,
      message: err instanceof Error ? err.message : String(err),
    };
  }

  componentDidCatch(error: unknown) {
    console.error("[ErrorBoundary]", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-primary-50/30 dark:from-darkBg dark:via-darkBg dark:to-primary-900/10 p-6">
          <div className="max-w-md w-full rounded-2xl bg-white dark:bg-darkCard border border-rose-200 dark:border-rose-500/30 shadow-xl p-8 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 flex items-center justify-center mb-4">
              <svg
                className="w-7 h-7 text-rose-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Terjadi Kesalahan
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Halaman tidak dapat ditampilkan. Detail error:
            </p>
            <p className="text-xs font-mono text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 rounded-lg p-3 mb-5 break-words">
              {this.state.message || "Unknown error"}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-medium shadow-md hover:shadow-lg hover:scale-105 transition-all"
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
