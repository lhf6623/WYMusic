// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
// 导入工具函数、插件配置和命令模块
mod tools;
mod mp3_tools;
mod plugins;
mod commands;
mod tray;
mod menu;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle();
            tray::enable_tray(handle)?;
            menu::enable_menu(handle)?;
            Ok(())
        });
        
    let app_with_plugins = plugins::setup_plugins(app);
    let app_with_commands = commands::register_commands(app_with_plugins);
    
    app_with_commands
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        // 解决macos下点击dock图标不显示窗口的问题
        .run(|app_handle, event| match event {
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
