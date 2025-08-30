// 都是本地文件，加载很快

import { getURL, getWebviewFilePath } from ".";

type AudioToolOpt = {
  /** 播放事件 */
  onplay: () => void;
  /** 暂停事件 */
  onpause: () => void;
  /** 结束事件 */
  onended: () => void;
  /** 进度更新事件 */
  ontimeupdate: (e: Event) => void;
};
type MediaSessionOpt = {
  onprevioustrack: () => void;
  nexttrack: () => void;
  onseekto: (e: MediaSessionActionDetails) => void;
};
export default class AudioTool {
  private opt: AudioToolOpt;
  audio: HTMLAudioElement | null = null;
  cacheURL: string = "";
  currentTime: number = 0;
  mediaSessionOpt: MediaSessionOpt | null = null;
  ctx: AudioContext | null = null;
  source: MediaElementAudioSourceNode | null = null;
  analyser: AnalyserNode | null = null;
  constructor(opt: AudioToolOpt) {
    this.opt = opt;
    this.audio = new Audio();
    this.ctx = new AudioContext();
    this.source = this.ctx.createMediaElementSource(this.audio);
    this.analyser = this.ctx.createAnalyser();

    this.source.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    this.audio.addEventListener("play", this.opt.onplay);
    this.audio.addEventListener("pause", this.opt.onpause);
    this.audio.addEventListener("ended", this.opt.onended);
    this.audio.addEventListener("timeupdate", this.opt.ontimeupdate);
  }
  /** 播放 */
  async play(song?: SongType) {
    if (this.audio) {
      const src = await getWebviewFilePath(song);

      if (src && this.audio.src != src) {
        this.audio.src = src;
        this.audio.load();
      }

      this.setSeek(this.currentTime);
      this.audio!.play()
        .then(() => {
          if (song) {
            this.updateMediaMetadata(song);
            this.initMediaSession(this.mediaSessionOpt!);
          }
          this.updateMediaSessionState(true);
        })
        .catch(() => {
          this.updateMediaSessionState(false);
        });
    }
  }
  /** 暂停 */
  pause() {
    this.audio?.pause();
  }
  /** 设置播放进度 */
  setSeek(num: number) {
    this.audio!.currentTime = num;
    this.currentTime = num;
  }
  /** 事件取消 */
  cancelEventListener() {
    if (!this.audio) {
      return;
    }
    this.audio.removeEventListener("play", this.opt.onplay);
    this.audio.removeEventListener("pause", this.opt.onpause);
    this.audio.removeEventListener("ended", this.opt.onended);
    this.audio.removeEventListener("timeupdate", this.opt.ontimeupdate);
  }
  volume(num: number) {
    this.audio!.volume = num;
  }
  // 通知系统
  async updateMediaMetadata(song: SongType) {
    if (this.cacheURL) {
      URL.revokeObjectURL(this.cacheURL);
      this.cacheURL = "";
    }
    try {
      this.cacheURL = await getURL(song);
      const metadata = new MediaMetadata({
        title: song.name,
        artist: song.singer.join(", "),
        album: "wy-music",
        artwork: [
          {
            src: this.cacheURL,
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
  // 更新媒体会话状态
  updateMediaSessionState(playing: boolean) {
    if ("mediaSession" in navigator && navigator.mediaSession) {
      navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    }
  }
  // 清除事件
  clearMediaSession() {
    navigator.mediaSession.setActionHandler("play", null);
    navigator.mediaSession.setActionHandler("pause", null);
    navigator.mediaSession.setActionHandler("previoustrack", null);
    navigator.mediaSession.setActionHandler("nexttrack", null);
    navigator.mediaSession.setActionHandler("seekto", null);
  }
  initMediaSession(opt: MediaSessionOpt) {
    this.mediaSessionOpt = opt;
    this.clearMediaSession();
    // 播放事件处理
    navigator.mediaSession.setActionHandler("play", async () => {
      if (this.audio) {
        this.setSeek(this.audio.currentTime);
        this.play();
        this.updateMediaSessionState(true);
      }
    });

    // 暂停事件处理
    navigator.mediaSession.setActionHandler("pause", () => {
      this.pause();
      this.updateMediaSessionState(false);
    });
    // 上一首事件处理
    navigator.mediaSession.setActionHandler(
      "previoustrack",
      opt.onprevioustrack
    );
    // 下一首事件处理
    navigator.mediaSession.setActionHandler("nexttrack", opt.nexttrack);
    // 调整进度条事件处理
    navigator.mediaSession.setActionHandler("seekto", opt.onseekto);
  }
}
