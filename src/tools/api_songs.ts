import { musicApi } from "@/tools/request";
import { invoke } from "@tauri-apps/api/core";

export type SongDetail = {
  name: string; // 歌曲标题
  id: number;
  ar: Array<{
    // 歌手列表
    alias: Array<string>;
    id: number;
    name: string;
  }>;
  alia: Array<string>; // 别名列表，第一个别名会被显示作副标题
  fee: 0 | 1 | 4 | 8; // 0: 免费或无版权 1: vip歌曲 4: 购买专辑 8: 非会员可免费播放低音质，会员可播放高音质及下载
  dt: number; // 歌曲时长
  al: {
    id: number;
    name: string;
    picUrl: string;
  };
  tns: string[];
};

/**搜索歌曲 */
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
  const song_list = res.result.songs.map((item) => ({
    id: item.id,
    name: item.name,
    singer: item.ar.map((item) => item.name),
    picUrl: item.al.picUrl,
    dt: item.dt,
  }));

  return song_list;
}
/**红心与取消红心歌曲 */
export async function like(id: number | string, like: "false" | "true") {
  return await musicApi<{
    code: number;
    playlistId: number;
    songs: number[];
  }>({
    key: "like",
    args: { id, like },
  });
}
/** 获取喜欢歌曲列表 id */
export async function getlikeList(controller?: AbortController) {
  const { ids } = await musicApi<{
    ids: number[];
  }>({
    key: "likelist",
    controller,
  });

  return ids;
}

/**获取每日推荐歌曲列表*/
export async function getRecommendSongs(
  controller?: AbortController
): Promise<SongType[]> {
  const res = await musicApi<{ data: { dailySongs: SongDetail[] } }>({
    key: "recommend_songs",
    controller,
  });
  const song_list = res.data.dailySongs.map((item) => ({
    id: item.id,
    name: item.name,
    singer: item.ar.map((item) => item.name),
    picUrl: item.al.picUrl,
    dt: item.dt,
  }));
  return song_list || [];
}
/**
 * 获取歌曲详情，id可以是 123,123,234,345,456 这种形式
 * @param id 歌曲ID
 * @returns {Array<SongDetail>} 不管是单个还是多个ID查询，返回的都是数组
 */
export async function getSongInfo(
  id: number | string,
  controller?: AbortController
): Promise<SongType[]> {
  const ids = id.toString();
  const res = await musicApi({
    key: "song_detail",
    args: {
      ids: ids,
      timestamp: Date.now(),
    },
    controller,
  });
  const body = res as unknown as {
    code: number;
    songs: SongDetail[];
  };

  const song_list = body.songs.map((item) => ({
    id: item.id,
    name: item.name,
    singer: item.ar.map((item) => item.name),
    picUrl: item.al.picUrl,
    dt: item.dt,
  }));
  return song_list;
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
/** 获取播放地址 */
export async function getSongUrlV1(
  id: number | string,
  level: Level = "standard"
) {
  const res = await musicApi({
    key: "song_url_v1",
    args: {
      id,
      level,
      timestamp: Date.now(),
    },
  });

  const body = res as unknown as {
    code: number;
    data: Array<{
      url: string;
      id: number;
    }>;
  };
  return body.data[0].url.replace("http://", "https://");
}

/**歌曲播放链接 */
export async function getSongUrl(id: number | string) {
  const songUrl = await musicApi<{
    data: {
      url: string;
    }[];
  }>({
    key: "song_url",
    args: {
      id,
    },
  });

  return songUrl.data[0].url;
}
/** 根据url 下载文件 */
export async function downloadFile(
  resources: {
    mp3_url: string;
    image_url: string;
    text: string;
  },
  filename: string
) {
  try {
    const song = await invoke<{
      id: string | number;
      name: string;
      singer: string[];
      pic_url: string;
      dt: number;
    }>("download_file", {
      resources,
      filename,
    });
    const { id, name, singer, pic_url, dt } = song;
    return {
      id,
      name,
      singer,
      picUrl: pic_url,
      dt,
    };
  } catch (error) {
    console.error("下载失败:", error);
    throw error;
  }
}
/** 获取本地所有MP3文件信息 */
export async function getLocalAllSongs(): Promise<SongType[]> {
  const song_list = await invoke<
    {
      id: string | number;
      name: string;
      singer: string[];
      pic_url: string;
      dt: number;
    }[]
  >("get_local_songs");
  return song_list.map((item) => {
    const { pic_url, ...data } = item;
    return {
      ...data,
      picUrl: item.pic_url,
    };
  });
}

/** 获取歌词 */
export async function getLyric(id: number | string) {
  const lyric = await musicApi<{
    lrc: {
      lyric: string;
    };
  }>({
    key: "lyric",
    args: {
      id,
    },
  });
  return lyric.lrc.lyric;
}

/** 根据 id 获取本地歌曲信息 */
export async function getLocalSongInfo(idstr: string) {
  const list = await invoke<
    {
      id: string | number;
      name: string;
      singer: string[];
      pic_url: string;
      dt: number;
    }[]
  >("get_song_list", { idstr });

  return list.map((item) => {
    const { pic_url, ...data } = item;
    return {
      ...data,
      picUrl: item.pic_url,
    };
  });
}

/** 获取本地 text 歌词文本 */
export async function getLocalLyric(id: string) {
  return await invoke<string>("get_lyric", { id });
}

/** 删除本地文件 */
export async function deleteFile(id: string | number) {
  return await invoke<string>("delete_file", { id: id.toString() });
}
