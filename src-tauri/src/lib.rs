// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use serde::Serialize;

#[derive(serde::Deserialize)]
pub struct DownloadResources {
    mp3_url: Option<String>,
    image_url: Option<String>,
    text: Option<String>,
}

#[derive(Serialize)]
pub struct SongInfo {
    id: String,
    name: String,
    singer: Vec<String>,
    pic_url: String,
    dt: u64,
}
#[tauri::command]
/** 下载文件到本地 mp3 jpg text, 最后返回 歌曲信息 */
async fn download_file(resources: DownloadResources, filename: String) -> Result<SongInfo, String> {
    use std::io::Write;
    use reqwest::Client;
    use std::path::PathBuf;

    let music_dir = dirs::audio_dir().expect("Could not find music directory");
    let save_path = music_dir.join("WYMusic").join(&filename);

    // 请求文件 返回字节流
    async fn request_file(url: String) -> Result<Vec<u8>, String> {
        let client = Client::new();
        let response = client.get(url).send().await.unwrap();
        let bytes = response.bytes().await.unwrap();
        Ok(bytes.to_vec())
    }
    // 根据 url 保存字节流到本地
    async fn save_bytes_to_local(
        bytes: Vec<u8>,
        save_path: &PathBuf,
        extension: &str,
    ) -> Result<String, String> {
        let path = save_path.with_extension(extension);
        std::fs::create_dir_all(path.parent().ok_or("无效路径")?)
            .map_err(|e| format!("创建目录失败: {}", e))?;
        let mut file = std::fs::File::create(&path)
            .map_err(|e| format!("创建文件失败: {}", e))?;
        file.write_all(&bytes)
            .map_err(|e| format!("写入文件失败: {}", e))?;
        Ok(path.to_string_lossy().to_string())
    }

    let mp3_path = if let Some(mp3_url) = resources.mp3_url {
        let save_dir = dirs::audio_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("WYMusic");
        
        if !save_dir.exists() {
            std::fs::create_dir_all(&save_dir).map_err(|e| e.to_string())?;
        }
        
        let save_path = save_dir.join(&filename).with_extension("mp3");
        
        let client = Client::new();
        let response = client.get(&mp3_url).send().await.map_err(|e| e.to_string())?;
        let bytes = response.bytes().await.map_err(|e| e.to_string())?;
        
        std::fs::write(&save_path, bytes).map_err(|e| e.to_string())?;
        
        save_path.to_string_lossy().into_owned()
    } else {
        return Err("No MP3 URL provided".to_string());
    };
    
    if let Some(jpg_url) = resources.image_url {
        let jpg_bytes = request_file(jpg_url).await?;
        save_bytes_to_local(jpg_bytes, &save_path, "jpg").await?;
    }
    
    if let Some(text) = resources.text {
        save_bytes_to_local(text.as_bytes().to_vec(), &save_path, "txt").await?;
    }
    // 构建并返回SongInfo
    Ok(get_song_info(mp3_path).await.unwrap())
}

/** 获取 mp3 播放时长（返回毫秒数） */
async fn get_mp3_duration(mp3_path: &str) -> Result<u64, String> {
    // 读取MP3文件元数据获取时长
    let metadata = mp3_metadata::read_from_file(mp3_path)
        .map_err(|e| format!("读取MP3元数据失败: {}", e))?;

    // 将Duration转换为毫秒数（使用整数运算避免浮点错误）
    let milliseconds = metadata.duration.as_secs() * 1000 + 
                      (metadata.duration.subsec_nanos() / 1_000_000) as u64;
    
    Ok(milliseconds)
}

/** 获取WYMusic目录下所有MP3文件地址路径 suffix_type 默认为 mp3 */
async fn get_file_paths(suffix_type: Option<String>) -> Vec<String> {
    let suffix_type = suffix_type.unwrap_or_else(|| "mp3".to_string());
    
    let music_dir = dirs::audio_dir().expect("Could not find music directory");
    let wy_music_dir = music_dir.join("WYMusic");
    let mut file_paths = Vec::new();

    if let Ok(entries) = std::fs::read_dir(wy_music_dir) {
        for entry in entries {
            if let Ok(entry) = entry {
                if let Some(ext) = entry.path().extension() {
                    if ext.to_str() == Some(&suffix_type) {  // 转换为字符串再比较
                        file_paths.push(entry.path().to_string_lossy().to_string());
                    }
                }
            }
        }
    }
    
    file_paths
}

