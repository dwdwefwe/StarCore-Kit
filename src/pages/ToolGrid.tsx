import { useState } from "react";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import ToolModal from "../components/ui/ToolModal";
import { FiSearch } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useDynamicIsland } from "../hooks/useDynamicIsland";

const tools = [
  {
    id: "fastboot_rescue",
    category: "救砖",
    icon: "⚡",
    title: "Fastboot 救砖",
    desc: "批量刷写分区镜像救砖",
  },
  {
    id: "reboot_recovery",
    category: "重启",
    icon: "🔄",
    title: "重启到 Recovery",
    desc: "一键重启到 Recovery 模式",
  },
  {
    id: "reboot_fastboot",
    category: "重启",
    icon: "⚡",
    title: "重启到 Fastboot",
    desc: "一键重启到 Bootloader",
  },
  {
    id: "reboot_system",
    category: "重启",
    icon: "📱",
    title: "重启系统",
    desc: "正常重启设备",
  },
  {
    id: "screenshot",
    category: "辅助",
    icon: "📸",
    title: "截图",
    desc: "截取设备屏幕并保存到电脑",
  },
  {
    id: "list_partition",
    category: "分区",
    icon: "📋",
    title: "分区列表",
    desc: "查看设备分区表",
  },
  {
    id: "backup_partition",
    category: "分区",
    icon: "💾",
    title: "备份分区",
    desc: "备份指定分区到电脑",
  },
  {
    id: "install_apk",
    category: "应用",
    icon: "📲",
    title: "安装 APK",
    desc: "选择电脑上的 APK 并安装",
  },
  {
    id: "edl_rescue",
    category: "救砖",
    icon: "🔥",
    title: "9008 救砖",
    desc: "通过 9008 模式深度救砖",
  },
  {
    id: "flash",
    category: "刷写",
    icon: "⚡",
    title: "Fastboot 刷入",
    desc: "选择镜像并刷入指定分区",
  },
  {
    id: "sideload",
    category: "刷写",
    icon: "📦",
    title: "ADB Sideload",
    desc: "通过 Recovery 刷入 ZIP",
  },
  {
    id: "boot_temp",
    category: "刷写",
    icon: "🥾",
    title: "临时启动",
    desc: "Fastboot boot 临时启动镜像",
  },
  {
    id: "restore_partition",
    category: "分区",
    icon: "📥",
    title: "还原分区",
    desc: "将备份镜像刷回分区",
  },
  {
    id: "logcat",
    category: "辅助",
    icon: "📜",
    title: "Logcat 捕获",
    desc: "实时查看或导出日志",
  },
  {
    id: "shell",
    category: "辅助",
    icon: "💻",
    title: "Shell 终端",
    desc: "ADB Shell 命令行",
  },
  {
    id: "uninstall_pkg",
    category: "应用",
    icon: "🗑️",
    title: "卸载应用",
    desc: "卸载系统或用户应用",
  },
  {
    id: "prop_editor",
    category: "修改",
    icon: "✏️",
    title: "Prop 编辑器",
    desc: "查看/修改 build.prop",
  },
  {
    id: "oem_unlock",
    category: "解锁",
    icon: "🔓",
    title: "OEM 解锁",
    desc: "解锁 Bootloader 向导",
  },
];

const categories = [
  "全部",
  ...Array.from(new Set(tools.map((t) => t.category))),
];

interface Props {
  onNavigate: (page: string) => void;
}

