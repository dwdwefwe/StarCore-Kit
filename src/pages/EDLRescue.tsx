import { useState, useEffect, useRef } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import ProgressBar from "../components/ui/ProgressBar";
import { FiFolder, FiRefreshCw, FiUpload } from "react-icons/fi";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";
import { useDynamicIsland } from "../hooks/useDynamicIsland";
import { motion } from "framer-motion";

export default function EDLRescue() {
  const [detected, setDetected] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [loaderPath, setLoaderPath] = useState("");
  const [memory, setMemory] = useState("eMMC");
  const [rawprogramPath, setRawprogramPath] = useState("");
  const [patchPath, setPatchPath] = useState("");
  const [imageDir, setImageDir] = useState("");
  const [reset, setReset] = useState(true);
  const [flashing, setFlashing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);
  const { setContent } = useDynamicIsland();

  useEffect(() => {
    const unlisten = listen<string>("tool-log", (event) =>
      setLogs((prev) => [...prev, event.payload]),
    );
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const detectDevice = async () => {
    setDetecting(true);
    setLogs([]);
    try {
      await invoke("detect_edl");
      setDetected(true);
      setContent({ icon: "✅", title: "检测到 9008 设备", type: "success" });
      setTimeout(() => useDynamicIsland.getState().clear(), 3000);
    } catch (e: any) {
      setDetected(false);
      setContent({
        icon: "❌",
        title: "未检测到 9008 设备",
        subtitle: e,
        type: "error",
      });
    } finally {
      setDetecting(false);
    }
  };

  const selectFile = async (
    setter: (v: string) => void,
    extensions: string[],
  ) => {
    const path = await open({ filters: [{ name: "文件", extensions }] });
    if (path) setter(path as string);
  };
  const selectDir = async (setter: (v: string) => void) => {
    const dir = await open({ directory: true });
    if (dir) setter(dir as string);
  };

  const startFlash = async () => {
    if (!loaderPath || !rawprogramPath || !patchPath || !imageDir) {
      setContent({ icon: "❌", title: "请选择所有必需文件", type: "error" });
      return;
    }
    setFlashing(true);
    setLogs([]);
    setProgress(0);
    try {
      await invoke("edl_flash", {
        loaderPath,
        memory,
        rawprogramPath,
        patchPath,
        imageDir,
        reset,
      });
      setContent({ icon: "🎉", title: "救砖成功", type: "success" });
    } catch (e: any) {
      setContent({ icon: "❌", title: "救砖失败", subtitle: e, type: "error" });
    } finally {
      setFlashing(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 text-[#1D1D1F] dark:text-white">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        🔥 9008 救砖
      </h1>

      <Card>
        <h2 className="text-lg font-semibold mb-3">设备状态</h2>
        <div className="flex items-center gap-3 mb-4">
          <span
            className={`w-3 h-3 rounded-full ${detected ? "bg-green-500 dark:bg-green-400 animate-pulse" : "bg-gray-400 dark:bg-gray-500"}`}
          />
          <span className="text-sm text-[#6E6E73] dark:text-[#B0B0B0]">
            {detected
              ? "已检测到 9008 设备"
              : "未检测，请连接手机进入 9008 模式"}
          </span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={<FiRefreshCw className={detecting ? "animate-spin" : ""} />}
          onClick={detectDevice}
          disabled={detecting}
        >
          {detecting ? "检测中..." : "检测 9008 端口"}
        </Button>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">刷机文件</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-[#6E6E73] dark:text-[#8B8B8B] mb-1">
              Firehose Programmer
            </p>
            <Button
              variant="secondary"
              size="sm"
              icon={<FiFolder />}
              onClick={() => selectFile(setLoaderPath, ["elf", "mbn", "bin"])}
            >
              {loaderPath ? "已选择" : "选择文件"}
            </Button>
            {loaderPath && (
              <p className="text-xs text-[#00C8FF] mt-1 truncate">
                {loaderPath}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-[#6E6E73] dark:text-[#8B8B8B] mb-1">
              存储类型
            </p>
            <select
              value={memory}
              onChange={(e) => setMemory(e.target.value)}
              className="w-full bg-white dark:bg-gray-800 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-[#1D1D1F] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00C8FF]/50"
              style={{ colorScheme: "dark" }}
            >
              <option value="eMMC">eMMC</option>
              <option value="UFS">UFS</option>
              <option value="NAND">NAND</option>
              <option value="spinor">spinor</option>
            </select>
          </div>
          <div>
            <p className="text-xs text-[#6E6E73] dark:text-[#8B8B8B] mb-1">
              rawprogram XML
            </p>
            <Button
              variant="secondary"
              size="sm"
              icon={<FiFolder />}
              onClick={() => selectFile(setRawprogramPath, ["xml"])}
            >
              {rawprogramPath ? "已选择" : "选择文件"}
            </Button>
            {rawprogramPath && (
              <p className="text-xs text-[#00C8FF] mt-1 truncate">
                {rawprogramPath}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-[#6E6E73] dark:text-[#8B8B8B] mb-1">
              Patch XML
            </p>
            <Button
              variant="secondary"
              size="sm"
              icon={<FiFolder />}
              onClick={() => selectFile(setPatchPath, ["xml"])}
            >
              {patchPath ? "已选择" : "选择文件"}
            </Button>
            {patchPath && (
              <p className="text-xs text-[#00C8FF] mt-1 truncate">
                {patchPath}
              </p>
            )}
          </div>
          <div className="md:col-span-2">
            <p className="text-xs text-[#6E6E73] dark:text-[#8B8B8B] mb-1">
              镜像目录
            </p>
            <Button
              variant="secondary"
              size="sm"
              icon={<FiFolder />}
              onClick={() => selectDir(setImageDir)}
            >
              {imageDir ? "已选择" : "选择目录"}
            </Button>
            {imageDir && (
              <p className="text-xs text-[#00C8FF] mt-1 truncate">{imageDir}</p>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-3">高级选项</h2>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={reset}
            onChange={(e) => setReset(e.target.checked)}
            className="rounded w-4 h-4 accent-[#00C8FF]"
          />
          <div>
            <p className="text-sm text-[#1D1D1F] dark:text-white">
              Reset after download
            </p>
            <p className="text-xs text-[#6E6E73] dark:text-[#8B8B8B]">
              刷写完成后自动复位设备（重新启动）
            </p>
          </div>
        </label>
      </Card>

      {flashing && (
        <Card>
          <ProgressBar value={progress} label="刷写进度" />
          <div className="mt-4 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg p-3 max-h-60 overflow-y-auto font-mono text-xs text-[#1D1D1F] dark:text-green-400">
            {logs.map((line, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {line}
              </motion.p>
            ))}
            <div ref={logEndRef} />
          </div>
        </Card>
      )}

      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={startFlash}
        disabled={
          !detected ||
          !loaderPath ||
          !rawprogramPath ||
          !patchPath ||
          !imageDir ||
          flashing
        }
        loading={flashing}
        icon={<FiUpload />}
      >
        {flashing ? "正在救砖..." : "开始救砖"}
      </Button>
    </div>
  );
}
