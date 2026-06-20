import { useDeviceStore } from "../hooks/useDevice";
import {
  FiSmartphone,
  FiCpu,
  FiBatteryCharging,
  FiHardDrive,
  FiActivity,
  FiRefreshCw,
} from "react-icons/fi";
import Button from "../components/ui/Button";
import { invoke } from "@tauri-apps/api/core";
import type { DeviceInfo } from "../hooks/useDevice";

export default function DeviceDashboard() {
  const { device, updateDevice } = useDeviceStore();

  const manualDetect = async () => {
    try {
      const info: DeviceInfo = await invoke("detect_device");
      updateDevice(info);
    } catch (_) {}
  };

  if (!device) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-[#6E6E73] dark:text-[#5A5A5A]">
          <FiSmartphone size={48} className="mx-auto mb-4" />
          <p className="text-sm">未连接设备</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={manualDetect}
            icon={<FiRefreshCw />}
          >
            重新检测
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="glass-card p-6 flex gap-6 items-center">
        <div className="w-16 h-16 rounded-2xl bg-[#00C8FF]/10 flex items-center justify-center">
          <FiCpu size={32} className="text-[#00C8FF]" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-[#1D1D1F] dark:text-white">
            {device.model}
          </h2>
          <p className="text-[#6E6E73] dark:text-[#8B8B8B] text-sm">
            {device.serial} · {device.state}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={manualDetect}
          icon={<FiRefreshCw />}
        >
          刷新
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            icon: FiBatteryCharging,
            label: "电池",
            value: `${device.battery}%`,
          },
          { icon: FiActivity, label: "Android", value: device.android_version },
          { icon: FiHardDrive, label: "版本", value: device.build_number },
          {
            icon: FiSmartphone,
            label: "Root",
            value:
              device.root_status === "none" ? "未获取" : device.root_status,
          },
        ].map((btn, i) => (
          <div
            key={i}
            className="glass-card p-4 flex flex-col items-center justify-center text-center"
          >
            <btn.icon size={24} className="text-[#00C8FF] mb-2" />
            <span className="text-xs text-[#6E6E73] dark:text-[#8B8B8B]">
              {btn.label}
            </span>
            <span className="text-sm font-medium mt-1 text-[#1D1D1F] dark:text-white">
              {btn.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
