// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
// 导入工具函数、插件配置和命令模块
mod tools;
mod plugins;
mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default();
    
    let app_with_plugins = plugins::setup_plugins(app);
    
    let app_with_commands = commands::register_commands(app_with_plugins);
    
    app_with_commands
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
