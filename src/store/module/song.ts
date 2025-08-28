import { defineStore } from "pinia";
import {
  getSongUrlV1,
  getSongInfo,
  getLyric,
  getRecommendSongs,
} from "@/tools/api_songs";
import { deleteFile, getImgBase64 } from "@/tools/api_local_songs";
import { versionKey } from "..";
import { getWebviewFilePath } from "@/tools";
import { Howl } from "howler";
import dayjs from "dayjs";
// 维护所有歌曲的列表，包括本地和网络歌曲，其他歌曲列表保存 id,
export interface SongStore {
  date: string;
  // 所有歌曲列表,维护一个列表，之后所有的请求都要存到这里
  allList: SongType[];
  // 本地歌曲列表
  localList: (string | number)[];
  // 播放列表
  playList: (string | number)[];
  // 每日推荐
  dailyList: (string | number)[];
  /** 播放声音大小 */
  volume: number;
  /** 播放状态 */
  isPlaying: boolean;
  /** 播放进度 秒 有小数位 */
  timer: number;
  /** 当前播放歌曲信息 */
  currSongId: number | string | null;
  /** 当前播放的 howl */
  howl: Howl | null;
  /** 所有的 howl 列表 TODO: 应该维护十个 */
  howlArr: {
    id: string | number;
    howl: Howl;
    /** 播放次数 */
    num: number;
  }[];
  // 点击播放时，有加载状态
  playLoading: boolean;
}
export const useSongStore = defineStore("song", {
  persist: {
    key: versionKey("song"),
    omit: ["howl", "howlArr"],
  },
  state: (): SongStore => {
    return {
      date: "",
      allList: [],
      localList: [],
      dailyList: [],
      playList: [],
      volume: 1,
      isPlaying: false,
      timer: 0,
      currSongId: null,
      howl: null,
      howlArr: [],
      playLoading: false,
    };
  },
  getters: {
    currSong: (state) => {
      return state.allList.find((item) => item.id == state.currSongId);
    },
  },
  actions: {
    setupMediaSession() {
      if ("mediaSession" in navigator && navigator.mediaSession) {
        // 播放事件处理
        navigator.mediaSession.setActionHandler("play", async () => {
          if (this.currSongId) {
            await this.play();
          }
        });

        // 暂停事件处理
        navigator.mediaSession.setActionHandler("pause", () => {
          this.pause();
        });
        // 上一首事件处理
        navigator.mediaSession.setActionHandler("previoustrack", () => {
          this.playNext("prev");
        });
        // 下一首事件处理
        navigator.mediaSession.setActionHandler("nexttrack", () => {
          this.playNext("next");
        });
        // 调整进度条事件处理
        navigator.mediaSession.setActionHandler("seekto", (details) => {
          if (details && details.seekTime !== undefined) {
            this.setSeek(details.seekTime);
          }
        });

        // 设置默认的播放状态
        navigator.mediaSession.playbackState = "none";
      }
    },
    // 更新媒体会话状态
    updateMediaSessionState(playing: boolean) {
      if ("mediaSession" in navigator && navigator.mediaSession) {
        navigator.mediaSession.playbackState = playing ? "playing" : "paused";
      }
    },
    // 更新媒体元数据
    async updateMediaMetadata(song: SongType) {
      if (
        "mediaSession" in navigator &&
        navigator.mediaSession &&
        "MediaMetadata" in window
      ) {
        try {
          const metadata = new (window as any).MediaMetadata({
            title: song.name,
            artist: song.singer.join(", "),
            album: "WYMusic",
            artwork: [
              {
                src: await getImgBase64(song.id.toString()),
                sizes: "1000x1000",
                type: "image/jpeg",
              },
            ],
          });
          navigator.mediaSession.metadata = metadata;
        } catch (error) {
          console.warn("更新媒体元数据失败:", error);
        }
      }
    },
    // 获取每日歌曲推荐
    async getDailyList() {
      if (this.date == dayjs().format("YYYY-MM-DD") && this.dailyList.length)
        return;
      this.date = dayjs().format("YYYY-MM-DD");
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
      // 删除 howlArr 中的歌曲
      this.howlArr = this.howlArr.filter((item) => item.id != id);
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
    stop() {
      this.howlArr.forEach((item) => {
        item.howl.stop();
      });
      this.updateMediaSessionState(false);
    },
    /** 暂停 */
    pause() {
      this.howl && this.howl.pause();
      this.updateMediaSessionState(false);
    },
    /** 设置播放进度 */
    setSeek(num: number) {
      this.timer = num;
      if (this.howl) {
        this.howl.seek(num);
      }
    },
    addHowl(song: SongType, howl: Howl) {
      const howlInfo = this.howlArr.find((item) => item.id == song.id);
      if (howlInfo) {
        howlInfo.num += 1;
        // 如果有的话就更新，发现应用长时间挂起，播放声音会没有
        howlInfo.howl = howl;
      } else {
        if (this.howlArr.length >= 10) {
          // 移除播放次数最少的, 如果有多个最少的, 移除第一个
          const minNum = this.howlArr.reduce((pre, cur) => {
            return pre.num < cur.num ? pre : cur;
          }).num;
          const index = this.howlArr.findIndex((item) => item.num == minNum);
          if (index != -1) {
            this.howlArr.splice(index, 1);
          }
        }
        this.howlArr.push({
          id: song.id,
          howl,
          num: 1,
        });
      }
    },
    getHowl(id: number | string) {
      const howlInfo = this.howlArr.find((item) => item.id == id);
      if (howlInfo) {
        howlInfo.num += 1;
      }
      return howlInfo?.howl;
    },
    /** 初始化 howl */
    initHowl(src: string, song: SongType) {
      this.isPlaying = false;
      const howl = new Howl({
        src: src,
        html5: true,
        onplay: () => {
          this.isPlaying = this.howl!.playing();
          this.playLoading = false;
          this.updateMediaSessionState(true);
          // 更新播放时间
          requestAnimationFrame(this.step.bind(this));
        },
        onend: () => {
          howl.stop();
          this.playNext("next");
        },
        onpause: () => {
          this.isPlaying = false;
        },
        onstop: () => {
          this.isPlaying = false;
        },
        onseek: () => {
          requestAnimationFrame(this.step.bind(this));
        },
      });
      this.addHowl(song, howl);
      howl.volume(this.volume);
      howl.seek(this.timer);
      return howl;
    },
    /** 播放进度 */
    step() {
      const self = this;
      this.timer = self.howl?.seek() || 0;
      if (self.howl?.playing()) {
        requestAnimationFrame(self.step.bind(self));
      }
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
      this.howl = this.getHowl(this.currSongId)!;
      if (
        !this.howl ||
        (this.howl.state() !== "loaded" && this.howl.state() !== "loading")
      ) {
        const src = await getWebviewFilePath(song);
        this.howl = this.initHowl(src!, song);
      }
      this.howl.volume(this.volume);

      if (id && !this.inPlayList(id)) {
        this.playList.push(id);
      }
      this.howl!.play();
      this.updateMediaMetadata(song); // 设置播放状态
    },
    /** 清空播放信息 */
    clearSongInfo() {
      if (this.howl) {
        this.howl.stop();
      }
      this.timer = 0;
      this.currSongId = null;
      this.howl = null;
    },
    inPlayList(id: number | string | null) {
      return !!this.playList.find((item) => item == id);
    },
    /** 删除播放列表 */
    removePlayList(ids: number | string | (number | string)[]) {
      const _ids = Array.isArray(ids) ? ids : [ids];

      this.playList = this.playList.filter(
        (item) => !_ids.find((id) => id == item)
      );
      if (this.currSong && _ids.find((item) => item == this.currSong?.id)) {
        this.clearSongInfo();
      }
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
      this.stop();
      this.timer = 0;
      this.play(this.playList[nextIndex]);
    },
  },
});
