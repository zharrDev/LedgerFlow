import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // Pisah vendor berat ke chunk tersendiri agar chunk awal (first load)
    // tetap ramping: framer-motion dipakai 60+ file termasuk shell awal,
    // recharts + jspdf hanya dipakai halaman laporan (lazy).
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-motion": ["framer-motion"],
          "vendor-charts": ["recharts"],
          "vendor-pdf": ["jspdf", "jspdf-autotable"],
        },
      },
    },
  },
  server: {
    // Arena preview runs behind a unique HTTPS host.
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    },
  },
});
