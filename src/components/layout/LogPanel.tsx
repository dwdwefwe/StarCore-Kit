import { useState, useEffect, useRef } from "react";
import { FiChevronUp, FiCopy, FiTrash2 } from "react-icons/fi";
import { listen } from "@tauri-apps/api/event";

export default function LogPanel() {
  const [visible, setVisible] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unlisten = listen("tool-log", (event: any) => {
      setLogs((prev) => [...prev, event.payload]);
      if (!visible) setVisible(true);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [visible]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const copyLogs = () => navigator.clipboard.writeText(logs.join("\n"));
  const clearLogs = () => setLogs([]);

  return (
    <div className="border-t border-black/5 dark:border-white/5">
      <button
        onClick={() => setVisible(!visible)}
        className="w-full flex items-center justify-between px-4 py-1.5 bg-white/60 dark:bg-[#0A0A0A]/40 backdrop-blur-xl hover:bg-white/80 dark:hover:bg-white/5 transition-colors text-xs font-semibold text-[#6E6E73] dark:text-[#8B8B8B] uppercase tracking-wide"
      >
        <span>输出日志</span>
        <FiChevronUp
          className={`transition-transform duration-300 ${visible ? "rotate-0" : "rotate-180"}`}
          size={14}
        />
      </button>
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          visible ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="mx-4 mb-3 rounded-lg bg-black/5 dark:bg-white/5 backdrop-blur-md text-[#1D1D1F] dark:text-[#B0B0B0] font-mono text-xs overflow-hidden">
          <div className="flex justify-end gap-2 px-3 py-1 border-b border-black/5 dark:border-white/5">
            <button
              onClick={copyLogs}
              title="复制"
              className="text-[#6E6E73] dark:text-[#5A5A5A] hover:text-[#00C8FF] transition-colors"
            >
              <FiCopy size={13} />
            </button>
            <button
              onClick={clearLogs}
              title="清空"
              className="text-[#6E6E73] dark:text-[#5A5A5A] hover:text-[#00C8FF] transition-colors"
            >
              <FiTrash2 size={13} />
            </button>
          </div>
          <div className="p-3 h-36 overflow-y-auto whitespace-pre-wrap break-all">
            {logs.length === 0 && (
              <span className="text-[#6E6E73] dark:text-[#5A5A5A]">
                暂无日志
              </span>
            )}
            {logs.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