/** 获取本地所有的 mp3 信息 */
#[tauri::command]
async fn get_local_songs() -> Vec<SongInfo> {
    let mp3_files = get_file_paths(None).await;
    let mut ids = Vec::new();
    for mp3_file in mp3_files {
        let id = mp3_file.split('-').last().unwrap().split('.').next().unwrap().to_string();
        ids.push(id);
    }
    get_song_list(ids.join(",")).await.unwrap()
}

/** 根据 path 获取 name singer picUrl dt */
async fn get_song_info(path: String) -> Result<SongInfo, String> {
    // 使用 Path 处理跨平台路径分隔符
    let path = std::path::Path::new(&path);
    let file_name = path.file_name()
        .and_then(|os_str| os_str.to_str())
        .ok_or_else(|| "无法解析文件名".to_string())?;

    // 分割文件名获取各部分信息（格式：[歌名]-[歌手]-[ID].mp3）
    let parts: Vec<&str> = file_name.split('-').collect();
    if parts.len() < 3 {
        return Err(format!("文件名格式不正确: {}", file_name));
    }

    // 解析ID（最后一部分的前缀）
    let id_part = parts.last().ok_or("无法获取ID部分")?;
    let id = id_part.split('.').next()
        .ok_or_else(|| format!("无法解析ID: {}", id_part))?;

    // 解析歌曲名和歌手
    let name = parts[0].to_string();
    let singer = parts[1..parts.len()-1].join("-")  // 处理歌手名中可能包含的 '-' 字符
        .split_whitespace()
        .map(|s| s.trim().to_string())
        .collect::<Vec<String>>();

    // 获取MP3时长
    let dt = get_mp3_duration(&path.to_string_lossy()).await?;

    // 构建图片URL路径（使用原文件所在目录）
    let pic_url = file_name.replace(".mp3", ".jpg");

    Ok(SongInfo {
        id: id.to_string(),
        name,
        singer,
        pic_url,
        dt,
    })
}

/** 根据 id 获取 name singer picUrl dt */
#[tauri::command]
async fn get_song_list(idstr: String) -> Result<Vec<SongInfo>, String> {
    
    // /Users/lihaifeng/Music/WYMusic/野人 (Live版)-陈粒 孟维来-2644174802.mp3
    // 根据 id 获取本地 mp3 路径 解析路径
    // id 2644174802
    // name 野人 (Live版)
    // singer ['陈粒', '孟维来']
    // picUrl 野人 (Live版)-陈粒 孟维来-2644174802.jpg 
    // 这个 id 应该是字符串 比如 '12312,23423,453345' 需要循环获取所有 id 的信息
    // 返回的应该是数组
    
    // 具体编码
    // 解析 idstr 为 [12312,23423,453345]
    let ids: Vec<&str> = idstr.split(',').collect();
    let mut result = Vec::new();
    // 获取本地所有的 map3 文件路径
    let mp3_files = get_file_paths(None).await;
    
    for id in ids {
        let id = id.trim();
        // 假设 mp3_files 是 Vec<String>，每个元素是 mp3 文件路径
        let mp3_path = mp3_files.iter().find(|&path| path.contains(id));
        if let Some(mp3_path) = mp3_path {
            result.push(get_song_info(mp3_path.to_string()).await.unwrap());
        }
    }
    Ok(result)
}

#[tauri::command]
/** 获取本地 text 文本 */
async fn get_lyric(id: String) -> Result<String, String> {
    
    let mp3_files = get_file_paths(Some("txt".to_string())).await;
    let txt_path = mp3_files.iter().find(|&path| path.contains(&id)).unwrap();
    std::fs::read_to_string(&txt_path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
/** 删除本地文件 */
async fn delete_file(id: String) -> Result<(), String> {
    let mp3_files = get_file_paths(None).await;
    for mp3_path in mp3_files {
        if mp3_path.contains(&id) {
            std::fs::remove_file(&mp3_path).map_err(|e| e.to_string())?;
            // 删除 jpg 文件
            let jpg_path = mp3_path.replace(".mp3", ".jpg");
            std::fs::remove_file(&jpg_path).map_err(|e| e.to_string())?;
            // 删除 txt 文件
            let txt_path = mp3_path.replace(".mp3", ".txt");
            std::fs::remove_file(&txt_path).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![download_file, delete_file, get_local_songs, get_lyric, get_song_list])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
