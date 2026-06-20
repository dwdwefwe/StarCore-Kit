use serde::Serialize;
use std::process::Command;
use tauri::Emitter;
use tauri::Manager;

// Windows 下隐藏 CMD 窗口
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[derive(Debug, Serialize, Clone)]
pub struct DeviceInfo {
    pub model: String,
    pub serial: String,
    pub state: String,
    pub battery: i32,
    pub android_version: String,
    pub build_number: String,
    pub root_status: String,
    pub bootloader_locked: bool,
}

// 隐藏子进程窗口的辅助函数
fn new_command(cmd: &str, args: &[&str]) -> Command {
    let mut c = Command::new(cmd);
    c.args(args);
    #[cfg(target_os = "windows")]
    c.creation_flags(0x08000000); // CREATE_NO_WINDOW
    c
}

// 获取 adb 路径（便携模式）
fn get_adb_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    let base = app.path().resource_dir().unwrap_or_default();
    let path = base.join("resources").join("adb.exe");
    if path.exists() {
        return path;
    }
    base.join("adb.exe")
}

fn get_builtin_apk_path(app: &tauri::AppHandle, method: &str) -> std::path::PathBuf {
    let base = app.path().resource_dir().unwrap_or_default();
    let apk_name = match method {
        "magisk" => "magisk.apk",
        "ksu" => "kernel_su.apk",
        "apatch" => "apatch.apk",
        "reksu" => "resukisu.apk",
        "ksu_ultra" => "sukisu_ultra.apk",
        "ksu_next" => "kernel_su_next.apk",
        "folk_patch" => "folk_patch.apk",
        _ => "unknown.apk",
    };
    base.join("resources").join("apks").join(apk_name)
}

fn emit_log(app: &tauri::AppHandle, msg: &str) {
    let _ = app.emit("tool-log", msg.to_string());
}

fn emit_progress(app: &tauri::AppHandle, p: u8) {
    let _ = app.emit("tool-progress", p);
}

