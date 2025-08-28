// 本地歌曲

import { invoke } from "@tauri-apps/api/core";

/** 根据url 下载文件 */
export async function downloadFile(
  resources: {
    /** 音乐url */
    mp3_url: string | null;
    /** 图片url */
    image_url: string | null;
    /** 歌词 */
    text: string | null;
  },
  filename: string
) {
  try {
    const song = await invoke<SongType>("download_file", {
      resources,
      filename,
    });

    return song;
  } catch (error) {
    console.error("下载失败:", error);
    throw error;
  }
}
/** 根据 id 获取本地歌曲信息, 如果没有传 id 默认返回全部歌曲信息 */
export async function getSongs(ids: string) {
  const list = await invoke<SongType[]>("get_songs", { ids });
  return list;
}

/** 删除本地文件 */
export async function deleteFile(id: string | number) {
  return await invoke<string>("delete_file", { id: id.toString() });
}

/** 下载多张图片到本地 */
export async function downloadImages(
  data: {
    /** 歌曲id */
    id: string;
    /** 图片url */
    url: string;
    /** 图片名称 */
    name: string;
  }[]
) {
  return await invoke<SongType[]>("download_img_file", { data });
}

/** 根据id 获取本地图片的 base64 编码 */
export async function getImgBase64(id: string) {
  return await invoke<string>("get_img_base64", { id });
}
