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
import { useSettingStore } from "./setting";
import { Howl } from "howler";

export interface SongStore {
  /** 请求时间,避免刷新后重复请求 */
  date: string | null;
  localList: SongType[];
  likeList: SongType[];
  playList: SongType[];
  /** 下载中 id 列表，主要做请求中状态展示 */
  downloadList: (string | number)[];
  /** 播放声音大小 */
  volume: number;
  /** 播放状态 */
  isPlaying: boolean;
  /** 播放进度 秒 有小数位 */
  timer: number;
  /** 歌词 */
  lyric: string;
  /** 当前播放歌曲信息 */
  song: SongType | null;
  /** 当前播放的 howl */
  howl: Howl | null;
  /** 所有的 howl 列表 TODO: 应该维护十个 */
  howl_arr: {
    id: string | number;
    howl: Howl;
  }[];
}
export const useSongStore = defineStore("song", {
  persist: {
    key: versionKey("song"),
    omit: ["howl", "howl_arr"],
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
      timer: 0,
      lyric: "",
      song: null,
      howl: null,
      howl_arr: [],
    };
  },
  actions: {
    stop() {
      this.howl_arr.forEach((item) => {
        item.howl.stop();
      });
    },
    /** 暂停 */
    pause() {
      this.howl && this.howl.pause();
    },
    /** 设置播放进度 */
    setSeek(num: number) {
      this.timer = num;
      if (this.howl) {
        this.howl.seek(num);
      }
    },
    /** 初始化 howl */
    initHowl(src: string, song: SongType) {
      this.isPlaying = false;
      const howl = new Howl({
        src: src,
        onplay: () => {
          this.isPlaying = this.howl!.playing();
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
      this.howl_arr.unshift({
        id: song.id,
        howl,
      });
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
    async play(song?: SongType) {
      if (song) {
        this.clearSongInfo();
        this.song = song;
      }
      if (this.howl) {
        this.howl.play();
      } else {
        if (!this.song) throw new Error("没有歌曲信息");
        const currHowlInfo = this.howl_arr.find(
          ({ id }) => id == this.song!.id
        );
        if (currHowlInfo) {
          this.howl = currHowlInfo.howl;
          this.howl.play();
        } else {
          const src = await this.getCurrentSongInfo(this.song);
          this.howl = this.initHowl(src, this.song);
          setTimeout(() => {
            this.howl!.play();
          }, 500);
        }
      }
    },
    /** 清空播放信息 */
    clearSongInfo() {
      if (this.howl) {
        this.howl.stop();
      }
      this.timer = 0;
      this.song = null;
      this.lyric = "";
      this.howl = null;
    },
    /** 当前播放音乐的信息 */
    async getCurrentSongInfo(song?: SongType) {
      if (!song) {
        this.clearSongInfo();
        return "";
      }
      if (song.id != this.song?.id) {
        this.song = { ...song };
      }
      // 歌词
      this.getLyric(song).then((lyric) => {
        if (song.id == this.song?.id) {
          this.lyric = lyric;
        }
      });
      // 播放地址
      return await this.getAudioSrc(song)!;
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
        this.clearSongInfo();
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
      this.stop();
      this.timer = 0;
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
