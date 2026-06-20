import { motion } from "framer-motion";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

export default function Card({
  children,
  className,
  hoverable = false,
  onClick,
}: CardProps) {
  return (
    <motion.div
      whileHover={
        hoverable
          ? {
              scale: 1.01,
              borderColor: "rgba(0,200,255,0.4)",
              boxShadow: "0 12px 28px rgba(0,200,255,0.15)",
            }
          : {}
      }
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      onClick={onClick}
      className={`glass-card p-6 transition-colors ${
        hoverable ? "cursor-pointer" : ""
      } ${className || ""}`}
    >
      {children}
    </motion.div>
  );
}
