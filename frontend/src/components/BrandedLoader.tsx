import { motion } from "framer-motion";
import logo from "../assets/ledgerflow.webp";

/** Small inline fallback for lazy routes — keeps AppShell chrome visible. */
export function RouteSuspenseFallback() {
  return (
    <div className="flex items-center justify-center min-h-[40vh] bg-gray-100 dark:bg-[#0B1120]">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function BrandedLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/40 dark:from-darkBg dark:via-darkBg dark:to-primary-900/20">
      <motion.img
        src={logo}
        alt="LedgerFlow"
        className="w-16 h-16"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="mt-6 h-1 w-56 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
        <motion.div
          className="h-full w-1/2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600"
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}