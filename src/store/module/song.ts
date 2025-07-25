import { defineStore } from "pinia";
import {
  downloadFile,
  getLocalAllSongs,
  getSongUrlV1,
  like,
  getlikeList,
  getSongInfo,
  getLyric,
  checkMusic,
  deleteFile,
  getLocalLyric,
} from "@/tools/api_songs";
import { versionKey } from "..";
import dayjs from "dayjs";
import { getSongName } from "@/tools";
import { throttle } from "lodash-es";
import { useSettingStore } from "./setting";

export interface SongStore {
  /** 请求时间 */
  date: string | null;
  /** 下载在本地的歌曲列表 */
  localList: SongType[];
  /** 喜欢列表 */
  likeList: SongType[];
  /** 播放列表 */
  playList: SongType[];
  /** 播放声音大小 */
  volume: number;
  /** 播放状态 */
  isPlaying: boolean;
  /** 播放进度 */
  currentTime: number;
  /** Audio 实例 */
  audio: HTMLAudioElement | null;
  /** 展示歌词 */
  showLyric: boolean;
  controller: AbortController | null;
  /** 播放地址 */
  src: string | null;
  /** 歌词 */
  lyric: string;
  /** 当前播放歌曲信息 */
  song: SongType | null;
  /** 下载中 id 列表 */
  downloadList: (string | number)[];
}
export const useSongStore = defineStore("song", {
  persist: {
    key: versionKey("song"),
    omit: ["audio", "controller"],
  },
  state: (): SongStore => {
    return {
      date: null,
      localList: [],
      likeList: [],
      playList: [],
      downloadList: [],
      volume: 0.33,
      isPlaying: false,
      currentTime: 0,
      audio: null,
      showLyric: true,
      controller: null,
      src: null,
      lyric: "",
      song: null,
    };
  },
  actions: {
    initAudio() {
      if (this.audio || this.controller) {
        this.controller && this.controller.abort();
      }
      this.audio = new Audio();
      window.$audio = this.audio;
      this.controller = new AbortController();
      this.setupEventListeners();
      this.initPlayState();
    },
    destroy() {
      if (this.audio) {
        this.audio.pause();
      }
      this.controller && this.controller.abort();
      this.audio = null;
      window.$audio = null;
      this.controller = null;
    },
    /** 初始化播放状态 */
    initPlayState() {
      if (!this.audio) return;
      if (!this.audio.paused) {
        this.audio.pause();
      }
      this.src = null;
      this.audio.currentTime = 0;
      this.audio.crossOrigin = "anonymous";
      this.currentTime = 0;
      this.isPlaying = false;
      this.audio.volume = this.volume;
    },
    pause() {
      if (this.audio) {
        this.audio.pause();
        this.isPlaying = false;
      }
    },
    setCurrentTime(num: number) {
      this.audio!.currentTime = num;
      this.currentTime = num;
    },
    async play(song?: SongType) {
      if (song) {
        await this.getCurrentSongInfo(song);
      }
      if (!this.src && this.song) {
        await this.getCurrentSongInfo(this.song);
      }

      this.audio!.play();
    },
    setupEventListeners() {
      if (!this.audio || !this.controller) return;
      const audio = this.audio;
      const opt = {
        signal: this.controller.signal,
      };
      audio.addEventListener(
        "canplaythrough",
        () => {
          this.audio!.currentTime = this.currentTime;
        },
        opt
      );
      audio.addEventListener(
        "play",
        () => {
          this.isPlaying = true;
        },
        opt
      );
      audio.addEventListener(
        "pause",
        () => {
          this.isPlaying = false;

          // 一些网络歌曲是 VIP 歌曲，播放时长和歌曲时长是不同的，这些歌曲播放完后提示一个 VIP
          if (this.audio) {
            const mp3_dt = this.song?.dt || 0;
            const self_dt = this.audio.duration;

            if (
              this.audio.currentTime == this.audio.duration &&
              mp3_dt - self_dt > 5 &&
              (((this.song?.dt || 0) / 1000) | 0) !== (this.audio.duration | 0)
            ) {
              window.$message.warning("vip 歌曲");
            }
          }
        },
        opt
      );
      const self = this;
      audio.addEventListener(
        "timeupdate",
        throttle(function () {
          self.currentTime = audio.currentTime || 0;
          if (
            self.currentTime >= (self.song?.dt || 0) / 1000 - 1 &&
            self.isPlaying
          ) {
            self.playNext("next");
          }
        }, 1000)
      );
      audio.addEventListener(
        "error",
        (e) => {
          this.isPlaying = false;
          console.log("audio addEventListener error", e);
        },
        opt
      );
    },
    /** 当前播放音乐的信息 */
    async getCurrentSongInfo(song?: SongType) {
      if (!song) {
        this.lyric = "";
        this.song = null;
        this.initPlayState();
        return;
      }
      if (song.id != this.song?.id) {
        this.song = { ...song };
      }
      this.initPlayState();
      // 播放地址
      await this.getAudioSrc(song).then((src) => {
        if (song.id == this.song?.id) {
          this.src = src;
          this.audio!.src = src;
        }
      });
      // 歌词
      this.getLyric(song).then((lyric) => {
        if (song.id == this.song?.id) {
          this.lyric = lyric;
        }
      });
    },
    inPlayList(song: SongType | null) {
      return !!this.playList.find((item) => item.id == song?.id);
    },
    /** 根据 id  判断是否是已下载歌曲 */
    isLocal(song: SongType | null) {
      return !!this.localList.find((item) => item.id == song?.id);
    },
    isLike(song: SongType | null) {
      return !!this.likeList.find((item) => item.id == song?.id);
    },
    /** 删除播放列表 */
    removePlayList(songs: SongType | SongType[]) {
      const ids = Array.isArray(songs)
        ? songs.map((item) => item.id)
        : [songs.id];

      this.playList = this.playList.filter(
        (item) => !ids.find((id) => id == item.id)
      );
      if (this.song && ids.find((item) => item == this.song?.id)) {
        this.getCurrentSongInfo();
      }
    },
    /** 添加到播放列表 不播放 */
    addPlayList(songs: SongType | SongType[]) {
      if (Array.isArray(songs)) {
        this.playList = songs.map((item) => {
          const song = this.localList.find(({ id }) => id == item.id);
          return song ?? item;
        });
      } else {
        if (this.inPlayList(songs)) return;
        const song = this.localList.find(({ id }) => id == songs.id);
        this.playList = [song ?? songs, ...this.playList];
      }
    },
    /** 获取歌曲信息, 请求远程的会把远程歌曲添加到远程歌曲列表 */
    async getSongInfo(
      ids: (string | number)[] | string | number
    ): Promise<SongType[]> {
      if (!ids) throw new Error("ids is required");

      const _ids = Array.isArray(ids) ? ids : [ids];
      let local_list = this.localList.filter((item) =>
        _ids.find((id) => id == item.id)
      );

      let remote_ids = _ids.filter(
        (id) => !this.localList.find((item) => item.id == id)
      );

      if (!remote_ids.length) local_list;

      const remote_list = await getSongInfo(remote_ids.join(","));

      return _ids.map((id) => {
        const remote = remote_list.find((item) => item.id == id);
        if (remote) {
          return remote;
        }
        return local_list.find((item) => item.id == id)!;
      });
    },
    /** 播放下一首 */
    playNext(type: "next" | "prev") {
      if (this.playList.length === 0) return;

      const index = this.playList.findIndex((song) => song.id == this.song?.id);
      if (index === -1) return;

      let nextIndex = index + (type === "next" ? 1 : -1);

      if (nextIndex < 0) {
        nextIndex = this.playList.length - 1;
      }
      if (nextIndex >= this.playList.length) {
        nextIndex = 0;
      }
      this.play(this.playList[nextIndex]);
    },
    /** 获取播放地址 */
    async getAudioSrc(song: SongType) {
      if (this.isLocal(song)) {
        const settingStore = useSettingStore();
        return await settingStore.getWebviewFilePath(
          song.picUrl.replace(".jpg", ".mp3")
        );
      }
      return await getSongUrlV1(song.id.toString());
    },
    /** 获取歌词 */
    async getLyric(song: SongType) {
      if (this.isLocal(song)) {
        return await getLocalLyric(song.id.toString());
      }
      return await getLyric(song.id);
    },
    /** 删除本地文件 */
    async deleteFile(id: number | string) {
      // 删除本地
      this.localList = this.localList.filter((item) => item.id != id);
      await deleteFile(id).catch(console.error);
      // 删除后添加到远程列表
      const song = await this.getSongInfo(id);
      if (this.song?.id == id) {
        this.getCurrentSongInfo(song[0]);
      }
      return song[0];
    },
    /** 下载网络歌曲到本地 */
    async download(song: SongType) {
      if (this.isLocal(song)) return null;
      this.downloadList.push(song.id);

      const data = await checkMusic(song.id);
      if (!data.success) {
        window.$message.error(data.message);
        this.downloadList = this.downloadList.filter((id) => id != song.id);
        return null;
      }

      const url = await getSongUrlV1(song.id);
      const text = await getLyric(song.id);
      const local_song = await downloadFile(
        {
          mp3_url: url,
          image_url: song.picUrl,
          text,
        },
        getSongName(song)
      );

      this.localList.push(local_song);
      if (this.song?.id == local_song.id) {
        this.getCurrentSongInfo(local_song);
      }
      this.downloadList = this.downloadList.filter((id) => id != song.id);
      return local_song;
    },
    /** 获取本地所有歌曲信息列表 */
    async getLoaclMp3Info() {
      return await getLocalAllSongs().then((localList) => {
        this.localList = localList;
      });
    },
    /** 获取喜欢歌曲信息 */
    async getlikeList() {
      if (this.date === dayjs().format("YYYY-MM-DD") && this.likeList.length) {
        return;
      }
      const like_ids = await getlikeList();

      this.likeList = await this.getSongInfo(like_ids);

      this.date = dayjs().format("YYYY-MM-DD");
    },
    /** 喜欢歌曲 */
    async likeSong(song: SongType) {
      const flag = !this.likeList.find((item) => item.id == song.id)
        ? "true"
        : "false";
      await like(song.id, flag).then((res) => {
        if (res.code === 200) {
          this.likeList.push(song);
        } else {
          this.likeList = this.likeList.filter((item) => item.id !== song.id);
        }
      });
    },
  },
});
