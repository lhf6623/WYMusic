import { defineStore } from "pinia";
import {
  getSongUrlV1,
  getSongInfo,
  getLyric,
  getRecommendSongs,
} from "@/tools/api_songs";
import { deleteFile } from "@/tools/api_local_songs";
import { versionKey } from "..";
import dayjs from "dayjs";
import AudioTool from "@/tools/AudioTool";
import { throttle } from "lodash-es";

// 维护所有歌曲的列表，包括本地和网络歌曲，其他歌曲列表保存 id,
export interface SongStore {
  // 所有歌曲列表,维护一个列表，之后所有的请求都要存到这里
  allList: SongType[];
  // 本地歌曲列表
  localList: (string | number)[];
  // 播放列表
  playList: (string | number)[];
  // 每日推荐
  dailyList: (string | number)[];
  // 每日推荐，一天只请求一次
  dailyListDate: string;
  /** 播放声音大小 */
  volume: number;
  /** 播放状态 */
  isPlaying: boolean;
  /** 播放进度 秒 有小数位 */
  timer: number;
  /** 当前播放歌曲信息 */
  currSongId: number | string | null;
  // 点击播放时，有加载状态
  playLoading: boolean;
  /** 音频工具 */
  audioTool: AudioTool | null;
}
export const useSongStore = defineStore("song", {
  persist: {
    key: versionKey("song"),
    omit: ["audioTool"],
  },
  state: (): SongStore => {
    return {
      dailyListDate: "",
      allList: [],
      localList: [],
      dailyList: [],
      playList: [],
      volume: 1,
      isPlaying: false,
      timer: 0,
      currSongId: null,
      playLoading: false,
      audioTool: null,
    };
  },
  getters: {
    currSong: (state) => {
      return state.allList.find((item) => item.id == state.currSongId);
    },
  },
  actions: {
    // 获取每日歌曲推荐
    async getDailyList() {
      if (
        this.dailyListDate == dayjs().format("YYYY-MM-DD") &&
        this.dailyList.length
      )
        return;
      this.dailyListDate = dayjs().format("YYYY-MM-DD");
      const list = await getRecommendSongs();
      this.updateAllList(list);
      this.dailyList = list.map((item) => item.id);
    },
    updateAllList(songList: SongType[]) {
      songList.forEach((item) => {
        const songIndex = this.allList.findIndex((song) => song.id == item.id);
        if (songIndex > -1) {
          this.allList[songIndex] = {
            ...this.allList[songIndex],
            ...item,
          };
        } else {
          this.allList.push(item);
        }
      });
    },
    async delSong(id: string | number, type: TabsType) {
      await deleteFile(id);
      if (id == this.currSongId) {
        this.clearSongInfo();
      }
      // 删除播放列表中的歌曲
      if (type == "playList") {
        this.playList = this.playList.filter((item) => item != id);
      }
      // 删除每日推荐中的歌曲
      if (type == "dailyList") {
        this.dailyList = this.dailyList.filter((item) => item != id);
      }

      this.allList = this.allList.filter((item) => item.id != id);
      this.localList = this.localList.filter((item) => item != id);
    },
    async downSong(id: string | number) {
      const song = this.allList.find((song) => song.id == id);
      if (!song?.img) {
        // 如果没有图片，就从网络下载
        const songInfo = await getSongInfo(id);
        this.updateAllList(songInfo);
      }
      if (!song?.lyric) {
        await getLyric(id);
      }
      if (!song?.mp3) {
        await getSongUrlV1(id);
      }
      if (!song?.lyric || !song?.mp3 || !song?.img) {
        const songInfo = await getSongInfo(id);
        this.updateAllList(songInfo);
      }
      return this.allList.find((item) => item.id == id)!;
    },
    /** 暂停 */
    pause() {
      this.audioTool && this.audioTool.pause();
    },
    /** 设置播放进度 */
    setSeek(num: number) {
      this.timer = num;
      this.audioTool && this.audioTool.setSeek(num);
    },
    async initAudioTool() {
      if (this.audioTool) {
        return this.audioTool;
      }
      this.audioTool = new AudioTool({
        onplay: () => {
          this.isPlaying = true;
          this.playLoading = false;
        },
        onpause: () => {
          this.isPlaying = false;
        },
        onended: () => {
          this.isPlaying = false;
        },
        ontimeupdate: throttle(() => {
          if (this.audioTool?.audio) {
            this.timer = this.audioTool.audio.currentTime || 0;
            this.audioTool.currentTime = this.timer;

            if (this.timer >= this.audioTool.audio.duration) {
              this.playNext("next");
            }
          }
        }, 800),
      });
      // audio 事件初始化，
      this.audioTool.initMediaSession({
        onprevioustrack: () => {
          this.playNext("prev");
        },
        nexttrack: () => {
          this.playNext("next");
        },
        onseekto: throttle((e: MediaSessionActionDetails) => {
          if (e && e.seekTime !== undefined) {
            this.setSeek(e.seekTime);
          }
        }, 300),
      });
    },
    async play(id?: number | string) {
      this.playLoading = true;
      if (id) {
        this.clearSongInfo();
        this.currSongId = id;
      }
      if (!this.currSongId) {
        this.playLoading = false;
        throw new Error("播放歌曲为空");
      }
      const song = await this.downSong(this.currSongId);

      if (id && !this.inPlayList(id)) {
        this.playList.push(id);
      }
      this.audioTool?.setSeek(this.timer);
      this.audioTool?.play(song);
      this.playLoading = false;
    },
    /** 清空播放信息 */
    clearSongInfo() {
      this.timer = 0;
      this.currSongId = null;
      this.audioTool?.clearMediaSession();
      this.audioTool?.updateMediaSessionState(false);
      this.audioTool?.pause();
    },
    inPlayList(id: number | string | null) {
      return !!this.playList.find((item) => item == id);
    },
    /** 删除播放列表 */
    removePlayList(ids: number | string | (number | string)[]) {
      const _ids = Array.isArray(ids) ? ids : [ids];
      if (this.currSong && _ids.find((item) => item == this.currSong?.id)) {
        this.clearSongInfo();
      }
      this.playList = this.playList.filter(
        (item) => !_ids.find((id) => id == item)
      );
    },
    /** 添加到播放列表 不播放 */
    addPlayList(ids: number | string | (number | string)[]) {
      if (Array.isArray(ids)) {
        this.playList = ids;
      } else {
        if (this.inPlayList(ids)) return;
        const song = this.playList.find((item) => item == ids);
        if (song) {
          this.playList.push(ids);
        }
      }
    },
    /** 播放下一首 */
    playNext(type: "next" | "prev") {
      if (this.playList.length === 0) return;

      const index = this.playList.findIndex((id) => id == this.currSongId);
      if (index === -1) return;

      let nextIndex = index + (type === "next" ? 1 : -1);

      if (nextIndex < 0) {
        nextIndex = this.playList.length - 1;
      }
      if (nextIndex >= this.playList.length) {
        nextIndex = 0;
      }
      this.timer = 0;
      this.play(this.playList[nextIndex]);
    },
  },
});
