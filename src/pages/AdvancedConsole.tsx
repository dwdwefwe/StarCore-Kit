import { useState, useEffect, useRef, useCallback } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import {
  FiTerminal,
  FiPlay,
  FiCopy,
  FiTrash2,
  FiStopCircle,
  FiStar,
  FiClock,
} from "react-icons/fi";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

const quickCommands = [
  { label: "列出设备", cmd: "adb devices" },
  { label: "重启到 Recovery", cmd: "adb reboot recovery" },
  { label: "重启到 Fastboot", cmd: "adb reboot bootloader" },
  { label: "截屏", cmd: "adb shell screencap -p /sdcard/screen.png" },
  { label: "拉取截图", cmd: "adb pull /sdcard/screen.png" },
  { label: "Logcat", cmd: "adb logcat" },
  { label: "获取设备信息", cmd: "adb shell getprop ro.product.model" },
  { label: "Fastboot 设备", cmd: "fastboot devices" },
];

export default function AdvancedConsole() {
  const [command, setCommand] = useState("");
  const [output, setOutput] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [streaming, setStreaming] = useState(false); // 是否正在流式输出
  const [streamId, setStreamId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("cmd_history") || "[]");
    } catch {
      return [];
    }
  });
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("cmd_favorites") || "[]");
    } catch {
      return [];
    }
  });
  const [historyIdx, setHistoryIdx] = useState(-1);
  const outputRef = useRef<HTMLDivElement>(null);
  const unlistenRef = useRef<UnlistenFn | null>(null);

  // 自动滚动
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  // 流式监听
  useEffect(() => {
    const initListener = async () => {
      const un = await listen<string>("tool-stream", (event) => {
        const payload = event.payload;
        // 格式: "streamId:内容" 或 "streamId:ERR:内容"
        const [id, ...rest] = payload.split(":");
        const msg = rest.join(":");
        if (id === streamId) {
          setOutput((prev) => [...prev, msg]);
        }
      });
      unlistenRef.current = un;
    };
    initListener();
    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
    };
  }, [streamId]);

  // 历史保存
  useEffect(() => {
    localStorage.setItem("cmd_history", JSON.stringify(history.slice(-50)));
  }, [history]);

  // 收藏保存
  useEffect(() => {
    localStorage.setItem("cmd_favorites", JSON.stringify(favorites));
  }, [favorites]);

  const addToHistory = (cmd: string) => {
    setHistory((prev) => {
      const filtered = prev.filter((c) => c !== cmd);
      return [...filtered, cmd].slice(-50);
    });
  };

  const executeCommand = useCallback(
    async (cmd: string, streamMode = false) => {
      if (!cmd.trim()) return;
      addToHistory(cmd);
      setOutput((prev) => [...prev, `> ${cmd}`]);

      // 如果是流式命令（如 logcat、tail 等），使用流式 API
      const isStream =
        streamMode || cmd.includes("logcat") || cmd.includes("tail");
      if (isStream) {
        const id = Date.now().toString();
        setStreamId(id);
        setStreaming(true);
        setRunning(true);
        try {
          await invoke("execute_adb_stream", { command: cmd, cmdId: id });
        } catch (e: any) {
          setOutput((prev) => [...prev, `❌ 错误: ${e}`]);
        } finally {
          setStreaming(false);
          setRunning(false);
          setStreamId(null);
        }
      } else {
        setRunning(true);
        try {
          const res: string = await invoke("execute_adb", { command: cmd });
          setOutput((prev) => [...prev, res]);
        } catch (e: any) {
          setOutput((prev) => [...prev, `❌ 错误: ${e}`]);
        } finally {
          setRunning(false);
        }
      }
    },
    [],
  );

  const stopStreaming = async () => {
    if (streamId) {
      await invoke("kill_adb_process", { cmdId: streamId });
      setStreaming(false);
      setRunning(false);
      setStreamId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      executeCommand(command);
      setCommand("");
      setHistoryIdx(-1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (historyIdx === -1) {
        setHistoryIdx(history.length - 1);
        setCommand(history[history.length - 1] || "");
      } else if (historyIdx > 0) {
        setHistoryIdx(historyIdx - 1);
        setCommand(history[historyIdx - 1]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx !== -1 && historyIdx < history.length - 1) {
        setHistoryIdx(historyIdx + 1);
        setCommand(history[historyIdx + 1]);
      } else {
        setHistoryIdx(-1);
        setCommand("");
      }
    }
  };

  const toggleFavorite = (cmd: string) => {
    setFavorites((prev) =>
      prev.includes(cmd) ? prev.filter((c) => c !== cmd) : [...prev, cmd],
    );
  };

  return (
    <div className="p-6 flex flex-col h-full space-y-4">
      <h1 className="text-2xl font-bold text-[#1D1D1F] dark:text-white flex items-center gap-2">
        <FiTerminal className="text-[#00C8FF]" />
        高级命令
      </h1>

      <Card className="flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-[#1D1D1F] dark:text-white">
            命令输出
          </h2>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={<FiCopy />}
              onClick={() => navigator.clipboard.writeText(output.join("\n"))}
            >
              复制
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<FiTrash2 />}
              onClick={() => setOutput([])}
            >
              清空
            </Button>
            {streaming && (
              <Button
                variant="danger"
                size="sm"
                icon={<FiStopCircle />}
                onClick={stopStreaming}
              >
                停止
              </Button>
            )}
          </div>
        </div>

        <div
          ref={outputRef}
          className="flex-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl p-4 overflow-y-auto font-mono text-xs text-[#1D1D1F] dark:text-[#B0B0B0] whitespace-pre-wrap mb-4"
          style={{ minHeight: "300px", maxHeight: "calc(100vh - 400px)" }}
        >
          {output.length === 0 ? (
            <span className="text-[#6E6E73] dark:text-[#5A5A5A]">
              等待命令...
            </span>
          ) : (
            output.map((line, i) => <div key={i}>{line}</div>)
          )}
        </div>

        <div className="flex gap-2">
          <Input
            className="flex-1"
            placeholder="输入 ADB / Fastboot 命令..."
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {streaming ? (
            <Button
              variant="danger"
              icon={<FiStopCircle />}
              onClick={stopStreaming}
            >
              停止
            </Button>
          ) : (
            <Button
              icon={<FiPlay />}
              onClick={() => {
                executeCommand(command);
                setCommand("");
              }}
              loading={running && !streaming}
            >
              执行
            </Button>
          )}
        </div>
      </Card>

      {/* 收藏命令 */}
      {favorites.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-[#6E6E73] dark:text-[#8B8B8B] mb-3 flex items-center gap-2">
            <FiStar className="text-[#00C8FF]" />
            收藏命令
          </h3>
          <div className="flex flex-wrap gap-2">
            {favorites.map((cmd, i) => (
              <div key={i} className="flex items-center gap-1">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => executeCommand(cmd)}
                >
                  {cmd}
                </Button>
                <button
                  onClick={() => toggleFavorite(cmd)}
                  className="text-[#6E6E73] dark:text-[#5A5A5A] hover:text-red-400"
                >
                  <FiTrash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 历史记录 */}
      {history.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-[#6E6E73] dark:text-[#8B8B8B] mb-3 flex items-center gap-2">
            <FiClock className="text-[#00C8FF]" />
            最近命令
          </h3>
          <div className="flex flex-wrap gap-2">
            {history
              .slice(-10)
              .reverse()
              .map((cmd, i) => (
                <div key={i} className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => executeCommand(cmd)}
                  >
                    {cmd}
                  </Button>
                  <button
                    onClick={() => toggleFavorite(cmd)}
                    className="text-[#6E6E73] dark:text-[#5A5A5A] hover:text-[#00C8FF]"
                  >
                    <FiStar
                      size={12}
                      fill={favorites.includes(cmd) ? "#00C8FF" : "none"}
                    />
                  </button>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* 快捷命令 */}
      <Card>
        <h3 className="text-sm font-semibold text-[#6E6E73] dark:text-[#8B8B8B] mb-3">
          快捷命令
        </h3>
        <div className="flex flex-wrap gap-2">
          {quickCommands.map((q) => (
            <Button
              key={q.label}
              variant="secondary"
              size="sm"
              onClick={() => executeCommand(q.cmd)}
              disabled={running}
            >
              {q.label}
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
}
