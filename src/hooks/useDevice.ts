import { create } from 'zustand';

export interface DeviceInfo {
  model: string;
  serial: string;
  state: string;
  battery: number;
  android_version: string;
  build_number: string;
  root_status: string;
  bootloader_locked: boolean;
}

interface DeviceStore {
  device: DeviceInfo | null;
  updateDevice: (d: DeviceInfo) => void;
  clearDevice: () => void;
}

export const useDeviceStore = create<DeviceStore>((set) => ({
  device: null,
  updateDevice: (d) => set({ device: d }),
  clearDevice: () => set({ device: null }),
}));