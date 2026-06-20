import { FiX } from "react-icons/fi";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
}

export default function Input({
  icon,
  clearable,
  onClear,
  className,
  ...props
}: InputProps) {
  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6E6E73] dark:text-[#5A5A5A]">
          {icon}
        </div>
      )}
      <input
        className={`w-full bg-black/5 dark:bg-white/5 backdrop-blur-md border border-black/10 dark:border-white/10 rounded-xl py-2 ${
          icon ? "pl-10" : "pl-4"
        } pr-4 text-sm text-[#1D1D1F] dark:text-white placeholder-[#6E6E73] dark:placeholder-[#5A5A5A] focus:outline-none focus:ring-2 focus:ring-[#00C8FF]/50 focus:border-transparent transition-all duration-200 ${className || ""}`}
        {...props}
      />
      {clearable && props.value && (
        <button
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6E6E73] dark:text-[#5A5A5A] hover:text-[#1D1D1F] dark:hover:text-white transition-colors"
        >
          <FiX size={16} />
        </button>
      )}
    </div>
  );
}
