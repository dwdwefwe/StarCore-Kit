import { FiBatteryCharging, FiLink, FiWifiOff } from 'react-icons/fi';
import { useDeviceStore } from '../../hooks/useDevice';

export default function StatusBar() {
  const { device } = useDeviceStore();
  return (
    <div className="flex items-center justify-between px-6 py-2 border-b border-white/5 backdrop-blur-xl bg-[#0A0A0A]/40">
      <div className="flex items-center space-x-4 text-xs">
        {device ? (
          <>
            <FiLink size={12} className="text-green-400 animate-pulse" />
            <span className="font-medium">{device.model}</span>
            <span className="text-[#5A5A5A]">{device.serial}</span>
            <span className="text-[#00C8FF]">{device.state}</span>
          </>
        ) : (
          <div className="flex items-center gap-1.5 text-[#5A5A5A]">
            <FiWifiOff size={12} />
            <span>未连接设备 — 请连接手机并刷新</span>
          </div>
        )}
      </div>
      <div className="flex items-center space-x-4 text-xs">
        {device && (
          <>
            <span className="flex items-center gap-1">
              <FiBatteryCharging size={12} className="text-green-400" /> {device.battery}%
            </span>
            <span className="text-green-400">已连接</span>
          </>
        )}
      </div>
    </div>
  );
}