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
        
        // 单例实例插件，确保只有一个应用实例运行
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // 聚焦窗口
            let window = app.get_webview_window("main").unwrap();
            window.show().unwrap();
            window.set_focus().unwrap();
        }))
        
        // 打开器插件，用于打开外部文件或URL
        .plugin(tauri_plugin_opener::init())
}