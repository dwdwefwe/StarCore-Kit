# 🚀 StarCore Kit - 星核刷机工具箱

<div align="center">
  <h3>极简 · 专业 · 全能的 Android 刷机救砖工具箱</h3>
  <p>
    <img src="https://img.shields.io/badge/Windows-10%2F11-blue?logo=windows" alt="Windows"/>
    <img src="https://img.shields.io/badge/version-1.0.0-00C8FF" alt="Version"/>
    <img src="https://img.shields.io/badge/license-MIT-green" alt="License"/>
  </p>
</div>

---

## ✨ 功能亮点

- **灵动岛交互**：实时设备状态、操作进度丝滑弹出
- **深色/明亮双主题**：一键切换，日夜皆宜
- **7 种 Root 方案**：Magisk、KernelSU、APatch、Resukisu、Sukisu Ultra、KernelSU Next、Folk Patch
- **9008 EDL 救砖**：图形化界面，选择文件即可救砖
- **Fastboot 批量救砖**：勾选分区，一键刷入全部镜像
- **高级命令终端**：支持历史记录、命令收藏、流式输出（如 `logcat`）
- **工具箱 16+ 工具**：分区备份/刷入、截图、APK 安装/卸载、Prop 编辑器、OEM 解锁等
- **工具完整性验证**：一键检查内置 ADB、Fastboot、EDL 及 Root APK 是否完好
- **实时设备检测**：插拔自动感知，无需手动刷新
- **丝滑动画 + 毛玻璃 UI**：Tauri + React + Tailwind 打造

---

## 📥 下载安装

### 方式一：便携版（推荐）

从 [Releases](https://github.com/dwdwefwe/StarCore-Kit/releases) 下载 `StarCoreKit_1.0.0_portable.zip`，解压后直接运行 `StarCore Kit.exe`。

### 方式二：安装包

下载 `.msi` 或 `.exe` 安装程序，双击安装。

> 国内用户可从蓝奏云 / 123 云盘下载（速度更快）：Soon

---

## 🛠️ 快速上手

1. **连接手机**：USB 连接并开启 USB 调试。
2. **检测设备**：工具箱启动后自动检测，灵动岛显示设备型号。
3. **一键 Root**：选择方案 → 推送镜像 → 安装 APK → 手机修补 → 拉取修补镜像 → 刷入。
4. **救砖**：
   - 9008 模式：选择 Firehose 文件、rawprogram、patch、镜像目录，一键刷写。
   - Fastboot 模式：选择镜像目录，勾选分区，批量刷写。
5. **高级命令**：直接输入 ADB/Fastboot 命令，支持历史记录和收藏。

完整教程见 [使用指南](https://github.com/dwdwefwe/StarCore-Kit/wiki)

---

## 🔧 内置工具

| 工具             | 说明                                     |
| ---------------- | ---------------------------------------- |
| `adb.exe`        | ADB 调试桥                               |
| `fastboot.exe`   | Fastboot 刷机工具                        |
| `edl.exe`        | Qualcomm EDL 命令行工具                  |
| `libusb-1.0.dll` | USB 驱动库（9008 需要）                  |
| APK 包           | Magisk、KernelSU、APatch 等 7 种方案 APK |

---

## 🏗️ 技术栈

- 前端：React + TypeScript + Tailwind CSS + Framer Motion
- 后端：Rust (Tauri 2.0)
- 工具链：Vite + Cargo

---

## 🤝 贡献与反馈

欢迎提交 Issue 或 Pull Request！  
联系邮箱：toxicfox1314@outlook.com

---

## 📄 开源协议

MIT License © 2025 StarCore
