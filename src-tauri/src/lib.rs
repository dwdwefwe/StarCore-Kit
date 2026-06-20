mod commands;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::detect_device,
            commands::poll_device,
            commands::install_builtin_apk,
            commands::push_image,
            commands::pull_latest_patched_image,
            commands::flash_root,
            commands::execute_adb,
            commands::reboot_recovery,
            commands::reboot_fastboot,
            commands::reboot_system,
            commands::screenshot,
            commands::list_partitions,
            commands::backup_partition,
            commands::install_custom_apk,
            commands::edl_flash,
            commands::detect_edl,
            commands::verify_tools,
            commands::fastboot_flash,
            commands::adb_sideload,
            commands::fastboot_boot,
            commands::restore_partition,
            commands::uninstall_package,
            commands::read_prop,
            commands::write_prop,
            commands::oem_unlock_status,
            commands::oem_unlock_command,
            commands::fastboot_rescue,
            commands::execute_adb_stream, // 新增
            commands::kill_adb_process    // 新增
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
