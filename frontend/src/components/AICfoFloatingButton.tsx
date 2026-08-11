import { useNavigate } from "react-router-dom";
import { Bot } from "lucide-react";
import { motion } from "framer-motion";

export function AICfoFloatingButton() {
  const navigate = useNavigate();

  return (
    <motion.button
      type="button"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.96 }}
      onClick={() => navigate("/ai-cfo")}
      aria-label="Buka AI CFO Assistant"
      title="AI CFO Assistant"
      className="fixed bottom-20 right-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-emerald-500 text-white shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 border border-white/20 transition-shadow"
    >
      <Bot size={26} strokeWidth={2} />
    </motion.button>
  );
}
