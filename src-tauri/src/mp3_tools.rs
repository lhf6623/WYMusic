use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use id3::{Tag, TagLike, Version, frame::{Picture, PictureType}};  // 导入需要的类型
use mp3_metadata;  // 需要添加 mp3_metadata 导入
use base64::{engine::general_purpose::STANDARD, Engine};
use crate::tools::{get_lyric};
/**
 * 歌曲命名规则
 * 格式：[歌手1,歌手2,歌手3]-[歌名].mp3
 * 例如：王万-我好想你.mp3
*/

/** 获取 mp3 播放时长（返回毫秒数）这里的 file_name 没有后缀 */
pub async fn get_mp3_duration(path: String) -> Result<u64, String> {
    let path = PathBuf::from(path);
    // 读取MP3文件元数据获取时长
    let metadata = mp3_metadata::read_from_file(path)
        .map_err(|e| format!("读取MP3元数据失败: {}", e))?;

    // 将Duration转换为毫秒数（使用整数运算避免浮点错误）
    let milliseconds = metadata.duration.as_secs() * 1000 + 
                      (metadata.duration.subsec_nanos() / 1_000_000) as u64;
    
    Ok(milliseconds)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Mp3MetadataInfo {
    pub name: String,           // 歌曲标题
    pub singer: Vec<String>,    // 艺术家
    pub dt: u64,                // 时长（秒）
    pub album: String,          // 专辑
    pub path: String,           // mp3 路径
    pub img: String,            // 封面图像数据
    pub lrc: String,            // 歌词
}
pub async fn set_mp3_metadata(path: String, data: Mp3MetadataInfo) -> Result<(), String> {
  
  // 检查文件是否存在
  let file_path = Path::new(&path);
  if !file_path.exists() {
    return Err(format!("文件不存在: {}", &path));
  }

  // 读取现有标签或创建新标签
  let mut tag = match Tag::read_from_path(file_path) {
      Ok(tag) => tag,
      Err(_) => Tag::new() // 如果没有现有标签，创建新标签
  };

  // 歌曲名
  let name = data.name.clone();
  if !name.is_empty() {
      tag.set_title(name.to_string());
  }
  
  // 歌手
  let artist = data.singer.join(",");
  if !artist.is_empty() {
      tag.set_artist(artist.to_string());
  }

  // 设置封面
  // 获取 封面 data.img 是 base64 编码的字符串, 解码 base64 图片数据
  // data:image/jpeg;base64, 有这个前缀需要处理一下吗？
  let img_data = data.img.clone().replace("data:image/jpeg;base64,", "");
  let img_data = STANDARD.decode(img_data)
    .map_err(|e| format!("解码图片数据失败: {}", e))?;
  let cover = Some(img_data);

  if let Some(cover) = cover {
    // 创建一个图片帧并设置相关属性
    let picture = Picture {
      mime_type: "image/jpeg".to_string(),
      picture_type: PictureType::CoverFront,
      description: "Cover".to_string(),
      data: cover,
    };
    // 将图片添加到标签
    tag.add_frame(picture);

  }
  // 专辑
  let album = data.album.clone();
  if !album.is_empty() {
      tag.set_album(album.to_string());
  }

  // 时长
  let dt = data.dt;
  if dt > 0 {
    tag.set_duration(dt.try_into().unwrap());
  }

  // 保存标签，使用 ID3v2.4 版本
  tag.write_to_path(file_path, Version::Id3v24)
      .map_err(|e| format!("写入标签失败: {}", e))?;

  Ok(())
}

// 获取 mp3 元数据
pub async fn get_mp3_metadata(path: String) -> Result<Mp3MetadataInfo, String> {
    // 检查文件是否存在
    let file_path = Path::new(&path);
    if !file_path.exists() {
        return Err(format!("文件不存在: {}", path));
    }

    // 使用mp3_metadata获取时长
    let dt = get_mp3_duration(path.clone()).await?;

    // 使用id3库解析ID3标签
    let tag = Tag::read_from_path(file_path)
        .map_err(|e| format!("读取ID3标签失败: {}", e))?;

    // 歌曲名 如果不存在则返回 空字符串
    let mut name = tag.title().unwrap_or("").to_string();
    // 如果 name 为空 则把 文件名 赋值给 name
    if name.is_empty() {
        let filename = file_path.file_name().unwrap().to_string_lossy().to_string();
        name = filename.replace(".mp3", "");
    }

    // 歌手 如果不存在则返回 空字符串
    let singer = tag.artist().map(|s| {
        s.to_string()
            .split(",")
            .map(|s| s.trim().to_string()) // 去除空格并转换为String
            .collect::<Vec<String>>() // 收集为Vec<String>
    }).unwrap_or(vec![]);

    // 专辑 如果不存在则返回 空字符串
    let album = tag.album().unwrap_or("").to_string();
    
    // 提取封面图像, 并转换为 base64 编码 如果不存在 返回空字符串
    let img = tag.pictures().next().map(|pic| {
        let img_base64 = STANDARD.encode(pic.data.clone());
        // 图片 base64 编码 前面添加 data:image/jpeg;base64,
        format!("data:image/jpeg;base64,{}", img_base64)
    }).unwrap_or("".to_string());

    // 歌词
    let lrc = get_lyric(file_path.to_string_lossy().to_string()).await?;

    // 构建并返回元数据信息
    Ok(Mp3MetadataInfo {
        name,
        singer,
        dt,
        album,
        path,
        img,
        lrc,
    })
}