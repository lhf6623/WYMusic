// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
// 导入工具函数、插件配置和命令模块
mod tools;
mod mp3_tools;
mod plugins;
mod commands;

#[cfg(target_os = "macos")]
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default();
        
    let app_with_plugins = plugins::setup_plugins(app);
    let app_with_commands = commands::register_commands(app_with_plugins);
    
    let commands_build = app_with_commands
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    // mac 上点击程序坞图标时, 显示窗口
    #[cfg(target_os = "macos")]
    commands_build.run(|app_handle, event| match event {
        tauri::RunEvent::Reopen { has_visible_windows, .. } => {
            if !has_visible_windows {
                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.show();
                }
            }
        }
        _ => {}
    });
        
}
