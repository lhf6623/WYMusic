/**
 * Tauri 命令模块 - 包含所有可供前端调用的 Rust 函数
 */
use serde::Deserialize;
use tauri::Runtime;

// 导入工具函数
use crate::tools::{SongInfo, save_bytes_to_local, request_file, get_song_info, get_file_names, get_song_list};

#[derive(Deserialize)]
struct DownloadResources {
    mp3_url: Option<String>,
    image_url: Option<String>,
    text: Option<String>,
}

#[derive(Deserialize, Debug)]
struct ImageItem {
    name: String,
    url: String,
}

#[tauri::command]
/** 
 * 下载文件到本地 mp3 jpg text, 最后返回 歌曲信息
 * 后续： 
 * mp3 jpg text 不一定要一起下载，
 * 可以单独下载 mp3 或者 jpg 或者 text，但是其他不传的字段要设置为 null
 * 单独下载时，也会返回歌曲信息，可能不全
 */
async fn download_file(resources: DownloadResources, filename: String) -> Result<SongInfo, String> {
    let music_dir = dirs::audio_dir().expect("Could not find music directory");
    let save_path = music_dir.join("WYMusic").join(&filename);

    if let Some(ref mp3_url) = resources.mp3_url {
        // 判断当前文件夹下是否有这个 mp3 文件
        let mp3_path = save_path.with_extension("mp3");
        if !mp3_path.exists() {
            let mp3_bytes = request_file(mp3_url.to_string()).await?;
            save_bytes_to_local(mp3_bytes, &save_path, "mp3").await?;
        }
    }
    
    if let Some(ref jpg_url) = resources.image_url {
        // 判断当前文件夹下是否有这个 jpg 文件
        let jpg_path = save_path.with_extension("jpg");
        if !jpg_path.exists() {
            let jpg_bytes = request_file(jpg_url.to_string()).await?;
            save_bytes_to_local(jpg_bytes, &save_path, "jpg").await?;
        }
    }
    
    if let Some(ref text) = resources.text {
        let txt_path = save_path.with_extension("txt");
        if !txt_path.exists() {
            // text 是歌词 字符串，直接保存在本地 txt 中
            save_bytes_to_local(text.as_bytes().to_vec(), &save_path, "txt").await?;
        }
    }
    
    let song_info = get_song_info(filename).await.unwrap();
    
    Ok(song_info)
}

#[tauri::command]
/** 下载图片 img_data 参数是个数组，数据结构为 
 * [
 *  {
 *    id: string,
 *    name: string,
 *    url: string,
 *  }
 * ]
 * 
 * 静默下载，不返回数据
 */
async fn download_img_file(data: Vec<ImageItem>) -> Result<(), String> {
    // 获取音乐目录
    let music_dir = dirs::audio_dir().expect("Could not find music directory");
    let save_path = music_dir.join("WYMusic");
    
    // 遍历所有图片数据
    for img in data {
        // 判断当前文件夹下是否有这个 jpg 文件
        let jpg_path = save_path.join(&img.name).with_extension("jpg");
        if !jpg_path.exists() {
            // 下载图片
            let img_bytes = request_file(img.url.clone()).await?;
            
            // 保存图片到本地
            let save_path = save_path.join(img.name);
            save_bytes_to_local(img_bytes, &save_path, "jpg").await?;
        }
    }
    // 静默下载，不返回数据
    Ok(())
}

#[tauri::command]
/** 获取本地所有的 mp3 信息 */
async fn get_songs(ids: String) -> Vec<SongInfo> {
    if ids.is_empty() {
        let mp3_names = get_file_names(None).await;
        let mut ids = Vec::new();
        for name in mp3_names {
            let id = name.split("__").last().unwrap().split('.').next().unwrap().to_string();
            ids.push(id);
        }
        get_song_list(ids.join(",")).await.unwrap()
    }else {
        get_song_list(ids).await.unwrap()
    }
}

#[tauri::command]
/** 删除本地文件 */
async fn delete_file(id: String) -> Result<(), String> {
    let music_dir = dirs::audio_dir().expect("Could not find music directory");
    let save_path = music_dir.join("WYMusic");
    
    let mp3_names = get_file_names(None).await;
    for name in mp3_names {
        if name.contains(&id) {
            // 删除 mp3 文件
            let path = save_path.join(&name);
            let mp3_path = path.with_extension("mp3");
            // 需要做判断，是否存在
            if mp3_path.exists() {
                let mp3_remove_path = mp3_path.to_string_lossy().into_owned();
                std::fs::remove_file(&mp3_remove_path).map_err(|e| e.to_string())?;
            }
            // 删除 jpg 文件
            let jpg_path = path.with_extension("jpg");
            if jpg_path.exists() {
                let jpg_remove_path = jpg_path.to_string_lossy().into_owned();
                std::fs::remove_file(&jpg_remove_path).map_err(|e| e.to_string())?;
            }
            // 删除 txt 文件
            let txt_path = path.with_extension("txt");
            if txt_path.exists() {
                let txt_remove_path = txt_path.to_string_lossy().into_owned();
                std::fs::remove_file(&txt_remove_path).map_err(|e| e.to_string())?;
            }
        }
    }
    Ok(())
}

pub fn register_commands<R: Runtime>(builder: tauri::Builder<R>) -> tauri::Builder<R> {
    builder.invoke_handler(tauri::generate_handler![
        download_file,
        delete_file,
        download_img_file,
        get_songs,
    ])
}