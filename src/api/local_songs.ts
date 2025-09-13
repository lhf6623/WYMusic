import { invoke } from "@tauri-apps/api/core";

/** 根据 url 下载 MP3 文件，返回本地文件路径 */
export async function downloadFile(data: LocalMp3FileInfo) {
  try {
    const song = await invoke<LocalMp3FileInfo>("download_file", { data });

    return song;
  } catch (error) {
    console.error("下载失败:", error);
    throw error;
  }
}
/** 根据目录获取该目录下的所有 mp3 文件路径 */
export async function getDirAllMp3Path(dirs: string[]) {
  const list = await invoke<string[]>("get_paths_by_dir", { dirs });
  return list;
}

/** 删除本地文件 */
export async function deleteFile(paths: string[]) {
  // 返回的是删除错误的 mp3 路径
  await invoke<string[]>("delete_file", { paths });

  return paths;
}

/** 获取 mp3 信息 */
export async function getMp3Info(paths: string[]) {
  const songs = await invoke<LocalMp3FileInfo[]>("get_songs_by_path", {
    paths,
  });

  return songs;
}
