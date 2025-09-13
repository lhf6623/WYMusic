use reqwest::Client;
use std::path::{PathBuf, Path};

// 根据 url 保存字节流到本地
pub async fn save_bytes_to_local(
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
pub async fn request_file(url: String) -> Result<Vec<u8>, String> {
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

/** 获取本地 text 文本 这里的 file_name 没有后缀 */
pub async fn get_lyric(path: String) -> Result<String, String> {
    let lrc_path = Path::new(&path);
    let lrc_path = lrc_path.with_extension("lrc");

    let txt = if lrc_path.exists() {
      let lrc_data = std::fs::read(&lrc_path)
          .map_err(|e| format!("读取歌词文件失败: {}", e))?;
      Some(String::from_utf8(lrc_data)
          .map_err(|e| format!("歌词文件编码错误: {}", e))?)
    } else {
      None
    };
    Ok(txt.unwrap_or_default())
}

/** 获取 dir 目录下的所有 mp3 文件路径 */
pub async fn get_file_path(dir: String) -> Vec<String> {
    let mut result = Vec::new();

    if dir.is_empty() {
        return result;
    }
    
    let target_dir = std::path::PathBuf::from(dir);

    // 检查目录是否存在
    if !target_dir.exists() || !target_dir.is_dir() {
        return result;
    }

    // 读取目录内容，获取所有 mp3 文件路径
    if let Ok(entries) = std::fs::read_dir(target_dir) {
        result = entries
            .flatten()
            .filter_map(|entry| {
                entry.file_type().ok().and_then(|file_type| {
                    if file_type.is_file() {
                        let path = entry.path();
                        path.extension()
                            .and_then(|ext| ext.to_str())
                            .filter(|&ext| ext.eq_ignore_ascii_case("mp3"))
                            .and_then(|_| path.to_str())
                            .map(ToString::to_string)
                    } else {
                        None
                    }
                })
            })
            .collect();
    }
    result 
}