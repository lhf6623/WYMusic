import { musicApi } from "@/tools/request";
import {
  downloadFile,
  downloadImages,
  getSongs,
} from "@/tools/api_local_songs";
import { getSongName } from "./index";
import { SongDetail } from "NeteaseCloudMusicApi";

async function getList(songList: SongDetail[]) {
  const ids = songList.map((item) => item.id);
  const songs = await getSongs(ids.join(","));

  const remoteSongs = songList.filter((item) => {
    const song = songs.find((song) => song.id == item.id);
    return !song;
  });

  let songInfo: SongType[] = [];
  if (remoteSongs.length > 0) {
    const data = remoteSongs.map((item) => {
      const { id, name, ar, al, dt } = item;
      const song = {
        id: id.toString(),
        name,
        singer: ar.map((item) => item.name),
        dt,
        img: al.picUrl.replace("http://", "https://"),
      };
      songInfo.push(song);
      return {
        id: id.toString(),
        url: al.picUrl.replace("http://", "https://"),
        name: getSongName(song, "jpg"),
      };
    });
    // 在后台静默下载图片
    downloadImages(data);
  }

  return [...songs, ...songInfo];
}

// 先在本地查询是否存在，如果没有就去请求远程，再保存在本地，返回本地的资源

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
  return await getList(res.result.songs);
}

/**获取每日推荐歌曲列表*/
export async function getRecommendSongs(
  controller?: AbortController
): Promise<SongType[]> {
  const res = await musicApi<{ data: { dailySongs: SongDetail[] } }>({
    key: "recommend_songs",
    controller,
  });
  return await getList(res.data.dailySongs);
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
  // 查询本地是否有歌曲，可能得到部分歌曲信息，其他需要从网络查询
  const songs = await getSongs(ids);

  const id_arr = ids.split(",");
  if (songs.length === id_arr.length) return songs;

  const local_ids = songs.map((item) => item.id);
  const remote_ids = id_arr.filter((item) => !local_ids.includes(item));

  const res = await musicApi({
    key: "song_detail",
    args: {
      ids: remote_ids.join(","),
      timestamp: Date.now(),
    },
    controller,
  });
  const body = res as unknown as {
    code: number;
    songs: SongDetail[];
  };
  const newSongInfo = await Promise.all(
    body.songs.map(async (item) => {
      const { id, name, ar, al, dt } = item;
      return await downloadFile(
        {
          mp3_url: "",
          image_url: al.picUrl,
          text: "",
        },
        getSongName({
          id,
          name,
          singer: ar.map((item) => item.name),
          dt,
        })
      );
    })
  );

  songs.push(...newSongInfo);
  return songs;
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
  id: string | number,
  level: Level = "standard"
) {
  // 这里应该是有 歌曲信息的，但是没有 mp3 地址
  const songs = await getSongs(id.toString());
  if (songs.length && songs[0]?.mp3) {
    return songs[0].mp3;
  }

  // 只提示，不做阻拦
  const check_music = await checkMusic(id);
  if (!check_music.success) {
    window.$message.error(check_music.message);
  }
  const res = await musicApi({
    key: "song_url_v1",
    args: {
      id: id,
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
  const song = await downloadFile(
    {
      mp3_url: body.data[0].url.replace("http://", "https://"),
      image_url: null,
      text: null,
    },
    getSongName(songs[0])
  );

  return song.mp3;
}

/** 获取歌词 */
export async function getLyric(id: string | number) {
  // 这里应该是有 歌曲信息的，但是没有 mp3 地址
  const songs = await getSongs(id.toString());

  if (songs.length && songs[0].lyric) {
    return songs[0].lyric;
  }
  const lyric = await musicApi<{
    lrc: {
      lyric: string;
    };
  }>({
    key: "lyric",
    args: {
      id: id,
    },
  });

  const songInfo = await downloadFile(
    {
      mp3_url: null,
      image_url: null,
      text: lyric.lrc.lyric,
    },
    getSongName(songs[0])
  );
  return songInfo;
}
