import { useState } from "react";
import {
  FiCpu,
  FiHardDrive,
  FiSettings,
  FiMenu,
  FiX,
  FiTool,
  FiTerminal,
} from "react-icons/fi";
import { motion } from "framer-motion";
import { useDeviceStore } from "../../hooks/useDevice";

const navItems = [
  { id: "dashboard", icon: FiCpu, label: "仪表盘" },
  { id: "root", icon: FiHardDrive, label: "一键 Root" },
  { id: "tools", icon: FiTool, label: "工具箱" },
  { id: "console", icon: FiTerminal, label: "高级命令" },
  { id: "settings", icon: FiSettings, label: "设置" },
];

interface Props {
  activePage: string;
  onNavigate: (page: string) => void;
}

export default function Sidebar({ activePage, onNavigate }: Props) {
  const [open, setOpen] = useState(true);
  const { device } = useDeviceStore();

  return (
    <motion.aside
      animate={{ width: open ? 280 : 72 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="flex flex-col bg-white/60 dark:bg-[#0A0A0A]/80 backdrop-blur-2xl border-r border-black/5 dark:border-white/5"
    >
      <div className="flex items-center justify-between px-6 py-6">
        {open && (
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚀</span>
            <span className="text-lg font-bold bg-gradient-to-r from-[#1D1D1F] to-[#00C8FF] dark:from-white dark:to-[#00C8FF] bg-clip-text text-transparent">
              星核刷机
            </span>
          </div>
        )}
        <button
          onClick={() => setOpen(!open)}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          {open ? <FiX size={20} /> : <FiMenu size={20} />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex items-center w-full px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
              activePage === item.id
                ? "text-[#00C8FF]"
                : "text-[#6E6E73] dark:text-[#8B8B8B] hover:text-[#1D1D1F] dark:hover:text-white"
            }`}
          >
            {activePage === item.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute left-0 w-[3px] h-5 bg-[#00C8FF] rounded-full"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            <item.icon
              size={20}
              className="transition-transform duration-200 group-hover:scale-110"
            />
            {open && (
              <span className="ml-3 text-sm font-medium">{item.label}</span>
            )}
          </button>
        ))}
      </nav>

      {open && (
        <div className="p-3 mx-3 mb-4 glass-card">
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`w-2 h-2 rounded-full ${
                device
                  ? "bg-green-500 animate-pulse"
                  : "bg-gray-400 dark:bg-gray-500"
              }`}
            />
            <span className="text-[#6E6E73] dark:text-[#8B8B8B] text-xs">
              {device ? device.model : "未连接"}
            </span>
          </div>
        </div>
      )}
    </motion.aside>
  );
}
