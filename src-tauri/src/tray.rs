use tauri::{
  tray::{TrayIconBuilder, TrayIconEvent},
  AppHandle, Runtime,
  Manager,
};
use tauri::tray::TrayIcon;

pub fn enable_tray<R: Runtime>(app_handle: &AppHandle<R>) -> Result<TrayIcon<R>, Box<dyn std::error::Error>> {

  let app_icon = app_handle.default_window_icon().cloned()
      .ok_or("Default window icon not found").unwrap();

  let tray_icon = TrayIconBuilder::new()
    .icon(app_icon)
    .on_tray_icon_event(move |tray_handle, event| {
      // 监听鼠标点击事件
      if let TrayIconEvent::Click { .. } = event {
        // 获取应用句柄
        let app_handle = tray_handle.app_handle();
        // 获取主窗口并显示
        if let Some(window) = app_handle.get_webview_window("main") {
          let _ = window.show();
          let _ = window.set_focus();
        }
      }
    })
    .build(app_handle)?;

  // 托盘图标设置为模板图标, 自适应系统背景色，主要是白色黑色时图标看不见的问题
  tray_icon.set_icon_as_template(true)?;
  Ok(tray_icon)
}