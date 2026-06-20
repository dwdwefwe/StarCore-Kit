import { useState, useEffect, useRef } from "react";
import ThemeProvider from "./components/theme/ThemeProvider";
import Sidebar from "./components/layout/Sidebar";
import DynamicIsland from "./components/layout/DynamicIsland";
import MainContent from "./components/layout/MainContent";
import LogPanel from "./components/layout/LogPanel";
import { useDeviceStore } from "./hooks/useDevice";
import type { DeviceInfo } from "./hooks/useDevice";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const { updateDevice, clearDevice } = useDeviceStore();
  const lastDeviceRef = useRef<{ serial: string; state: string }>({
    serial: "",
    state: "",
  });

  useEffect(() => {
    // 立刻开始静默轮询（第一次即为初始检测）
    const poll = async () => {
      try {
        const info: DeviceInfo = await invoke("poll_device", {
          lastSerial: lastDeviceRef.current.serial,
          lastState: lastDeviceRef.current.state,
        });
        updateDevice(info);
        lastDeviceRef.current = { serial: info.serial, state: info.state };
      } catch (e: any) {
        if (e === "no_change") return;
        // 设备断开或错误时清空状态
        clearDevice();
        lastDeviceRef.current = { serial: "", state: "" };
      }
    };

    poll(); // 立即执行一次
    const interval = setInterval(poll, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <ThemeProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-[#F5F5F7] dark:bg-[#0A0A0A] text-[#1D1D1F] dark:text-[#E6E6E6]">
        <Sidebar activePage={activePage} onNavigate={setActivePage} />
        <div className="flex flex-1 flex-col overflow-hidden bg-gradient-to-b from-[#F5F5F7] to-white dark:from-[#0A0A0A] dark:to-[#0D1421]">
          <DynamicIsland />
          <MainContent activePage={activePage} onNavigate={setActivePage} />
          <LogPanel />
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