export default function ToolGrid({ onNavigate }: Props) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("全部");
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const { setContent, clear } = useDynamicIsland();

  const filtered = tools.filter((t) => {
    const matchSearch = t.title.includes(search) || t.desc.includes(search);
    const matchCategory =
      selectedCategory === "全部" || t.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const partitionOptions = [
    "boot",
    "init_boot",
    "recovery",
    "system",
    "system_ext",
    "vendor",
    "vendor_boot",
    "product",
    "odm",
    "dtbo",
    "vbmeta",
    "vbmeta_system",
    "vbmeta_vendor",
    "userdata",
    "cache",
    "persist",
    "modem",
    "modemst1",
    "modemst2",
    "fsg",
    "fsc",
    "dsp",
    "devcfg",
    "abl",
    "xbl",
    "keymaster",
    "hyp",
    "tz",
    "rpm",
    "uefisecapp",
    "qupfw",
    "imagefv",
    "shrm",
    "cmnlib",
    "cmnlib64",
  ];

  const toolConfigs: Record<string, any> = {
    fastboot_rescue: {
      title: "Fastboot 救砖",
      description: "即将进入批量刷写页面。",
      actions: [{ id: "go", label: "进入", variant: "primary", command: "" }],
    },
    reboot_recovery: {
      title: "重启到 Recovery",
      description: "设备将立即重启进入 Recovery 模式，请保存当前工作。",
      actions: [
        {
          id: "reboot",
          label: "确认重启",
          variant: "primary",
          command: "reboot_recovery",
          successMessage: "设备正在重启到 Recovery",
        },
      ],
    },
    reboot_fastboot: {
      title: "重启到 Fastboot",
      description: "设备将重启进入 Fastboot 模式。",
      actions: [
        {
          id: "reboot",
          label: "确认重启",
          variant: "primary",
          command: "reboot_fastboot",
          successMessage: "设备正在重启到 Fastboot",
        },
      ],
    },
    reboot_system: {
      title: "重启系统",
      description: "设备将正常重启。",
      actions: [
        {
          id: "reboot",
          label: "确认重启",
          variant: "primary",
          command: "reboot_system",
          successMessage: "设备正在重启",
        },
      ],
    },
    screenshot: {
      title: "截图",
      description: "截图将保存到电脑的下载文件夹。",
      actions: [
        {
          id: "capture",
          label: "立即截图",
          variant: "primary",
          command: "screenshot",
          successMessage: "截图已保存",
        },
      ],
    },
    list_partition: {
      title: "分区列表",
      description: "获取设备分区表（需要已 root 或进入 recovery）。",
      actions: [
        {
          id: "list",
          label: "获取列表",
          variant: "primary",
          command: "list_partitions",
          successMessage: "分区列表已显示在日志中",
        },
      ],
    },
    backup_partition: {
      title: "备份分区",
      description: "选择要备份的分区，镜像将保存到下载文件夹。需要 root 权限。",
      needInput: {
        label: "选择分区",
        key: "partition",
        type: "select",
        options: partitionOptions,
      },
      actions: [
        {
          id: "backup",
          label: "开始备份",
          variant: "primary",
          command: "backup_partition",
          successMessage: "分区备份完成",
        },
      ],
    },
    flash: {
      title: "Fastboot 刷入",
      description: "选择镜像文件并刷入到指定分区（设备需在 Fastboot 模式）。",
      needInput: {
        label: "选择分区",
        key: "partition",
        type: "select",
        options: partitionOptions,
      },
      actions: [
        {
          id: "flash",
          label: "选择镜像并刷入",
          variant: "primary",
          command: "fastboot_flash",
          needFile: true,
          fileExtensions: ["img"],
          successMessage: "刷入成功",
        },
      ],
    },
    sideload: {
      title: "ADB Sideload",
      description:
        "通过 Recovery 模式刷入 ZIP 包（设备需进入 Recovery 的 Apply Update 模式）。",
      actions: [
        {
          id: "sideload",
          label: "选择 ZIP 并刷入",
          variant: "primary",
          command: "adb_sideload",
          needFile: true,
          fileExtensions: ["zip"],
          successMessage: "Sideload 完成",
        },
      ],
    },
    boot_temp: {
      title: "临时启动镜像",
      description: "使用 fastboot boot 临时启动一个镜像，不会刷入设备。",
      actions: [
        {
          id: "boot",
          label: "选择镜像并启动",
          variant: "primary",
          command: "fastboot_boot",
          needFile: true,
          fileExtensions: ["img"],
          successMessage: "临时启动成功",
        },
      ],
    },
    restore_partition: {
      title: "还原分区",
      description: "选择备份镜像并刷回指定分区。",
      needInput: {
        label: "选择分区",
        key: "partition",
        type: "select",
        options: partitionOptions,
      },
      actions: [
        {
          id: "restore",
          label: "选择镜像并还原",
          variant: "primary",
          command: "restore_partition",
          needFile: true,
          fileExtensions: ["img"],
          successMessage: "还原成功",
        },
      ],
    },
    logcat: {
      title: "Logcat 捕获",
      description: "实时输出设备日志（即将实现）",
      actions: [
        { id: "ok", label: "知道了", variant: "secondary", command: "" },
      ],
    },
    uninstall_pkg: {
      title: "卸载应用",
      description: "输入应用包名并卸载（如 com.example.app）。",
      needInput: {
        label: "应用包名",
        key: "package",
        placeholder: "com.example.app",
      },
      actions: [
        {
          id: "uninstall",
          label: "卸载",
          variant: "danger",
          command: "uninstall_package",
          successMessage: "卸载成功",
        },
      ],
    },
    prop_editor: {
      title: "Prop 编辑器",
      description: "查看 build.prop 内容，或添加新属性（需要 root）。",
      needInput: {
        label: "属性行",
        key: "line",
        placeholder: "例如：qemu.hw.mainkeys=0",
      },
      actions: [
        {
          id: "read",
          label: "读取 build.prop",
          variant: "secondary",
          command: "read_prop",
          successMessage: "build.prop 已读取",
        },
        {
          id: "write",
          label: "写入属性",
          variant: "primary",
          command: "write_prop",
          inputKey: "line",
          successMessage: "属性已写入",
        },
      ],
    },
    oem_unlock: {
      title: "OEM 解锁",
      description: "查看 OEM 解锁状态，并获取解锁指引。",
      actions: [
        {
          id: "status",
          label: "查看状态",
          variant: "secondary",
          command: "oem_unlock_status",
        },
        {
          id: "guide",
          label: "解锁指引",
          variant: "primary",
          command: "oem_unlock_command",
        },
      ],
    },
  };

  const openTool = async (toolId: string) => {
    if (toolId === "edl_rescue") {
      onNavigate("edl_rescue");
      return;
    }
    if (toolId === "fastboot_rescue") {
      onNavigate("fastboot_rescue");
      return;
    }
    if (toolId === "shell") {
      onNavigate("console");
      return;
    }
    if (toolId === "install_apk") {
      try {
        const selected = await open({
          multiple: false,
          filters: [{ name: "APK 文件", extensions: ["apk"] }],
        });
        if (selected) {
          await invoke("install_custom_apk", { apkPath: selected });
          setContent({ icon: "✅", title: "APK 安装成功", type: "success" });
          setTimeout(() => clear(), 4000);
        }
      } catch (e: any) {
        setContent({
          icon: "❌",
          title: "安装失败",
          subtitle: e,
          type: "error",
        });
      }
      return;
    }
    if (toolId === "edl_rescue") {
      onNavigate("edl_rescue");
      return;
    }
    if (toolId === "fastboot_rescue") {
      onNavigate("fastboot_rescue");
      return;
    }
    if (toolId === "shell") {
      onNavigate("console");
      return;
    }
    setActiveTool(toolId);
  };

  const getActiveToolConfig = () => {
    if (!activeTool) return null;
    if (toolConfigs[activeTool]) return toolConfigs[activeTool];
    return {
      title: tools.find((t) => t.id === activeTool)?.title || "未知工具",
      description: "该功能即将实现，敬请期待。",
      actions: [
        { id: "ok", label: "知道了", variant: "secondary", command: "" },
      ],
    };
  };
  const activeToolConfig = getActiveToolConfig();

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-[#1D1D1F] dark:text-white">
        🧰 工具箱
      </h1>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            icon={<FiSearch size={18} />}
            placeholder="搜索工具..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearch(e.target.value)
            }
            clearable
            onClear={() => setSearch("")}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all duration-200 ${
                selectedCategory === cat
                  ? "bg-[#00C8FF]/20 text-[#00C8FF] border border-[#00C8FF]/30"
                  : "bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[#6E6E73] dark:text-[#8B8B8B] hover:text-white dark:hover:text-white hover:border-black/20 dark:hover:border-white/20"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <motion.div
        layout
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
      >
        <AnimatePresence>
          {filtered.map((tool) => (
            <motion.div
              key={tool.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Card
                hoverable
                onClick={() => openTool(tool.id)}
                className="cursor-pointer h-full flex flex-col"
              >
                <div className="text-2xl mb-2">{tool.icon}</div>
                <h3 className="font-semibold text-sm text-[#1D1D1F] dark:text-white">
                  {tool.title}
                </h3>
                <p className="text-xs text-[#6E6E73] dark:text-[#8B8B8B] mt-1 line-clamp-2">
                  {tool.desc}
                </p>
                <span className="mt-auto pt-2 text-[10px] text-[#00C8FF] uppercase tracking-wide">
                  {tool.category}
                </span>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-[#6E6E73] dark:text-[#5A5A5A]">
          <FiSearch size={48} className="mx-auto mb-4 opacity-50" />
          <p>没有找到匹配的工具</p>
        </div>
      )}

      {activeTool && activeToolConfig && (
        <ToolModal
          open={!!activeTool}
          onClose={() => setActiveTool(null)}
          title={activeToolConfig.title}
          description={activeToolConfig.description}
          actions={activeToolConfig.actions}
          needInput={activeToolConfig.needInput}
        />
      )}
    </div>
  );
}
