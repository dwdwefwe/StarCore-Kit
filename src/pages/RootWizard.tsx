import { useState, useEffect, useRef } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import ProgressBar from "../components/ui/ProgressBar";
import {
  FiCpu,
  FiAlertTriangle,
  FiInfo,
  FiSmartphone,
  FiFolder,
  FiUpload,
} from "react-icons/fi";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";

const methods = [
  {
    id: "magisk",
    name: "Magisk",
    icon: "🧩",
    desc: "修补 boot.img，推荐大多数设备",
    recommendPartition: "boot",
  },
  {
    id: "ksu",
    name: "KernelSU",
    icon: "🛡️",
    desc: "修补 init_boot（GKI 内核）",
    recommendPartition: "init_boot",
  },
  {
    id: "apatch",
    name: "APatch",
    icon: "🔧",
    desc: "修补 boot 或 init_boot",
    recommendPartition: "boot",
  },
  {
    id: "reksu",
    name: "Resukisu",
    icon: "♻️",
    desc: "修补 init_boot",
    recommendPartition: "init_boot",
  },
  {
    id: "ksu_ultra",
    name: "Sukisu Ultra",
    icon: "⚡",
    desc: "修补 init_boot",
    recommendPartition: "init_boot",
  },
  {
    id: "ksu_next",
    name: "KernelSU Next",
    icon: "🆕",
    desc: "修补 init_boot",
    recommendPartition: "init_boot",
  },
  {
    id: "folk_patch",
    name: "Folk Patch",
    icon: "🧵",
    desc: "修补 boot",
    recommendPartition: "boot",
  },
];

const steps = [
  { key: "select", label: "选择方案" },
  { key: "push", label: "推送镜像" },
  { key: "install", label: "安装 APK" },
  { key: "wait", label: "等待修补" },
  { key: "pull", label: "拉取镜像" },
  { key: "flash", label: "刷入" },
];

