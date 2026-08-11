import { motion } from "framer-motion";
import { Mail, MessageCircle, Clock, ExternalLink } from "lucide-react";
import type { HelpContactCard } from "../../data/helpCenterContent";

const ICONS = {
  email: Mail,
  whatsapp: MessageCircle,
  hours: Clock,
} as const;

export function ContactCards({ cards }: { cards: HelpContactCard[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card) => {
        const Icon = ICONS[card.type] ?? Mail;
        return (
          <motion.div
            key={card.label}
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="group rounded-2xl bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700/50 shadow-sm hover:shadow-md p-5 transition-all"
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2.5 rounded-xl ${
                  card.color === "primary"
                    ? "bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400"
                    : card.color === "emerald"
                      ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                }`}
              >
                <Icon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {card.label}
                </p>
                {card.href ? (
                  <a
                    href={card.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-gray-800 dark:text-white hover:text-primary-500 dark:hover:text-primary-400 transition-colors flex items-center gap-1 mt-0.5 break-all"
                  >
                    {card.value}
                    <ExternalLink size={12} className="opacity-50 shrink-0" />
                  </a>
                ) : (
                  <p className="text-sm font-semibold text-gray-800 dark:text-white mt-0.5">
                    {card.value}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
