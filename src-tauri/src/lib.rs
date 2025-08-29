// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
/**
 * 图片是第一个下载下来的，歌曲信息应该以图片的文件名为准
 * 如果歌曲图片，歌曲mp3，歌曲歌词都下载下来了，歌曲信息应该有 id，name，singer，dt，lyric，img，mp3
 * 如果有残缺，只有歌曲图片，那么歌曲信息只有 id，name，singer，img，其他的为空 dt = 0, lyric = '', mp3 = ''
 */
use serde::Serialize;
use reqwest::Client;
use std::path::PathBuf;

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
    dt: u64,
    lyric: String,
    img: String,
    mp3: String,
}

// 根据 url 保存字节流到本地
async fn save_bytes_to_local(
    bytes: Vec<u8>,
    save_path: &PathBuf,
    extension: &str,
) -> Result<String, String> {
    use std::io::Write;

    let path = save_path.with_extension(extension);
    std::fs::create_dir_all(path.parent().ok_or("无效路径")?)
        .map_err(|e| format!("创建目录失败: {}", e))?;
    let mut file = std::fs::File::create(&path)
        .map_err(|e| format!("创建文件失败: {}", e))?;
    file.write_all(&bytes)
        .map_err(|e| format!("写入文件失败: {}", e))?;
    Ok(path.to_string_lossy().to_string())
}

// 请求文件 返回字节流
async fn request_file(url: String) -> Result<Vec<u8>, String> {
    let client = Client::new();
    
    // 验证 URL 格式
    let url_parsed = url.parse::<reqwest::Url>()
        .map_err(|e| format!("无效的 URL test: {}", e))?;
    
    let response = client.get(url_parsed)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("请求失败: 状态码 {}", response.status()));
    }
    
    let bytes = response.bytes()
        .await
        .map_err(|e| format!("读取响应失败: {}", e))?;
    
    Ok(bytes.to_vec())
}

/** 获取 mp3 播放时长（返回毫秒数）这里的 file_name 没有后缀 */
async fn get_mp3_duration(file_name: String) -> Result<u64, String> {
    let music_dir = dirs::audio_dir().expect("Could not find music directory");
    let save_path = music_dir.join("WYMusic");
    let mp3_path = save_path.join(file_name + ".mp3");
    // 读取MP3文件元数据获取时长
    let metadata = mp3_metadata::read_from_file(mp3_path.to_string_lossy().into_owned())
        .map_err(|e| format!("读取MP3元数据失败: {}", e))?;

    // 将Duration转换为毫秒数（使用整数运算避免浮点错误）
    let milliseconds = metadata.duration.as_secs() * 1000 + 
                      (metadata.duration.subsec_nanos() / 1_000_000) as u64;
    
    Ok(milliseconds)
}

/** 获取本地 text 文本 这里的 file_name 没有后缀 */
async fn get_lyric(file_name: String) -> Result<String, String> {

    let music_dir = dirs::audio_dir().expect("Could not find music directory");
    let save_path = music_dir.join("WYMusic");

    let txt_path = save_path.join(file_name + ".txt");
    let lyric = std::fs::read_to_string(txt_path)
        .map_err(|e| e.to_string())?;
    Ok(lyric)
}

/** 根据 file_name 获取 name singer picUrl dt lyric img mp3 */
async fn get_song_info(file_name: String) -> Result<SongInfo, String> {
    let name_arr: Vec<&str> = file_name.split(".").collect();
    let base_name = name_arr[0..name_arr.len()-1].join(".");
    
    let music_dir = dirs::audio_dir().expect("Could not find music directory");
    let wy_music_dir = music_dir.join("WYMusic").join(&file_name);

    // 分割文件名获取各部分信息, 格式：[歌名]__[歌手1_#_歌手2_#_歌手3]__[ID]
    let parts: Vec<&str> = base_name.split("__").collect();
    if parts.len() < 3 {
        return Err(format!("文件名格式不正确1: {:?}", parts));
    }

    // 解析ID
    let id = parts.last().ok_or("无法获取ID部分")?;

    // 解析歌曲名
    let name = parts.first().ok_or("无法获取歌曲名部分")?;

    // 解析歌手名
    let singer = parts[1..parts.len()-1].join("__").split("_#_")
        .map(|s| s.trim().to_string())
        .collect::<Vec<String>>();

    // 获取MP3时长， 判断 wy_music_dir 目录下是否有 mp3 文件
    let dt = if wy_music_dir.with_extension("mp3").exists() {
        get_mp3_duration(base_name.clone()).await?
    } else {
        0
    };

    // 歌词，判断 wy_music_dir 目录下是否有 txt 文件
    let lyric = if wy_music_dir.with_extension("txt").exists() {
        get_lyric(base_name.clone()).await?
    } else {
        "".to_string()
    };

    let img_url = if wy_music_dir.with_extension("jpg").exists() {
        format!("{}", wy_music_dir.with_extension("jpg").to_string_lossy())
    } else {
        "".to_string()
    };

    let mp3_url = if wy_music_dir.with_extension("mp3").exists() {
        format!("{}", wy_music_dir.with_extension("mp3").to_string_lossy())
    } else {
        "".to_string()
    };

    Ok(SongInfo {
        id: id.to_string(),
        name: name.to_string(),
        singer,
        dt,
        lyric,
        img: img_url,
        mp3: mp3_url,
    })
}

/** 获取WYMusic目录下所有 jpg 文件名字 suffix_type 默认为 jpg */
async fn get_file_names(suffix_type: Option<String>) -> Vec<String> {
    let suffix_type = suffix_type.unwrap_or_else(|| "jpg".to_string());
    
    let music_dir = dirs::audio_dir().expect("Could not find music directory");
    let wy_music_dir = music_dir.join("WYMusic");
    let mut file_names = Vec::new();

    if let Ok(entries) = std::fs::read_dir(wy_music_dir) {
        for entry in entries {
            if let Ok(entry) = entry {
                if let Some(ext) = entry.path().extension() {
                    if ext.to_str() == Some(&suffix_type) {  // 转换为字符串再比较
                        file_names.push(entry.path().file_name().unwrap().to_string_lossy().to_string());
                    }
                }
            }
        }
    }
    
    file_names 
}

/** 根据 id 获取 get_song_info, 歌曲信息可以不齐全 */
async fn get_song_list(idstr: String) -> Result<Vec<SongInfo>, String> {
    // 解析 idstr 为 [12312,23423,453345]
    let ids: Vec<&str> = idstr.split(',').collect();
    let mut result = Vec::new();
    // 获取本地所有的 jpg 文件名字
    let jpg_names = get_file_names(None).await;
    
    for id in ids {
        let id = id.trim();
        // 找到目标文件名，根据文件名获取歌曲信息
        let jpg_name = jpg_names.iter().find(|&name| name.contains(id));
        if let Some(jpg_name) = jpg_name {
            let song_info = get_song_info(jpg_name.to_string()).await.unwrap();
            result.push(song_info);
        }
        // 如果找不到不需要处理
    }
    Ok(result)
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
#[derive(serde::Deserialize, Debug)]
pub struct ImageItem {
    pub id: String,
    pub name: String,
    pub url: String,
}
#[tauri::command]
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

/** 获取本地所有的 mp3 信息 */
#[tauri::command]
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![download_file, delete_file, download_img_file, get_songs])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