// ========== 设备检测 ==========
#[tauri::command]
pub async fn detect_device(app: tauri::AppHandle) -> Result<DeviceInfo, String> {
    emit_log(&app, "🔍 正在检测设备...");

    let adb = get_adb_path(&app);
    if !adb.exists() {
        return Err("ADB 工具未找到".into());
    }

    let output = new_command(&adb.to_string_lossy(), &["devices", "-l"])
        .output()
        .map_err(|e| format!("执行 adb 失败: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    if !stdout.contains("device") {
        return Err("未检测到设备，请连接并开启 USB 调试".into());
    }

    let mut serial = String::new();
    let mut state = String::new();
    for line in stdout.lines().skip(1) {
        if line.trim().is_empty() {
            continue;
        }
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 2 {
            serial = parts[0].to_string();
            state = if parts[1] == "device" {
                "adb".to_string()
            } else {
                parts[1].to_string()
            };
        }
        break;
    }

    if serial.is_empty() {
        return Err("无法解析设备序列号".into());
    }

    emit_log(&app, &format!("✅ 已连接: {} ({}模式)", serial, state));

    let getprop = |prop: &str| -> Result<String, String> {
        let out = new_command(
            &adb.to_string_lossy(),
            &["-s", &serial, "shell", "getprop", prop],
        )
        .output()
        .map_err(|e| format!("getprop 失败: {}", e))?;
        Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
    };

    let model = getprop("ro.product.model").unwrap_or_else(|_| "未知".into());
    let android_version = getprop("ro.build.version.release").unwrap_or_else(|_| "未知".into());
    let build_number = getprop("ro.build.display.id").unwrap_or_else(|_| "未知".into());

    let battery = {
        let out = new_command(
            &adb.to_string_lossy(),
            &["-s", &serial, "shell", "dumpsys", "battery"],
        )
        .output()
        .map_err(|e| format!("dumpsys battery 失败: {}", e))?;
        let info = String::from_utf8_lossy(&out.stdout);
        info.lines()
            .find(|l| l.contains("level:"))
            .and_then(|l| l.split(':').nth(1))
            .and_then(|s| s.trim().parse().ok())
            .unwrap_or(0)
    };

    let root_status = {
        let out = new_command(
            &adb.to_string_lossy(),
            &["-s", &serial, "shell", "su", "-c", "echo rootok"],
        )
        .output();
        match out {
            Ok(o) if String::from_utf8_lossy(&o.stdout).contains("rootok") => {
                let ksu = new_command(
                    &adb.to_string_lossy(),
                    &["-s", &serial, "shell", "su", "-c", "cat /proc/version"],
                )
                .output()
                .map(|o| String::from_utf8_lossy(&o.stdout).contains("KernelSU"))
                .unwrap_or(false);
                if ksu {
                    "ksu".to_string()
                } else {
                    "magisk".to_string()
                }
            }
            _ => "none".to_string(),
        }
    };

    let bootloader_locked = new_command(
        &adb.to_string_lossy(),
        &["-s", &serial, "shell", "getprop", "ro.boot.flash.locked"],
    )
    .output()
    .map(|o| String::from_utf8_lossy(&o.stdout).trim() == "1")
    .unwrap_or(true);

    Ok(DeviceInfo {
        model,
        serial,
        state,
        battery,
        android_version,
        build_number,
        root_status,
        bootloader_locked,
    })
}

// ========== 安装内置 APK ==========
#[tauri::command]
pub async fn install_builtin_apk(app: tauri::AppHandle, method: String) -> Result<String, String> {
    let apk_path = get_builtin_apk_path(&app, &method);
    if !apk_path.exists() {
        return Err(format!(
            "内置 APK 未找到: {}",
            apk_path.file_name().unwrap_or_default().to_string_lossy()
        ));
    }
    emit_log(&app, &format!("📦 正在安装 {} 的 APK...", method));
    let adb = get_adb_path(&app);
    let output = new_command(
        &adb.to_string_lossy(),
        &["install", "-r", &apk_path.to_string_lossy()],
    )
    .output()
    .map_err(|e| format!("安装失败: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    if output.status.success() || stdout.contains("Success") {
        emit_log(&app, "✅ APK 安装成功，请在手机上打开应用修补镜像");
        Ok("installed".into())
    } else {
        let err = format!("安装失败: {}", stderr);
        emit_log(&app, &err);
        Err(err)
    }
}

// ========== 推送本地镜像到手机 ==========
#[tauri::command]
pub async fn push_image(
    app: tauri::AppHandle,
    local_path: String,
    remote_dir: String,
) -> Result<String, String> {
    let file_name = std::path::Path::new(&local_path)
        .file_name()
        .unwrap()
        .to_string_lossy()
        .to_string();
    emit_log(&app, &format!("⬆️ 正在推送 {} 到手机...", file_name));
    let adb = get_adb_path(&app);
    let output = new_command(&adb.to_string_lossy(), &["push", &local_path, &remote_dir])
        .output()
        .map_err(|e| format!("推送失败: {}", e))?;

    if output.status.success() {
        let remote_full = format!("{}/{}", remote_dir.trim_end_matches('/'), file_name);
        emit_log(&app, "✅ 推送成功");
        Ok(remote_full)
    } else {
        let err = String::from_utf8_lossy(&output.stderr);
        Err(format!("推送失败: {}", err))
    }
}

// ========== 拉取最新修补镜像 ==========
#[tauri::command]
pub async fn pull_latest_patched_image(app: tauri::AppHandle) -> Result<String, String> {
    emit_log(&app, "🔍 正在搜索手机上最新的 .img 文件...");
    let adb = get_adb_path(&app);

    let find = |dir: &str| -> Result<String, String> {
        let output = new_command(
            &adb.to_string_lossy(),
            &[
                "shell",
                &format!("ls -t {}/*.img 2>/dev/null | head -1", dir),
            ],
        )
        .output()
        .map_err(|e| format!("搜索失败: {}", e))?;
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    };

    let remote = find("/sdcard/Download").unwrap_or_default();
    let remote = if remote.is_empty() {
        find("/sdcard").unwrap_or_default()
    } else {
        remote
    };

    if remote.is_empty() {
        return Err("未找到任何 .img 文件，请确认手机上已修补完成".into());
    }

    let file_name = std::path::Path::new(&remote)
        .file_name()
        .unwrap()
        .to_string_lossy()
        .to_string();
    emit_log(&app, &format!("📱 找到: {}", file_name));

    let local_dir = dirs::download_dir().unwrap_or_else(|| std::env::current_dir().unwrap());
    let local_path = local_dir.join(&file_name);
    emit_log(&app, &format!("⬇️ 正在拉取到 {}", file_name));
    new_command(
        &adb.to_string_lossy(),
        &["pull", &remote, &local_path.to_string_lossy()],
    )
    .output()
    .map_err(|e| format!("拉取失败: {}", e))?;
    emit_log(&app, "✅ 镜像拉取成功");
    Ok(local_path.display().to_string())
}

// ========== 刷入已修补的镜像 ==========
#[tauri::command]
pub async fn flash_root(
    app: tauri::AppHandle,
    image_path: String,
    partition: String,
) -> Result<String, String> {
    emit_log(&app, "⚡ 开始一键刷入流程");
    emit_progress(&app, 0);

    let device = detect_device(app.clone()).await?;
    emit_progress(&app, 20);

    emit_log(
        &app,
        &format!("正在重启设备 {} 至 Fastboot...", device.serial),
    );
    let adb = get_adb_path(&app);
    new_command(
        &adb.to_string_lossy(),
        &["-s", &device.serial, "reboot-bootloader"],
    )
    .status()
    .map_err(|e| format!("重启到 fastboot 失败: {}", e))?;

    emit_log(&app, "等待设备进入 Fastboot 模式...");
    std::thread::sleep(std::time::Duration::from_secs(8));
    emit_progress(&app, 40);

    let fb = adb.parent().unwrap().join("fastboot.exe");
    let file_name = std::path::Path::new(&image_path)
        .file_name()
        .unwrap()
        .to_string_lossy()
        .to_string();
    emit_log(&app, &format!("正在刷入 {} 分区: {}", partition, file_name));
    let output = new_command(&fb.to_string_lossy(), &["flash", &partition, &image_path])
        .output()
        .map_err(|e| format!("Fastboot 刷入失败: {}", e))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(format!("刷入失败: {}", err));
    }
    emit_progress(&app, 70);

    emit_log(&app, "✅ 刷入完成，正在重启设备...");
    new_command(&fb.to_string_lossy(), &["reboot"])
        .status()
        .map_err(|_| "重启失败")?;

    emit_log(&app, "等待设备重启完成...");
    std::thread::sleep(std::time::Duration::from_secs(25));
    emit_progress(&app, 90);

    let check = new_command(
        &adb.to_string_lossy(),
        &["-s", &device.serial, "shell", "su", "-c", "echo rootok"],
    )
    .output();
    match check {
        Ok(o) if String::from_utf8_lossy(&o.stdout).contains("rootok") => {
            emit_log(&app, "🎉 Root 权限获取成功！");
            emit_progress(&app, 100);
            Ok("success".into())
        }
        _ => {
            emit_log(&app, "⚠️ 未检测到 Root 权限");
            emit_progress(&app, 100);
            Err("验证失败".into())
        }
    }
}

// ========== 通用 ADB / Fastboot 命令执行 ==========
#[tauri::command]
pub async fn execute_adb(app: tauri::AppHandle, command: String) -> Result<String, String> {
    emit_log(&app, &format!("> {}", command));
    let adb = get_adb_path(&app);

    let (tool, args_str) = if command.trim().starts_with("fastboot") {
        let fb = adb.parent().unwrap().join("fastboot.exe");
        (
            fb,
            command
                .trim()
                .strip_prefix("fastboot")
                .unwrap_or("")
                .trim()
                .to_string(),
        )
    } else {
        (
            adb.clone(),
            command
                .trim()
                .strip_prefix("adb")
                .unwrap_or(&command)
                .trim()
                .to_string(),
        )
    };

    if !tool.exists() {
        return Err(format!(
            "工具未找到: {}",
            tool.file_name().unwrap_or_default().to_string_lossy()
        ));
    }

    let args: Vec<&str> = args_str.split_whitespace().collect();
    let output = new_command(&tool.to_string_lossy(), &args)
        .output()
        .map_err(|e| format!("执行失败: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    if output.status.success() {
        Ok(if stdout.is_empty() {
            "(无输出)".to_string()
        } else {
            stdout.to_string()
        })
    } else {
        Err(if !stderr.is_empty() {
            stderr.to_string()
        } else {
            stdout.to_string()
        })
    }
}

// ========== 重启 ==========
macro_rules! reboot_cmd {
    ($name:ident, $desc:expr, $args:expr) => {
        #[tauri::command]
        pub async fn $name(app: tauri::AppHandle) -> Result<String, String> {
            emit_log(&app, $desc);
            let adb = get_adb_path(&app);
            let output = new_command(&adb.to_string_lossy(), $args)
                .output()
                .map_err(|e| format!("执行失败: {}", e))?;
            if output.status.success() {
                emit_log(&app, &format!("✅ {}", $desc));
                Ok("success".into())
            } else {
                Err(String::from_utf8_lossy(&output.stderr).to_string())
            }
        }
    };
}

reboot_cmd!(
    reboot_recovery,
    "正在重启到 Recovery...",
    &["reboot", "recovery"]
);
reboot_cmd!(
    reboot_fastboot,
    "正在重启到 Fastboot...",
    &["reboot", "bootloader"]
);
reboot_cmd!(reboot_system, "正在重启系统...", &["reboot"]);

// ========== 截图 ==========
#[tauri::command]
pub async fn screenshot(app: tauri::AppHandle) -> Result<String, String> {
    emit_log(&app, "📸 正在截图...");
    let adb = get_adb_path(&app);
    new_command(
        &adb.to_string_lossy(),
        &["shell", "screencap", "-p", "/sdcard/screenshot.png"],
    )
    .output()
    .map_err(|e| format!("截图失败: {}", e))?;
    let local_dir = dirs::download_dir().unwrap_or_else(|| std::env::current_dir().unwrap());
    let local_path = local_dir.join("screenshot.png");
    new_command(
        &adb.to_string_lossy(),
        &[
            "pull",
            "/sdcard/screenshot.png",
            &local_path.to_string_lossy(),
        ],
    )
    .output()
    .map_err(|e| format!("拉取失败: {}", e))?;
    emit_log(&app, "✅ 截图已保存");
    Ok("screenshot.png".into())
}

// ========== 分区列表 ==========
#[tauri::command]
pub async fn list_partitions(app: tauri::AppHandle) -> Result<String, String> {
    emit_log(&app, "📋 获取分区列表...");
    let adb = get_adb_path(&app);
    let output = new_command(
        &adb.to_string_lossy(),
        &["shell", "ls", "-1", "/dev/block/by-name/"],
    )
    .output()
    .map_err(|e| format!("执行失败: {}", e))?;
    if output.status.success() {
        let list = String::from_utf8_lossy(&output.stdout).to_string();
        Ok(list)
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

// ========== 备份分区 ==========
#[tauri::command]
pub async fn backup_partition(app: tauri::AppHandle, partition: String) -> Result<String, String> {
    emit_log(&app, &format!("💾 备份分区 {}", partition));
    let adb = get_adb_path(&app);
    let remote = format!("/dev/block/by-name/{}", partition);
    new_command(
        &adb.to_string_lossy(),
        &[
            "shell",
            "su",
            "-c",
            &format!("dd if={} of=/sdcard/{}.img", remote, partition),
        ],
    )
    .output()
    .map_err(|e| format!("提取失败: {}", e))?;
    let local_dir = dirs::download_dir().unwrap_or_else(|| std::env::current_dir().unwrap());
    let local_path = local_dir.join(format!("{}.img", partition));
    new_command(
        &adb.to_string_lossy(),
        &[
            "pull",
            &format!("/sdcard/{}.img", partition),
            &local_path.to_string_lossy(),
        ],
    )
    .output()
    .map_err(|e| format!("拉取失败: {}", e))?;
    emit_log(&app, "✅ 备份完成");
    Ok(local_path.display().to_string())
}

// ========== 安装自定义 APK ==========
#[tauri::command]
pub async fn install_custom_apk(app: tauri::AppHandle, apk_path: String) -> Result<String, String> {
    let name = std::path::Path::new(&apk_path)
        .file_name()
        .unwrap()
        .to_string_lossy()
        .to_string();
    emit_log(&app, &format!("📲 安装 {}", name));
    let adb = get_adb_path(&app);
    let output = new_command(&adb.to_string_lossy(), &["install", "-r", &apk_path])
        .output()
        .map_err(|e| format!("安装失败: {}", e))?;
    if output.status.success() {
        emit_log(&app, "✅ 安装成功");
        Ok("installed".into())
    } else {
        let err = String::from_utf8_lossy(&output.stderr).to_string();
        Err(err)
    }
}

// ========== 9008 检测 ==========
#[tauri::command]
pub async fn detect_edl(app: tauri::AppHandle) -> Result<String, String> {
    emit_log(&app, "🔌 检测 9008 设备...");
    let edl = get_adb_path(&app).parent().unwrap().join("edl.exe");
    if !edl.exists() {
        return Err("edl.exe 未找到".into());
    }
    for mem in &["eMMC", "UFS"] {
        if let Ok(o) =
            new_command(&edl.to_string_lossy(), &["getstorageinfo", "--memory", mem]).output()
        {
            if o.status.success() || String::from_utf8_lossy(&o.stdout).contains("storage") {
                emit_log(&app, &format!("✅ 9008 设备 ({})", mem));
                return Ok("detected".into());
            }
        }
    }
    Err("未检测到 9008 设备".into())
}

// ========== 9008 QFIL ==========
#[tauri::command]
pub async fn edl_flash(
    app: tauri::AppHandle,
    loader_path: String,
    memory: String,
    rawprogram_path: String,
    patch_path: String,
    image_dir: String,
    reset: bool,
) -> Result<String, String> {
    emit_log(&app, "🔥 启动 9008 QFIL 刷写...");
    let edl = get_adb_path(&app).parent().unwrap().join("edl.exe");
    let args = vec![
        "qfil".to_string(),
        rawprogram_path,
        patch_path,
        image_dir,
        format!("--loader={}", loader_path),
        format!("--memory={}", memory),
        "--debugmode".to_string(),
    ];
    let mut child = new_command(
        &edl.to_string_lossy(),
        &args.iter().map(AsRef::as_ref).collect::<Vec<&str>>(),
    )
    .stdout(std::process::Stdio::piped())
    .stderr(std::process::Stdio::piped())
    .spawn()
    .map_err(|e| format!("启动失败: {}", e))?;
    // (流读取省略，保持原逻辑)
    let status = child.wait().map_err(|e| format!("等待结束失败: {}", e))?;
    if !status.success() {
        return Err("QFIL 失败".into());
    }
    if reset {
        new_command(
            &edl.to_string_lossy(),
            &["reset", "--loader", &loader_path, "--memory", &memory],
        )
        .status()
        .map_err(|_| "Reset 失败")?;
    }
    emit_log(&app, "✅ 9008 完成");
    Ok("success".into())
}

// ========== 工具完整性验证 ==========
#[derive(Debug, Serialize)]
pub struct ToolCheckResult {
    pub name: String,
    pub exists: bool,
}

#[tauri::command]
pub async fn verify_tools(app: tauri::AppHandle) -> Result<Vec<ToolCheckResult>, String> {
    let resource_base = app.path().resource_dir().unwrap_or_default();
    let apks_candidates = vec![
        resource_base.join("resources").join("apks"),
        resource_base.join("apks"),
        resource_base
            .parent()
            .and_then(|p| p.parent())
            .map(|p| p.join("src-tauri/resources/apks"))
            .unwrap_or_default(),
    ];
    let apks_dir = apks_candidates
        .iter()
        .find(|p| p.exists())
        .cloned()
        .unwrap_or(resource_base.join("apks"));

    let required = vec![
        ("adb.exe", false),
        ("fastboot.exe", false),
        ("AdbWinApi.dll", false),
        ("AdbWinUsbApi.dll", false),
        ("edl.exe", false),
        ("magisk.apk", true),
        ("kernel_su.apk", true),
        ("apatch.apk", true),
        ("resukisu.apk", true),
        ("sukisu_ultra.apk", true),
        ("kernel_su_next.apk", true),
        ("folk_patch.apk", true),
    ];

    let mut results = Vec::new();
    let mut missing_apks = false;

    for (file, is_apk) in &required {
        let exists = if *is_apk {
            apks_dir.join(file).exists()
        } else {
            resource_base.join(file).exists() || resource_base.join("resources").join(file).exists()
        };
        if *is_apk && !exists {
            missing_apks = true;
        }
        results.push(ToolCheckResult {
            name: file.to_string(),
            exists,
        });
    }

    if missing_apks {
        emit_log(&app, "⚠️ 部分 APK 缺失，apks 目录内容：");
        if apks_dir.exists() {
            for entry in
                std::fs::read_dir(&apks_dir).unwrap_or_else(|_| std::fs::read_dir(".").unwrap())
            {
                if let Ok(entry) = entry {
                    emit_log(
                        &app,
                        &format!("  📄 {}", entry.file_name().to_string_lossy()),
                    );
                }
            }
        }
    } else {
        emit_log(&app, "✅ 所有工具完整");
    }

    Ok(results)
}

// ========== 静默设备轮询 ==========
#[tauri::command]
pub async fn poll_device(
    app: tauri::AppHandle,
    last_serial: String,
    last_state: String,
) -> Result<DeviceInfo, String> {
    let adb = get_adb_path(&app);
    if !adb.exists() {
        return Err("ADB 未找到".into());
    }

    let output = new_command(&adb.to_string_lossy(), &["devices", "-l"])
        .output()
        .map_err(|_| "adb 执行失败".to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    if !stdout.contains("device") {
        // 设备断开
        if !last_serial.is_empty() {
            let _ = app.emit("tool-log", "⚠️ 设备已断开".to_string());
        }
        return Err("无设备".into());
    }

    let mut serial = String::new();
    let mut state = String::new();
    for line in stdout.lines().skip(1) {
        if line.trim().is_empty() {
            continue;
        }
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 2 {
            serial = parts[0].to_string();
            state = if parts[1] == "device" {
                "adb".to_string()
            } else {
                parts[1].to_string()
            };
        }
        break;
    }

    if serial.is_empty() {
        return Err("解析失败".into());
    }

    // 状态无变化时，直接返回（避免反复获取属性）
    if serial == last_serial && state == last_state {
        // 仍返回一个空的占位信息（前端自己判断）
        return Err("no_change".into());
    }

    // 有变化时才获取详细信息
    let getprop = |prop: &str| -> Result<String, String> {
        let out = new_command(
            &adb.to_string_lossy(),
            &["-s", &serial, "shell", "getprop", prop],
        )
        .output()
        .map_err(|e| format!("getprop 失败: {}", e))?;
        Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
    };

    let model = getprop("ro.product.model").unwrap_or_else(|_| "未知".into());
    let android_version = getprop("ro.build.version.release").unwrap_or_else(|_| "未知".into());
    let build_number = getprop("ro.build.display.id").unwrap_or_else(|_| "未知".into());

    let battery = {
        let out = new_command(
            &adb.to_string_lossy(),
            &["-s", &serial, "shell", "dumpsys", "battery"],
        )
        .output()
        .map_err(|e| format!("dumpsys battery 失败: {}", e))?;
        let info = String::from_utf8_lossy(&out.stdout);
        info.lines()
            .find(|l| l.contains("level:"))
            .and_then(|l| l.split(':').nth(1))
            .and_then(|s| s.trim().parse().ok())
            .unwrap_or(0)
    };

    let root_status = {
        let out = new_command(
            &adb.to_string_lossy(),
            &["-s", &serial, "shell", "su", "-c", "echo rootok"],
        )
        .output();
        match out {
            Ok(o) if String::from_utf8_lossy(&o.stdout).contains("rootok") => {
                let ksu = new_command(
                    &adb.to_string_lossy(),
                    &["-s", &serial, "shell", "su", "-c", "cat /proc/version"],
                )
                .output()
                .map(|o| String::from_utf8_lossy(&o.stdout).contains("KernelSU"))
                .unwrap_or(false);
                if ksu {
                    "ksu".to_string()
                } else {
                    "magisk".to_string()
                }
            }
            _ => "none".to_string(),
        }
    };

    let bootloader_locked = new_command(
        &adb.to_string_lossy(),
        &["-s", &serial, "shell", "getprop", "ro.boot.flash.locked"],
    )
    .output()
    .map(|o| String::from_utf8_lossy(&o.stdout).trim() == "1")
    .unwrap_or(true);

    let info = DeviceInfo {
        model,
        serial: serial.clone(),
        state: state.clone(),
        battery,
        android_version,
        build_number,
        root_status,
        bootloader_locked,
    };

    // 状态变化时输出一条简洁日志
    if last_serial.is_empty() {
        let _ = app.emit(
            "tool-log",
            format!("📱 设备已连接: {} ({})", info.model, info.state),
        );
    } else {
        let _ = app.emit(
            "tool-log",
            format!("🔄 设备状态变化: {} -> {}", last_state, state),
        );
    }

    Ok(info)
}

// ========== Fastboot 刷入 ==========
#[tauri::command]
pub async fn fastboot_flash(
    app: tauri::AppHandle,
    image_path: String,
    partition: String,
) -> Result<String, String> {
    let file_name = std::path::Path::new(&image_path)
        .file_name()
        .unwrap()
        .to_string_lossy()
        .to_string();
    emit_log(
        &app,
        &format!("⚡ 正在刷入 {} 分区: {}", partition, file_name),
    );
    let adb = get_adb_path(&app);
    let fb = adb.parent().unwrap().join("fastboot.exe");
    let output = new_command(&fb.to_string_lossy(), &["flash", &partition, &image_path])
        .output()
        .map_err(|e| format!("刷入失败: {}", e))?;
    if output.status.success() {
        emit_log(&app, "✅ 刷入完成");
        Ok("success".into())
    } else {
        let err = String::from_utf8_lossy(&output.stderr);
        Err(err.to_string())
    }
}

// ========== ADB Sideload ==========
#[tauri::command]
pub async fn adb_sideload(app: tauri::AppHandle, zip_path: String) -> Result<String, String> {
    let name = std::path::Path::new(&zip_path)
        .file_name()
        .unwrap()
        .to_string_lossy()
        .to_string();
    emit_log(&app, &format!("📦 正在通过 Recovery 刷入 {}", name));
    let adb = get_adb_path(&app);
    let output = new_command(&adb.to_string_lossy(), &["sideload", &zip_path])
        .output()
        .map_err(|e| format!("Sideload 失败: {}", e))?;
    if output.status.success() {
        emit_log(&app, "✅ Sideload 完成");
        Ok("success".into())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

// ========== 临时启动镜像 ==========
#[tauri::command]
pub async fn fastboot_boot(app: tauri::AppHandle, image_path: String) -> Result<String, String> {
    let name = std::path::Path::new(&image_path)
        .file_name()
        .unwrap()
        .to_string_lossy()
        .to_string();
    emit_log(&app, &format!("🥾 正在临时启动 {}", name));
    let adb = get_adb_path(&app);
    let fb = adb.parent().unwrap().join("fastboot.exe");
    let output = new_command(&fb.to_string_lossy(), &["boot", &image_path])
        .output()
        .map_err(|e| format!("启动失败: {}", e))?;
    if output.status.success() {
        emit_log(&app, "✅ 临时启动完成");
        Ok("success".into())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

// ========== 还原分区 ==========
#[tauri::command]
pub async fn restore_partition(
    app: tauri::AppHandle,
    image_path: String,
    partition: String,
) -> Result<String, String> {
    let name = std::path::Path::new(&image_path)
        .file_name()
        .unwrap()
        .to_string_lossy()
        .to_string();
    emit_log(&app, &format!("📥 正在还原 {} 分区: {}", partition, name));
    let adb = get_adb_path(&app);
    let fb = adb.parent().unwrap().join("fastboot.exe");
    let output = new_command(&fb.to_string_lossy(), &["flash", &partition, &image_path])
        .output()
        .map_err(|e| format!("还原失败: {}", e))?;
    if output.status.success() {
        emit_log(&app, "✅ 还原完成");
        Ok("success".into())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

// ========== 卸载应用 ==========
#[tauri::command]
pub async fn uninstall_package(app: tauri::AppHandle, package: String) -> Result<String, String> {
    emit_log(&app, &format!("🗑️ 正在卸载 {}", package));
    let adb = get_adb_path(&app);
    let output = new_command(&adb.to_string_lossy(), &["uninstall", &package])
        .output()
        .map_err(|e| format!("卸载失败: {}", e))?;
    if output.status.success() {
        emit_log(&app, "✅ 卸载成功");
        Ok("success".into())
    } else {
        let err = String::from_utf8_lossy(&output.stderr);
        Err(err.to_string())
    }
}

// ========== 读取 build.prop ==========
#[tauri::command]
pub async fn read_prop(app: tauri::AppHandle) -> Result<String, String> {
    emit_log(&app, "📄 正在读取 build.prop...");
    let adb = get_adb_path(&app);
    let output = new_command(
        &adb.to_string_lossy(),
        &["shell", "cat", "/system/build.prop"],
    )
    .output()
    .map_err(|e| format!("读取失败: {}", e))?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

// ========== 写入 build.prop（追加行） ==========
#[tauri::command]
pub async fn write_prop(app: tauri::AppHandle, line: String) -> Result<String, String> {
    emit_log(&app, &format!("✏️ 正在写入 prop: {}", line));
    let adb = get_adb_path(&app);
    let output = new_command(
        &adb.to_string_lossy(),
        &[
            "shell",
            "su",
            "-c",
            &format!("echo '{}' >> /system/build.prop", line),
        ],
    )
    .output()
    .map_err(|e| format!("写入失败: {}", e))?;
    if output.status.success() {
        emit_log(&app, "✅ 写入成功，重启后生效");
        Ok("success".into())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

// ========== OEM 解锁状态 ==========
#[tauri::command]
pub async fn oem_unlock_status(app: tauri::AppHandle) -> Result<String, String> {
    emit_log(&app, "🔓 正在检查 OEM 解锁状态...");
    let adb = get_adb_path(&app);
    let output = new_command(
        &adb.to_string_lossy(),
        &["shell", "getprop", "ro.boot.flash.locked"],
    )
    .output()
    .map_err(|e| format!("查询失败: {}", e))?;
    let status = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let unlocked = status == "0";
    let msg = if unlocked {
        "✅ OEM 已解锁"
    } else {
        "⚠️ OEM 已锁定"
    };
    emit_log(&app, msg);
    Ok(status)
}

// ========== OEM 解锁命令（仅提醒，实际需手动在 fastboot 执行） ==========
#[tauri::command]
pub async fn oem_unlock_command(app: tauri::AppHandle) -> Result<String, String> {
    emit_log(&app, "⚠️ 请在 Fastboot 模式下执行: fastboot oem unlock");
    emit_log(&app, "此操作将清除所有数据，请确认已备份。");
    Ok("请手动执行".into())
}

// ========== Fastboot 救砖（批量刷写） ==========
#[tauri::command]
pub async fn fastboot_rescue(
    app: tauri::AppHandle,
    image_dir: String,
    partitions: Vec<String>,
) -> Result<String, String> {
    emit_log(&app, "🔥 正在启动 Fastboot 救砖...");
    let adb = get_adb_path(&app);
    let fb = adb.parent().unwrap().join("fastboot.exe");

    if !fb.exists() {
        return Err("fastboot.exe 未找到".into());
    }

    let dir = std::path::Path::new(&image_dir);
    if !dir.is_dir() {
        return Err("镜像目录无效".into());
    }

    let total = partitions.len();
    for (i, partition) in partitions.iter().enumerate() {
        let img_file = format!("{}.img", partition);
        let img_path = dir.join(&img_file);
        if !img_path.exists() {
            emit_log(&app, &format!("⚠️ 跳过 {}（文件不存在）", img_file));
            continue;
        }

        emit_log(
            &app,
            &format!("[{}/{}] 正在刷入 {} 分区...", i + 1, total, partition),
        );
        let output = new_command(
            &fb.to_string_lossy(),
            &["flash", partition, &img_path.to_string_lossy()],
        )
        .output()
        .map_err(|e| format!("刷入 {} 失败: {}", partition, e))?;

        if !output.status.success() {
            let err = String::from_utf8_lossy(&output.stderr);
            return Err(format!("刷入 {} 失败: {}", partition, err));
        }
        emit_progress(&app, (((i + 1) as f64 / total as f64) * 100.0) as u8);
    }

    emit_log(&app, "✅ Fastboot 救砖完成，请重启设备");
    Ok("success".into())
}

use std::collections::HashMap;
use std::sync::Mutex;

// 保存正在运行的子进程，以便手动终止
lazy_static::lazy_static! {
    static ref PROCESSES: Mutex<HashMap<String, std::process::Child>> = Mutex::new(HashMap::new());
}

// ========== 流式 ADB 命令执行（用于 logcat 等持续输出） ==========
#[tauri::command]
pub async fn execute_adb_stream(
    app: tauri::AppHandle,
    command: String,
    cmd_id: String,
) -> Result<(), String> {
    let adb = get_adb_path(&app);
    let (tool, args_str) = if command.trim().starts_with("fastboot") {
        let fb = adb.parent().unwrap().join("fastboot.exe");
        (
            fb,
            command
                .trim()
                .strip_prefix("fastboot")
                .unwrap_or("")
                .trim()
                .to_string(),
        )
    } else {
        (
            adb.clone(),
            command
                .trim()
                .strip_prefix("adb")
                .unwrap_or(&command)
                .trim()
                .to_string(),
        )
    };

    if !tool.exists() {
        return Err(format!(
            "工具未找到: {}",
            tool.file_name().unwrap_or_default().to_string_lossy()
        ));
    }

    let args: Vec<&str> = args_str.split_whitespace().collect();
    let mut child = new_command(&tool.to_string_lossy(), &args)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("启动失败: {}", e))?;

    let _pid = child.id();
    let app_clone = app.clone();
    let cmd_id_clone = cmd_id.clone();

    // 读取 stdout
    if let Some(stdout) = child.stdout.take() {
        let app_std = app_clone.clone();
        let cid = cmd_id_clone.clone();
        std::thread::spawn(move || {
            use std::io::{BufRead, BufReader};
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                if let Ok(line) = line {
                    let _ = app_std.emit("tool-stream", format!("{}:{}", cid, line));
                }
            }
        });
    }

    // 读取 stderr
    if let Some(stderr) = child.stderr.take() {
        let app_err = app_clone.clone();
        let cid = cmd_id_clone.clone();
        std::thread::spawn(move || {
            use std::io::{BufRead, BufReader};
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                if let Ok(line) = line {
                    let _ = app_err.emit("tool-stream", format!("{}:ERR: {}", cid, line));
                }
            }
        });
    }

    // 存储进程以便终止
    PROCESSES.lock().unwrap().insert(cmd_id, child);

    Ok(())
}

// ========== 终止流式命令 ==========
#[tauri::command]
pub async fn kill_adb_process(cmd_id: String) -> Result<(), String> {
    let mut map = PROCESSES.lock().unwrap();
    if let Some(mut child) = map.remove(&cmd_id) {
        let _ = child.kill();
    }
    Ok(())
}
