import { useState } from "react";
import Modal from "./Modal";
import Button from "./Button";
import { FiFolder } from "react-icons/fi";
import { invoke } from "@tauri-apps/api/core";
import { useDynamicIsland } from "../../hooks/useDynamicIsland";

interface ToolAction {
  id: string;
  label: string;
  variant?: "primary" | "secondary" | "danger";
  command: string;
  params?: Record<string, any>;
  successMessage?: string;
  needFile?: boolean;
  fileExtensions?: string[];
  inputKey?: string;
  inputPlaceholder?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  actions: ToolAction[];
  needInput?: {
    label: string;
    key: string;
    placeholder?: string;
    type?: "text" | "select";
    options?: string[];
  };
}

export default function ToolModal({
  open,
  onClose,
  title,
  description,
  actions,
  needInput,
}: Props) {
  const [inputValue, setInputValue] = useState("");
  const [filePath, setFilePath] = useState("");
  const [running, setRunning] = useState<string | null>(null);
  const { setContent } = useDynamicIsland();

  const [selectValue, setSelectValue] = useState(needInput?.options?.[0] || "");

  const selectFile = async (action: ToolAction) => {
    try {
      const { open: openDialog } = await import("@tauri-apps/plugin-dialog");
      const selected = await openDialog({
        multiple: false,
        filters: [{ name: "文件", extensions: action.fileExtensions || ["*"] }],
      });
      if (selected) setFilePath(selected as string);
    } catch (_) {}
  };

  const execute = async (action: ToolAction) => {
    // 空命令 = 纯通知按钮（如“知道了”），直接关闭弹窗
    if (!action.command || action.command === "") {
      onClose();
      return;
    }

    const params: Record<string, any> = { ...action.params };

    if (needInput) {
      const value = needInput.type === "select" ? selectValue : inputValue;
      if (!value.trim()) return;
      params[needInput.key] = value;
    }

    if (action.inputKey && inputValue.trim()) {
      params[action.inputKey] = inputValue;
    }

    if (action.needFile) {
      if (!filePath) return;
      if (action.command === "adb_sideload") {
        params.zip_path = filePath;
      } else {
        params.image_path = filePath;
      }
    }

    setRunning(action.id);
    try {
      const result = await invoke(action.command, params);
      setContent({
        icon: "✅",
        title: action.successMessage || "操作成功",
        subtitle: typeof result === "string" ? result : "",
        type: "success",
      });
      setTimeout(() => useDynamicIsland.getState().clear(), 4000);
    } catch (e: any) {
      setContent({
        icon: "❌",
        title: "操作失败",
        subtitle: e,
        type: "error",
      });
    } finally {
      setRunning(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        {description && <p className="text-sm text-[#B0B0B0]">{description}</p>}

        {needInput && needInput.type === "select" && needInput.options && (
          <div>
            <label className="text-xs text-[#8B8B8B] block mb-1">
              {needInput.label}
            </label>
            <select
              value={selectValue}
              onChange={(e) => setSelectValue(e.target.value)}
              className="w-full bg-white dark:bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#00C8FF]/50"
            >
              {needInput.options.map((opt) => (
                <option
                  key={opt}
                  value={opt}
                  className="bg-gray-800 text-white"
                >
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        {needInput && (!needInput.type || needInput.type === "text") && (
          <div>
            <label className="text-xs text-[#8B8B8B] block mb-1">
              {needInput.label}
            </label>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={needInput.placeholder || ""}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-[#5A5A5A] focus:outline-none focus:ring-2 focus:ring-[#00C8FF]/50"
            />
          </div>
        )}

        {actions.some((a) => a.needFile) && (
          <div>
            <p className="text-xs text-[#8B8B8B] mb-1">选择文件</p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<FiFolder />}
                onClick={() => {
                  const fileAction = actions.find((a) => a.needFile);
                  if (fileAction) selectFile(fileAction);
                }}
              >
                {filePath ? "重新选择" : "选择文件"}
              </Button>
              {filePath && (
                <p className="text-xs text-[#00C8FF] truncate max-w-[200px]">
                  {filePath.split("\\").pop() || filePath}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant={action.variant || "primary"}
              size="sm"
              loading={running === action.id}
              disabled={!!running}
              onClick={() => execute(action)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
