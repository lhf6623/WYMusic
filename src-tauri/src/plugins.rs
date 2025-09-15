use tauri::Builder;
use tauri::Manager;
use tauri::Runtime;

/**
 * 配置并注册 Tauri 应用程序所需的所有插件
 */
pub fn setup_plugins<R: Runtime>(builder: Builder<R>) -> Builder<R> {
    builder
        // 对话框插件，用于显示原生对话框
        .plugin(tauri_plugin_dialog::init())

        // 文件系统插件，用于文件系统操作
        .plugin(tauri_plugin_fs::init())
        
        // 单例实例插件，确保只有一个应用实例运行
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // 当检测到已有实例运行时，显示并聚焦主窗口
            if let Some(window) = app.get_webview_window("main") {
                window.show().unwrap();
                window.set_focus().unwrap();
            }
        }))

        // 持久化插件，用于持久化应用程序状态 
        .plugin(tauri_plugin_persisted_scope::init())
        
        // 打开器插件，用于打开外部文件或URL
        .plugin(tauri_plugin_opener::init())
}