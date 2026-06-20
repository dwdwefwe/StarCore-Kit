import { motion } from "framer-motion";
import classNames from "classnames";

interface ButtonProps {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  loading?: boolean;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export default function Button({
  variant = "primary",
  size = "md",
  icon,
  loading,
  children,
  className,
  disabled,
  onClick,
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#00C8FF]/50 disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-6 py-3 text-base gap-2.5",
  };
  const variants = {
    primary:
      "bg-[#00C8FF] text-white shadow-lg shadow-[#00C8FF]/25 hover:shadow-[#00C8FF]/40 hover:scale-[1.02] active:scale-95",
    secondary:
      "bg-black/5 dark:bg-white/5 backdrop-blur-md border border-black/10 dark:border-white/10 text-[#1D1D1F] dark:text-white hover:bg-black/10 dark:hover:bg-white/10",
    danger:
      "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40",
    ghost:
      "text-[#6E6E73] dark:text-[#8B8B8B] hover:text-[#1D1D1F] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5",
  };

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      className={classNames(base, sizes[size], variants[variant], className)}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        icon
      )}
      {children}
    </motion.button>
  );
}
