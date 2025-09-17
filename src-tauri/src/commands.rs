/**
 * Tauri 命令模块 - 包含所有可供前端调用的 Rust 函数
 */
use tauri::Runtime;
use std::path::Path;

use crate::tools::{save_bytes_to_local, request_file, get_file_path};
use crate::mp3_tools::{Mp3MetadataInfo, get_mp3_metadata, set_mp3_metadata};

#[tauri::command]
/** 下载文件到本地 mp3 img txt, 最后返回 歌曲信息 */
async fn download_file(data: Mp3MetadataInfo) -> Result<Mp3MetadataInfo, String> {

    let filename = format!("{}-{}.mp3", data.singer.join(","), data.name);
    let music_dir = dirs::audio_dir().expect("Could not find music directory");
    let save_path = music_dir.join("WYMusic").join(&filename);

    // 判断当前文件夹下是否有这个 mp3 文件
    let mp3_path = save_path.with_extension("mp3");
    if !mp3_path.exists() {
        let mp3_bytes = request_file(data.path.to_string()).await?;
        save_bytes_to_local(mp3_bytes, &save_path, "mp3").await?;
    }
    
    if !data.lrc.is_empty() {
        let lrc_path = save_path.with_extension("lrc");
        if !lrc_path.exists() {
            // lrc 是歌词 字符串，直接保存在本地 lrc 中
            save_bytes_to_local(data.lrc.to_string().into(), &save_path, "lrc").await?;
        }
    }

    set_mp3_metadata(save_path.to_string_lossy().into_owned(), data).await?;
    
    let song_info = get_mp3_metadata(save_path.to_string_lossy().into_owned()).await?;
    
    Ok(song_info)
}

#[tauri::command]
/** 获取本地所有的 mp3 信息 */
async fn get_songs_by_path(paths: Vec<String>) -> Vec<Mp3MetadataInfo> {
    let mut result = Vec::new();
    for path in paths {
        // 使用 match 语句替代 ? 操作符
        match get_mp3_metadata(path).await {
            Ok(mp3_info) => result.push(mp3_info),
            Err(e) => {
                // 可以选择记录错误，或者忽略错误继续处理下一个文件
                eprintln!("获取MP3元数据失败: {}", e);
                // 继续处理下一个文件
                continue;
            }
        }
    }
    result
}
#[tauri::command]
async fn get_paths_by_dir(dirs: Vec<String>) -> Vec<String> {

    let mut result = Vec::new();
    for dir in dirs {
        let paths = get_file_path(dir.clone()).await;
        result.extend(paths);
    }
    result
}

#[tauri::command]
/** 删除本地文件, 返回删除失败的文件路径 */
async fn delete_file(paths: Vec<String>) -> Vec<String> {
    let mut result = Vec::new();
    for path in paths {

        let file_path = Path::new(&path);
        let lrc_path = file_path.with_extension("lrc");
        if lrc_path.exists() {
            if let Err(e) = std::fs::remove_file(&lrc_path) {
                eprintln!("删除歌词文件失败: {}", e);
            }
        }

        if let Err(e) = std::fs::remove_file(&file_path) {
            eprintln!("删除文件失败: {}", e);
            result.push(path);
        }
        
    }
    result
}

pub fn register_commands<R: Runtime>(builder: tauri::Builder<R>) -> tauri::Builder<R> {
    builder.invoke_handler(tauri::generate_handler![
        download_file,
        delete_file,
        get_songs_by_path,
        get_paths_by_dir,
    ])
}