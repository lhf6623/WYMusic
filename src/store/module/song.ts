import { defineStore } from "pinia";
import { downloadRemoteSong, getRemoteDailySongs } from "@/api/songs";
import { deleteFile } from "@/api/local_songs";
import { versionKey } from "..";
import dayjs from "dayjs";
import AudioTool from "@/tools/AudioTool";
import { throttle } from "lodash-es";
import {
  getLocal,
  getNetwork,
  delLocal,
  putLocal,
  putNetwork,
} from "@/indexedDb/dexieTools";
import { useSettingStore } from "@/store/module/setting";
import fileListDB from "@/indexedDb/fileListDB";

// 维护所有歌曲的列表，包括本地和网络歌曲，其他歌曲列表保存 id,
export interface SongStore {
  // 本地歌曲列表 歌曲实际路径 path 值
  localList: string[];
  // 播放列表 存 path 值，如果是网络歌曲还没有 path 值那就是 id 要添加后缀来判断 id_isNetwork
  playList: string[];
  // 每日推荐 存 id
  dailyList: string[];
  // 每日推荐，一天只请求一次
  dailyListDate: string;
  /** 播放声音大小 */
  volume: number;
  /** 播放状态 */
  isPlaying: boolean;
  /** 播放进度 秒 有小数位 */
  timer: number;
  /** 当前播放歌曲信息 */
  currSongKey: string | null;
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
      localList: [],
      dailyList: [],
      playList: [],
      volume: 1,
      isPlaying: false,
      timer: 0,
      currSongKey: null,
      playLoading: false,
      audioTool: null,
    };
  },
  actions: {
    setVolume(volume: number) {
      this.volume = volume;
      this.audioTool?.volume(volume);
    },
    // 获取每日歌曲推荐
    async getDailyList() {
      if (
        this.dailyListDate == dayjs().format("YYYY-MM-DD") &&
        this.dailyList.length
      ) {
        return;
      }
      this.dailyListDate = dayjs().format("YYYY-MM-DD");
      const list = await getRemoteDailySongs();
      this.dailyList = list.map((item) => item.id);
    },
    async delSong(id: string, type: TabsType) {
      await deleteFile([id]);
      if (id == this.currSongKey) {
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

      this.localList = this.localList.filter((item) => item != id);
      await delLocal([id]);
    },
    isId(id: string) {
      return !isNaN(Number(id));
    },
    // 目标是获取 获取本地歌曲，如果本地歌曲不存在，则获取网络表中的信息
    async getSong(id: string) {
      let path = "";
      const is_id = this.isId(id);
      if (is_id) {
        const [song] = await getNetwork([id]);
        if (song && song.path) {
          path = song.path;
        } else {
          return song;
        }
      } else {
        path = id;
      }
      const song = await getLocal([path]);
      return song[0];
    },
    async linkSong(id: string) {
      const [songInfo] = await getNetwork([id]);
      if (songInfo.path) return;

      const file_name = `${songInfo.singer.join(",")}-${songInfo.name}.mp3`;
      const settingStore = useSettingStore();
      const path = await settingStore.getDefaultAudioDir(file_name);
      const is_local = this.inLocalList(path);

      if (!is_local) return;
      const file = await fileListDB.local.get(path);
      if (!file) return;
      await putNetwork([{ ...songInfo, path }]);
      const song = await putLocal([{ ...file, id }]);

      return song;
    },
    // 播放就下载
    async downSong(id: string): Promise<LocalMp3FileInfo> {
      const local_song = await this.linkSong(id);
      if (local_song) return local_song[0];

      const song = await downloadRemoteSong(id);

      this.localList.push(song.path);
      return song;
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
        this.audioTool.pause();
        return this.audioTool;
      }
      this.audioTool = new AudioTool(
        {
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
        },
        {
          onprevioustrack: () => {
            this.playNext("prev");
          },
          nexttrack: () => {
            this.playNext("next");
          },
          onseekto: (e: MediaSessionActionDetails) => {
            if (e && e.seekTime !== undefined) {
              this.setSeek(e.seekTime);
            }
          },
        }
      );
    },
    async play(id?: string) {
      this.playLoading = true;
      this.isPlaying = false;

      if (id) {
        this.clearSongInfo();
        this.currSongKey = id;
      }
      if (!this.currSongKey) {
        this.playLoading = false;
        throw new Error("播放歌曲为空");
      }
      if (id && !this.inPlayList(id)) {
        this.playList.push(id);
      }
      this.audioTool?.setSeek(this.timer);
      this.getSong(this.currSongKey).then(async (song) => {
        try {
          if (!song.path) {
            song = await this.downSong(this.currSongKey || "");
          }

          this.audioTool?.play(song as LocalMp3FileInfo).finally(() => {
            this.playLoading = false;
          });
        } catch (_e) {
          this.playLoading = false;
        }
      });
    },
    /** 清空播放信息 */
    clearSongInfo() {
      this.timer = 0;
      this.currSongKey = null;
      this.audioTool?.clearMediaSession();
      this.audioTool?.updateMediaSessionState(false);
      this.audioTool?.pause();
    },
    inPlayList(id: string | null) {
      return !!this.playList.find((item) => item == id);
    },
    inLocalList(path: string | null) {
      return !!this.localList.find((item) => item.endsWith(path || ""));
    },
    /** 删除播放列表 */
    removePlayList(ids: string | string[]) {
      const _ids = Array.isArray(ids) ? ids : [ids];

      this.playList = this.playList.filter(
        (item) => !_ids.find((id) => id == item)
      );
      const is_play_list = this.inPlayList(this.currSongKey);
      if (!is_play_list) {
        this.clearSongInfo();
      }
    },
    /** 添加到播放列表 不播放 */
    addPlayList(ids: string | string[]) {
      if (Array.isArray(ids)) {
        this.playList = ids;
      } else {
        if (this.inPlayList(ids)) return;
        this.playList.push(ids);
      }
    },
    /** 播放下一首 */
    playNext(type: "next" | "prev") {
      if (this.playList.length === 0) return;

      const index = this.playList.findIndex((id) => id == this.currSongKey);
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
