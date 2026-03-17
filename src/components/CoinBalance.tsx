import { motion } from "framer-motion";
import { Coins } from "lucide-react";

interface CoinBalanceProps {
  balance: number;
  compact?: boolean;
}

export const CoinBalance = ({ balance, compact = false }: CoinBalanceProps) => {
  if (compact) {
    return (
      <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-full px-2 py-0.5 text-xs font-semibold">
        <Coins className="w-3 h-3" />
        {balance}
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="flex items-center gap-2 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-xl px-4 py-2"
    >
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
        <Coins className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="font-bold text-foreground">{balance.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">Coins</p>
      </div>
    </motion.div>
  );
};
