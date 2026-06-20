import { motion } from "framer-motion";
import { useDynamicIsland } from "../../hooks/useDynamicIsland";
import { FiCpu, FiX, FiChevronRight } from "react-icons/fi";
import { useDeviceStore } from "../../hooks/useDevice";

export default function DynamicIsland() {
  const { device } = useDeviceStore();
  const { content, expanded, collapse, clear } = useDynamicIsland();

  const displayTitle =
    expanded && content ? content.title : device ? device.model : "未连接";
  const displaySubtitle = expanded && content ? (content.subtitle ?? "") : "";
  const displayProgress = expanded && content ? content.progress : undefined;
  const showActions = expanded && content && (content.actionLabel || true);

  return (
    <div className="flex justify-center pt-2 pb-1 pointer-events-none z-50">
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 200, damping: 27, mass: 0.8 }}
        className="pointer-events-auto relative bg-white/70 dark:bg-black/40 backdrop-blur-2xl border border-black/5 dark:border-white/10 rounded-full shadow-sm dark:shadow-2xl flex items-center overflow-hidden island-shadow"
        onClick={() => {
          if (!expanded && device) {
            useDynamicIsland.getState().setContent({
              icon: "📱",
              title: device.model,
              subtitle: `${device.battery}% · ${device.state}`,
              type: "info",
            });
          }
        }}
      >
        <div className="flex items-center gap-2 px-4 py-2 min-w-0">
          <motion.span
            layout
            className="text-lg flex-shrink-0"
            animate={{ scale: expanded ? 1.2 : 1 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
          >
            {expanded && content?.icon ? (
              content.icon
            ) : (
              <FiCpu size={16} className="text-[#00C8FF]" />
            )}
          </motion.span>

          <div className="flex-1 min-w-0">
            <motion.p
              layout
              className="text-sm font-medium text-[#1D1D1F] dark:text-white truncate"
            >
              {displayTitle}
            </motion.p>
            <motion.div
              layout
              animate={{
                opacity: expanded && displaySubtitle ? 1 : 0,
                maxHeight: expanded && displaySubtitle ? 24 : 0,
              }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <p className="text-xs text-[#6E6E73] dark:text-[#B0B0B0] truncate">
                {displaySubtitle}
              </p>
            </motion.div>
            {displayProgress !== undefined && (
              <motion.div
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="w-full h-1 bg-black/10 dark:bg-white/10 rounded-full mt-1 overflow-hidden"
              >
                <motion.div
                  className="h-full bg-[#00C8FF] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${displayProgress}%` }}
                  transition={{ duration: 0.7 }}
                />
              </motion.div>
            )}
          </div>

          {!expanded && device && (
            <motion.span
              layout
              className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400 animate-pulse flex-shrink-0"
            />
          )}

          <motion.div
            layout
            animate={{
              opacity: showActions ? 1 : 0,
              width: showActions ? "auto" : 0,
            }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="flex items-center gap-2 overflow-hidden whitespace-nowrap"
          >
            {content?.actionLabel && content.onAction && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  content.onAction?.();
                }}
                className="text-xs text-[#00C8FF] font-medium hover:underline flex items-center gap-1"
              >
                {content.actionLabel} <FiChevronRight size={12} />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                collapse();
                setTimeout(clear, 450);
              }}
              className="text-[#6E6E73] dark:text-[#5A5A5A] hover:text-[#1D1D1F] dark:hover:text-white transition-colors"
            >
              <FiX size={14} />
            </button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
