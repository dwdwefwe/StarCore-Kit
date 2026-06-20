import { useState } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import {
  FiSun,
  FiMoon,
  FiFolder,
  FiRefreshCw,
  FiShield,
  FiCheckCircle,
  FiXCircle,
  FiTool,
} from "react-icons/fi";
import { useTheme } from "../hooks/useTheme";
import { invoke } from "@tauri-apps/api/core";
import { motion } from "framer-motion";

interface ToolCheckResult {
  name: string;
  exists: boolean;
}

export default function SettingsPage() {
  const { theme, toggle } = useTheme();
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateMsg, setUpdateMsg] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verificationResults, setVerificationResults] = useState<
    ToolCheckResult[] | null
  >(null);

  const checkUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateMsg("");
    setTimeout(() => {
      setUpdateMsg("当前已是最新版本 v1.0.0");
      setCheckingUpdate(false);
    }, 1500);
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerificationResults(null);
    try {
      const results: ToolCheckResult[] = await invoke("verify_tools");
      setVerificationResults(results);
    } catch (e) {
      setVerificationResults([]);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-[#1D1D1F] dark:text-white">
        ⚙️ 设置
      </h1>
      <Card>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[#1D1D1F] dark:text-white">
          {theme === "dark" ? (
            <FiMoon className="text-[#00C8FF]" />
          ) : (
            <FiSun className="text-[#00C8FF]" />
          )}
          外观
        </h2>
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#6E6E73] dark:text-[#B0B0B0]">
            深色模式
          </span>
          <button
            onClick={toggle}
            className={`relative w-12 h-6 rounded-full transition-colors ${theme === "dark" ? "bg-[#00C8FF]" : "bg-black/20 dark:bg-white/10"}`}
          >
            <div
              className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${theme === "dark" ? "translate-x-6" : "translate-x-0.5"}`}
            />
          </button>
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[#1D1D1F] dark:text-white">
          <FiFolder className="text-[#00C8FF]" />
          工具路径
        </h2>
        <input
          type="text"
          readOnly
          value="resources/adb.exe (内置)"
          className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-[#1D1D1F] dark:text-[#B0B0B0] cursor-not-allowed"
        />
      </Card>
      <Card>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[#1D1D1F] dark:text-white">
          <FiRefreshCw className="text-[#00C8FF]" />
          更新检查
        </h2>
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#6E6E73] dark:text-[#B0B0B0]">
            当前版本 v1.0.0
          </span>
          <Button
            variant="secondary"
            size="sm"
            loading={checkingUpdate}
            onClick={checkUpdate}
          >
            检查更新
          </Button>
        </div>
        {updateMsg && (
          <div className="mt-3 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <FiCheckCircle /> {updateMsg}
          </div>
        )}
      </Card>
      <Card>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[#1D1D1F] dark:text-white">
          <FiShield className="text-[#00C8FF]" />
          安全
        </h2>
        <div className="space-y-4">
          {[
            {
              checked: true,
              title: "危险操作二次确认",
              desc: "执行刷入、分区修改前弹出确认窗口",
            },
            {
              checked: true,
              title: "自动备份提醒",
              desc: "修改关键分区前提醒备份数据",
            },
            {
              checked: false,
              title: "启用日志记录",
              desc: "将操作日志保存到本地文件",
            },
          ].map((opt, i) => (
            <label
              key={i}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <input
                type="checkbox"
                className="rounded w-4 h-4 accent-[#00C8FF]"
                defaultChecked={opt.checked}
              />
              <div>
                <p className="text-sm text-[#1D1D1F] dark:text-white group-hover:text-[#00C8FF] transition-colors">
                  {opt.title}
                </p>
                <p className="text-xs text-[#6E6E73] dark:text-[#8B8B8B]">
                  {opt.desc}
                </p>
              </div>
            </label>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[#1D1D1F] dark:text-white">
          <FiTool className="text-[#00C8FF]" />
          工具完整性
        </h2>
        <p className="text-sm text-[#6E6E73] dark:text-[#8B8B8B] mb-4">
          检查内置刷机工具和 APK 是否齐全。
        </p>
        <Button
          variant="secondary"
          onClick={handleVerify}
          disabled={verifying}
          loading={verifying}
        >
          {verifying ? "正在检测..." : "开始检测"}
        </Button>
        {verificationResults && !verifying && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 space-y-2"
          >
            {verificationResults.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                {item.exists ? (
                  <FiCheckCircle className="text-green-500" />
                ) : (
                  <FiXCircle className="text-red-500" />
                )}
                <span className="text-[#1D1D1F] dark:text-white">
                  {item.name}
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </Card>
    </div>
  );
}