export default function RootWizard() {
  const [selectedMethod, setSelectedMethod] = useState("magisk");
  const [selectedPartition, setSelectedPartition] = useState("boot");
  const [imagePath, setImagePath] = useState("");
  const [patchedImagePath, setPatchedImagePath] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unlog = listen<string>("tool-log", (event) => {
      setLogs((prev) => [...prev, event.payload]);
      const msg = event.payload;
      if (msg.includes("推送成功")) setCurrentStep(2);
      else if (msg.includes("APK 安装成功")) setCurrentStep(3);
      else if (msg.includes("拉取成功")) setCurrentStep(4);
      else if (msg.includes("开始一键刷入")) setCurrentStep(5);
    });
    const unprog = listen<number>("tool-progress", (event) =>
      setProgress(event.payload),
    );
    return () => {
      unlog.then((f) => f());
      unprog.then((f) => f());
    };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleMethodChange = (methodId: string) => {
    setSelectedMethod(methodId);
    const method = methods.find((m) => m.id === methodId);
    if (method) setSelectedPartition(method.recommendPartition);
  };

  const selectImage = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "映像文件", extensions: ["img"] }],
      });
      if (selected) {
        setImagePath(selected as string);
        setError("");
      }
    } catch (e: any) {
      setError("文件选择失败: " + e);
    }
  };

  const pushImage = async () => {
    if (!imagePath) {
      setError("请先选择镜像文件");
      return;
    }
    setRunning(true);
    setError("");
    setLogs([]);
    try {
      await invoke("push_image", {
        localPath: imagePath,
        remoteDir: "/sdcard/Download",
      });
      setCurrentStep(2);
    } catch (e: any) {
      setError(e);
    } finally {
      setRunning(false);
    }
  };

  const installApk = async () => {
    setRunning(true);
    setError("");
    setLogs([]);
    try {
      await invoke("install_builtin_apk", { method: selectedMethod });
      setCurrentStep(3);
    } catch (e: any) {
      setError(e);
    } finally {
      setRunning(false);
    }
  };

  const pullImage = async () => {
    setRunning(true);
    setError("");
    setLogs([]);
    try {
      const path: string = await invoke("pull_latest_patched_image");
      setPatchedImagePath(path);
      setCurrentStep(4);
    } catch (e: any) {
      setError(e);
    } finally {
      setRunning(false);
    }
  };

  const startFlash = async () => {
    if (!patchedImagePath) {
      setError("未获取到修补镜像");
      return;
    }
    setRunning(true);
    setError("");
    setLogs([]);
    setProgress(0);
    setCurrentStep(5);
    try {
      await invoke("flash_root", {
        imagePath: patchedImagePath,
        partition: selectedPartition,
      });
    } catch (e: any) {
      setError(e);
    } finally {
      setRunning(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
      case 1:
        return (
          <Card className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4 text-[#1D1D1F] dark:text-white">
                选择 Root 方案
              </h2>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {methods.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleMethodChange(m.id)}
                    className={`p-4 rounded-xl border transition-all text-left ${selectedMethod === m.id ? "border-[#00C8FF] bg-[#00C8FF]/10 shadow-sm" : "border-black/10 dark:border-white/10 bg-white/40 dark:bg-white/5 hover:border-[#00C8FF]/40"}`}
                  >
                    <div className="text-2xl mb-1">{m.icon}</div>
                    <div className="font-semibold text-[#1D1D1F] dark:text-white">
                      {m.name}
                    </div>
                    <div className="text-xs text-[#6E6E73] dark:text-[#8B8B8B]">
                      {m.desc}
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4 text-sm mb-4">
                <span className="text-[#6E6E73] dark:text-[#B0B0B0]">
                  目标分区：
                </span>
                <label className="flex items-center gap-1 cursor-pointer text-[#1D1D1F] dark:text-white">
                  <input
                    type="radio"
                    value="boot"
                    checked={selectedPartition === "boot"}
                    onChange={() => setSelectedPartition("boot")}
                  />{" "}
                  boot
                </label>
                <label className="flex items-center gap-1 cursor-pointer text-[#1D1D1F] dark:text-white">
                  <input
                    type="radio"
                    value="init_boot"
                    checked={selectedPartition === "init_boot"}
                    onChange={() => setSelectedPartition("init_boot")}
                  />{" "}
                  init_boot
                </label>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-3 text-[#1D1D1F] dark:text-white">
                选择原始镜像文件
              </h2>
              <div className="border-2 border-dashed border-black/20 dark:border-white/10 rounded-xl p-6 text-center">
                <FiUpload className="mx-auto text-3xl text-[#6E6E73] dark:text-[#5A5A5A] mb-2" />
                <p className="text-sm text-[#6E6E73] dark:text-[#8B8B8B] mb-4">
                  选择需要修补的官方 boot.img 或 init_boot.img
                </p>
                <Button
                  variant="secondary"
                  icon={<FiFolder />}
                  onClick={selectImage}
                >
                  选择镜像
                </Button>
                {imagePath && (
                  <p className="mt-3 text-sm font-mono text-[#00C8FF] truncate">
                    已选择: {imagePath}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="primary"
              icon={<FiSmartphone />}
              onClick={pushImage}
              disabled={!imagePath || running}
              loading={running}
            >
              推送镜像到手机
            </Button>
          </Card>
        );
      case 2:
        return (
          <Card>
            <h2 className="text-lg font-semibold mb-4 text-[#1D1D1F] dark:text-white">
              安装修补工具
            </h2>
            <p className="text-sm text-[#6E6E73] dark:text-[#8B8B8B] mb-6">
              镜像已推送到手机，现在将{" "}
              {methods.find((m) => m.id === selectedMethod)?.name} APK
              安装到手机。
            </p>
            <Button
              variant="primary"
              icon={<FiSmartphone />}
              onClick={installApk}
              disabled={running}
              loading={running}
            >
              安装 APK 到手机
            </Button>
          </Card>
        );
      case 3:
        return (
          <Card>
            <h2 className="text-lg font-semibold mb-4 text-[#1D1D1F] dark:text-white">
              等待修补完成
            </h2>
            <p className="text-sm text-[#6E6E73] dark:text-[#8B8B8B] mb-6">
              APK 已安装，请在手机上打开应用并修补镜像。
            </p>
            <Button
              variant="primary"
              icon={<FiSmartphone />}
              onClick={pullImage}
              disabled={running}
              loading={running}
            >
              拉取修补镜像
            </Button>
          </Card>
        );
      case 4:
        return (
          <Card>
            <h2 className="text-lg font-semibold mb-4 text-[#1D1D1F] dark:text-white">
              准备刷入
            </h2>
            <p className="text-sm text-[#6E6E73] dark:text-[#8B8B8B] mb-2">
              修补镜像已拉取到：
            </p>
            <code className="block bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 p-2 rounded text-xs text-[#00C8FF] break-all mb-4">
              {patchedImagePath}
            </code>
            <div className="flex items-center gap-4 text-sm mb-4">
              <span className="text-[#6E6E73] dark:text-[#B0B0B0]">
                目标分区：
              </span>
              <label className="flex items-center gap-1 cursor-pointer text-[#1D1D1F] dark:text-white">
                <input
                  type="radio"
                  value="boot"
                  checked={selectedPartition === "boot"}
                  onChange={() => setSelectedPartition("boot")}
                />{" "}
                boot
              </label>
              <label className="flex items-center gap-1 cursor-pointer text-[#1D1D1F] dark:text-white">
                <input
                  type="radio"
                  value="init_boot"
                  checked={selectedPartition === "init_boot"}
                  onChange={() => setSelectedPartition("init_boot")}
                />{" "}
                init_boot
              </label>
            </div>
            <Button
              variant="primary"
              onClick={() => setShowConfirm(true)}
              disabled={running}
            >
              开始刷入
            </Button>
          </Card>
        );
      case 5:
        return (
          <Card>
            <h2 className="text-lg font-semibold mb-4 text-[#1D1D1F] dark:text-white">
              正在刷入...
            </h2>
            <ProgressBar value={progress} label="刷入进度" />
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 text-[#1D1D1F] dark:text-white">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <FiCpu className="text-[#00C8FF]" /> 一键 Root 刷入
      </h1>
      <div className="glass-card p-4 text-sm text-[#1D1D1F] dark:text-[#B0B0B0] flex items-start gap-2">
        <FiInfo className="mt-0.5 shrink-0 text-[#00C8FF]" />
        <div>
          <p className="font-semibold mb-1">使用说明</p>
          <p>
            1. 选择方案，选择原始镜像并推送到手机
            <br />
            2. 安装对应 APK
            <br />
            3. 在手机上修补
            <br />
            4. 拉取修补后的镜像
            <br />
            5. 确认分区后刷入
          </p>
        </div>
      </div>
      <div className="glass-card p-4 flex justify-between">
        {steps.map((step, idx) => (
          <div key={step.key} className="flex flex-col items-center flex-1">
            <motion.div
              animate={{ scale: idx === currentStep ? 1.2 : 1 }}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${idx < currentStep ? "bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30" : idx === currentStep ? "bg-[#00C8FF]/20 text-[#00C8FF] border border-[#00C8FF]/30" : "bg-black/5 dark:bg-white/5 text-[#6E6E73] dark:text-[#5A5A5A] border border-black/10 dark:border-white/10"}`}
            >
              {idx < currentStep ? "✓" : idx + 1}
            </motion.div>
            <span className="text-xs mt-1 text-[#6E6E73] dark:text-[#8B8B8B]">
              {step.label}
            </span>
          </div>
        ))}
      </div>
      {renderStep()}
      <Card>
        <h3 className="text-sm font-semibold text-[#6E6E73] dark:text-[#8B8B8B] mb-2">
          输出日志
        </h3>
        <div className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg p-3 h-48 overflow-y-auto font-mono text-xs text-[#1D1D1F] dark:text-[#B0B0B0]">
          {logs.length === 0 && (
            <span className="text-[#6E6E73] dark:text-[#5A5A5A]">暂无日志</span>
          )}
          {logs.map((line, i) => (
            <motion.p key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {line}
            </motion.p>
          ))}
          <div ref={logEndRef} />
        </div>
      </Card>
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 p-4 rounded-xl">
          <FiAlertTriangle className="inline mr-1" /> {error}
        </div>
      )}
      <Modal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="⚠️ 确认刷入"
      >
        <div className="space-y-3 text-sm text-[#1D1D1F] dark:text-[#B0B0B0]">
          <p>
            即将向{" "}
            <strong className="dark:text-white">{selectedPartition}</strong>{" "}
            分区刷入镜像。
          </p>
          <code className="block bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 p-2 rounded text-xs text-[#00C8FF] break-all">
            {patchedImagePath}
          </code>
          <p className="text-red-500 dark:text-red-400">
            请确保镜像已正确修补，否则可能无法开机。
          </p>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowConfirm(false)}>
            取消
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setShowConfirm(false);
              startFlash();
            }}
          >
            确认刷入
          </Button>
        </div>
      </Modal>
    </div>
  );
}
