// 都是本地文件，加载很快

import { getWebviewFilePath } from ".";

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
  imgCacheURL: string[] = [];
  mp3CacheURL: string[] = [];
  currentTime: number = 0;
  mediaSessionOpt: MediaSessionOpt | null = null;
  ctx: AudioContext | null = null;
  source: MediaElementAudioSourceNode | null = null;
  analyser: AnalyserNode | null = null;
  constructor(opt: AudioToolOpt, mediaSessionOpt: MediaSessionOpt) {
    this.opt = opt;
    this.mediaSessionOpt = mediaSessionOpt;
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
  /** 播放, 如果没有值，应该是媒体控制那里点的播放 */
  async play(song?: SongType) {
    const [mp3, cacheUrl] = this.mp3CacheURL;

    if (!this.audio) throw new Error("初始化");

    if (!this.audio.src || (song && mp3 !== song.mp3)) {
      cacheUrl && URL.revokeObjectURL(cacheUrl);

      this.audio.src = (await getWebviewFilePath(song, "mp3", false))!;

      this.mp3CacheURL = [song?.mp3!, this.audio.src];
      this.audio.load();
    }

    this.setSeek(this.currentTime);
    this.audio!.play()
      .then(() => {
        if (song) {
          this.updateMediaMetadata(song);
          this.initMediaSession();
        }
        this.updateMediaSessionState(true);
      })
      .catch(() => {
        this.updateMediaSessionState(false);
      });
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
    const [img, cacheUrl] = this.imgCacheURL;
    if (img && img === song.img) return;

    cacheUrl && URL.revokeObjectURL(cacheUrl);
    const src = (await getWebviewFilePath(song, "jpg", false))!;

    this.imgCacheURL = [song.img!, src];

    const metadata = new MediaMetadata({
      title: song.name,
      artist: song.singer.join(", "),
      album: "wy-music",
      artwork: [
        {
          src,
          sizes: "1000x1000",
          type: "image/jpeg",
        },
      ],
    });
    navigator.mediaSession.metadata = metadata;
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
  initMediaSession() {
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
      this.mediaSessionOpt!.onprevioustrack
    );
    // 下一首事件处理
    navigator.mediaSession.setActionHandler(
      "nexttrack",
      this.mediaSessionOpt!.nexttrack
    );
    // 调整进度条事件处理
    navigator.mediaSession.setActionHandler(
      "seekto",
      this.mediaSessionOpt!.onseekto
    );
  }
}
