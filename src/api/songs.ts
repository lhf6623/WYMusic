import { musicApi } from "@/tools/request";
import { downloadFile } from "@/api/local_songs";
import {
  updateNetwork,
  getNetwork,
  putLocal,
  putNetwork,
} from "@/indexedDb/dexieTools";

export async function search(keywords: string, controller?: AbortController) {
  const res = await musicApi<{
    result: {
      songs: SongDetail[];
    };
  }>({
    key: "cloudsearch",
    controller,
    args: { keywords },
  });
  return await updateNetwork(res.result.songs);
}

/**获取每日推荐歌曲列表*/
export async function getRemoteDailySongs(): Promise<NetworkMp3FileInfo[]> {
  const res = await musicApi<{ data: { dailySongs: SongDetail[] } }>({
    key: "recommend_songs",
  });

  return await updateNetwork(res.data.dailySongs);
}
/**
 * 获取歌曲详情
 * @param id 歌曲ID
 * @returns {Array<NetworkMp3FileInfo>} 不管是单个还是多个ID查询，返回的都是数组
 */
export async function getRemoteSongs(
  ids: string[]
): Promise<NetworkMp3FileInfo[]> {
  const songs = await getNetwork(ids);
  if (songs.length === ids.length) return songs;

  const localKeys = songs.map((item) => item.id);
  const remoteKeys = ids.filter((item) => !localKeys.includes(item));

  const res = await musicApi<{ songs: SongDetail[] }>({
    key: "song_detail",
    args: {
      ids: remoteKeys.join(","),
      timestamp: Date.now(),
    },
  });

  return await updateNetwork(res.songs);
}
/** 音乐是否可用 */
export async function checkMusic(id: number | string) {
  return await musicApi<{ success: boolean; message: string }>({
    key: "check_music",
    args: { id },
  });
}
// standard => 标准,higher => 较高, exhigh=>极高, lossless=>无损, hires=>Hi-Res, jyeffect => 高清环绕声, sky => 沉浸环绕声, jymaster => 超清母带
type Level =
  | "standard"
  | "higher"
  | "exhigh"
  | "lossless"
  | "hires"
  | "jyeffect"
  | "sky"
  | "jymaster";

/**
 * 下载远程 mp3 歌词 到本地
 * @param key 歌曲ID
 * @param level 歌曲质量
 * @returns 本地歌曲信息
 */
export async function downloadRemoteSong(
  id: string,
  level: Level = "standard"
): Promise<LocalMp3FileInfo> {
  const [song] = await getNetwork([id]);
  // 这里应该是有 歌曲信息的，但是没有 mp3 地址

  // const check_music = await checkMusic(key);

  // if (!check_music.success) {
  //   window.$message.error(check_music.message);
  // }
  const res = await musicApi<{
    data: Array<{
      url: string;
      id: number;
    }>;
  }>({
    key: "song_url_v1",
    args: {
      id: song.id,
      level,
      timestamp: Date.now(),
    },
  });

  const lrc = await musicApi<{
    lrc: {
      lyric: string;
    };
  }>({
    key: "lyric",
    args: {
      id: song.id,
    },
  });
  const lyric = lrc.lrc.lyric;

  const mp3Data = await downloadFile({
    id: song.id,
    name: song.name,
    singer: song.singer,
    dt: song.dt,
    album: song.album,
    path: res.data[0].url.replace("http://", "https://"),
    img: song.img,
    lrc: lyric,
  });

  putLocal([mp3Data]);
  putNetwork([
    {
      ...song,
      path: mp3Data.path,
      id,
      lastAccessTime: Date.now(),
    },
  ]);
  return mp3Data;
}
