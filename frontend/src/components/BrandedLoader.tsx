import { motion } from "framer-motion";
import logo from "../assets/ledgerflow.png";

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