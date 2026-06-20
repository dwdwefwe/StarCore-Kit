import { useState } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import ProgressBar from "../components/ui/ProgressBar";
import { FiFolder, FiUpload } from "react-icons/fi";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useDynamicIsland } from "../hooks/useDynamicIsland";
import { motion } from "framer-motion";

const commonPartitions = [
  { name: "boot", label: "Boot" },
  { name: "init_boot", label: "Init Boot" },
  { name: "recovery", label: "Recovery" },
  { name: "system", label: "System" },
  { name: "system_ext", label: "System Ext" },
  { name: "vendor", label: "Vendor" },
  { name: "vendor_boot", label: "Vendor Boot" },
  { name: "product", label: "Product" },
  { name: "odm", label: "ODM" },
  { name: "dtbo", label: "DTBO" },
  { name: "vbmeta", label: "vbmeta" },
  { name: "vbmeta_system", label: "vbmeta System" },
  { name: "vbmeta_vendor", label: "vbmeta Vendor" },
  { name: "userdata", label: "Userdata" },
  { name: "cache", label: "Cache" },
  { name: "persist", label: "Persist" },
  { name: "modem", label: "Modem" },
  { name: "modemst1", label: "Modemst1" },
  { name: "modemst2", label: "Modemst2" },
  { name: "fsg", label: "FSG" },
  { name: "fsc", label: "FSC" },
  { name: "dsp", label: "DSP" },
  { name: "devcfg", label: "Devcfg" },
  { name: "abl", label: "ABL" },
  { name: "xbl", label: "XBL" },
  { name: "keymaster", label: "Keymaster" },
  { name: "hyp", label: "HYP" },
  { name: "tz", label: "TZ" },
  { name: "rpm", label: "RPM" },
  { name: "uefisecapp", label: "UEFI SecApp" },
  { name: "qupfw", label: "QUPFW" },
  { name: "imagefv", label: "ImageFV" },
  { name: "shrm", label: "SHRM" },
  { name: "cmnlib", label: "Cmnlib" },
  { name: "cmnlib64", label: "Cmnlib64" },
];

export default function FastbootRescue() {
  const [imageDir, setImageDir] = useState("");
  const [selectedPartitions, setSelectedPartitions] = useState<string[]>([]);
  const [flashing, setFlashing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const { setContent } = useDynamicIsland();

  const selectDir = async () => {
    const dir = await open({ directory: true });
    if (dir) setImageDir(dir as string);
  };

  const togglePartition = (name: string) => {
    setSelectedPartitions((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name],
    );
  };

  const selectAll = () =>
    setSelectedPartitions(commonPartitions.map((p) => p.name));
  const deselectAll = () => setSelectedPartitions([]);

  const startFlash = async () => {
    if (!imageDir) {
      setContent({ icon: "❌", title: "请选择镜像目录", type: "error" });
      return;
    }
    if (selectedPartitions.length === 0) {
      setContent({ icon: "❌", title: "请至少选择一个分区", type: "error" });
      return;
    }
    setFlashing(true);
    setLogs([]);
    setProgress(0);
    try {
      import("@tauri-apps/api/event").then((m) =>
        m.listen<string>("tool-log", (event) =>
          setLogs((prev) => [...prev, event.payload]),
        ),
      );
      await invoke("fastboot_rescue", {
        imageDir,
        partitions: selectedPartitions,
      });
      setContent({ icon: "🎉", title: "Fastboot 救砖完成", type: "success" });
    } catch (e: any) {
      setContent({ icon: "❌", title: "救砖失败", subtitle: e, type: "error" });
    } finally {
      setFlashing(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        ⚡ Fastboot 救砖
      </h1>

      <Card>
        <h2 className="text-lg font-semibold mb-3">镜像目录</h2>
        <p className="text-xs text-[#8B8B8B] mb-3">
          选择一个包含分区镜像文件的文件夹，文件名需为{" "}
          <code className="bg-black/10 dark:bg-white/10 px-1 rounded">
            分区名.img
          </code>
        </p>
        <Button
          variant="secondary"
          size="sm"
          icon={<FiFolder />}
          onClick={selectDir}
        >
          {imageDir ? "已选择" : "选择目录"}
        </Button>
        {imageDir && (
          <p className="text-xs text-[#00C8FF] mt-2 truncate">{imageDir}</p>
        )}
      </Card>

      <Card>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">分区选择</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={selectAll}>
              全选
            </Button>
            <Button variant="ghost" size="sm" onClick={deselectAll}>
              取消全选
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
          {commonPartitions.map((p) => (
            <label
              key={p.name}
              className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                selectedPartitions.includes(p.name)
                  ? "border-[#00C8FF] bg-[#00C8FF]/10"
                  : "border-black/5 dark:border-white/10 hover:border-[#00C8FF]/40"
              }`}
            >
              <input
                type="checkbox"
                checked={selectedPartitions.includes(p.name)}
                onChange={() => togglePartition(p.name)}
                className="rounded w-4 h-4 accent-[#00C8FF]"
              />
              <span className="text-sm text-[#1D1D1F] dark:text-white">
                {p.label}
              </span>
            </label>
          ))}
        </div>
      </Card>

      {flashing && (
        <Card>
          <ProgressBar value={progress} label="刷写进度" />
          <div className="mt-4 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg p-3 max-h-60 overflow-y-auto font-mono text-xs">
            {logs.map((line, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {line}
              </motion.p>
            ))}
          </div>
        </Card>
      )}

      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={startFlash}
        disabled={!imageDir || selectedPartitions.length === 0 || flashing}
        loading={flashing}
        icon={<FiUpload />}
      >
        {flashing ? "正在救砖..." : "开始救砖"}
      </Button>
    </div>
  );
}
