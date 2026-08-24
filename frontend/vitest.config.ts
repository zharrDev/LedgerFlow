import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Config terpisah dari vite.config.ts supaya setting build (proxy, dsb)
// tidak tercampur dengan setting test.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    // jsdom untuk localStorage (utils/currency.ts) & API browser lain.
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
