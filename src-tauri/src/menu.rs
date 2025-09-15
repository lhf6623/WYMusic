use tauri::{AppHandle, Runtime};
use tauri::menu::{AboutMetadata, MenuBuilder, SubmenuBuilder};

pub fn enable_menu<R: Runtime>(app_handle: &AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
    let app_icon = app_handle.default_window_icon().cloned()
        .ok_or("Default window icon not found").unwrap();
    let about_metadata = AboutMetadata {
        icon: Some(app_icon),
        ..Default::default()
    };
    let file_menu = SubmenuBuilder::new(app_handle, "wy-music")
        .about_with_text("关于", Some(about_metadata))
        .separator()
        .quit_with_text("退出")
        .build()?;
        
    let menu = MenuBuilder::new(app_handle)
        .items(&[&file_menu])
        .build()?;

    app_handle.set_menu(menu)?;
    Ok(())
}