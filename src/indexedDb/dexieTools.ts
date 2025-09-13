import Dexie from "dexie";
import fileListDB from "./fileListDB";
import { getBase64 } from "@/tools/index";

/** 更新远程歌曲到 indexedDB 中，图片需要做 base64 处理 */
export async function updateNetwork(remoteSongs: SongDetail[]) {
  const songs: NetworkMp3FileInfo[] = remoteSongs.map((item) => {
    const { name, ar, dt, al } = item;
    return {
      id: item.id.toString(),
      name,
      singer: ar.map((item) => item.name),
      dt: dt,
      album: al.name,
      img: al.picUrl,
      lastAccessTime: Date.now(),
    };
  });
  try {
    const keys = songs.map((item) => item.id);
    // 本地已存在的歌曲信息
    const localSongs = await fileListDB.network
      .where("id")
      .anyOf(keys)
      .toArray();

    if (keys.length === localSongs.length) return localSongs;

    const localKeys = localSongs.map((item) => item.id);

    // 把 img 网络图片转换为 base64 编码
    const newSongs = songs
      .filter((item) => !localKeys.includes(item.id))
      .map(async (item) => {
        if (item.img.startsWith("http://")) {
          item.img = await getBase64(item.img.replace("http://", "https://"));
        }
        return item;
      });
    const newSongsResult = await Promise.all(newSongs);

    // 使用 bulkPut 实现“存在则更新，不存在则添加”
    await fileListDB.network.bulkPut(newSongsResult);

    const all_list = [...localSongs, ...newSongsResult];

    return keys.map((id) => all_list.find((item) => item.id === id)!);
  } catch (error) {
    console.error("批量添加/更新失败：", error);
    return [];
  }
}

export async function putNetwork(songs: NetworkMp3FileInfo[]) {
  return await fileListDB.network.bulkPut(songs);
}
// 获取本地缓存的记录，更新访问时间
export async function getNetwork(ids: string[]) {
  const songs = await fileListDB.network.where("id").anyOf(ids).toArray();
  songs.forEach((item) =>
    fileListDB.network
      .where("id")
      .equals(item.id)
      .modify({ lastAccessTime: Date.now() })
  );
  return ids.map((id) => songs.find((item) => item.id === id)!);
}
// TODO 如果很久没访问 就删除
export async function delNetwork(ids: string[]) {
  await fileListDB.network.where("id").anyOf(ids).delete();
}

/**
 * 本地歌曲更新到 indexedDB 中
 */
export async function putLocal(songs: LocalMp3FileInfo[]) {
  await fileListDB.local.bulkPut(songs);
  return songs;
}

/** 根据多个 path 批量获取本地歌曲信息, 如果 paths 是空数组，就查询全部 */
export async function getLocal(paths: string[]) {
  // 如果 paths 是空数组，就查询全部
  if (paths.length === 0) {
    return await fileListDB.local.toArray();
  }
  try {
    const matchedRecords = await fileListDB.local
      .where("path")
      .anyOf(paths)
      .toArray();

    return paths.map(
      (path) => matchedRecords.find((item) => item.path === path)!
    );
  } catch (error) {
    console.error("批量获取记录失败：", error);
    return [];
  }
}

// 根据 mp3 删除歌曲
export async function delLocal(paths: string[]) {
  try {
    await fileListDB.local.where("path").anyOf(paths).delete();
  } catch (error) {
    console.error(`删除 path 为 ${paths.join(",")} 的记录失败：`, error);
  }
}

export async function delDB() {
  await fileListDB.close();
  await Dexie.delete(fileListDB.name);
  // 再次打开连接
  await fileListDB.open();
}

export async function getAllKeys() {
  const localKeys = await fileListDB.local.toCollection().primaryKeys();
  const networkKeys = await fileListDB.network.toCollection().primaryKeys();
  return [...localKeys, ...networkKeys];
}
