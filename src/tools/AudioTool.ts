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
  mp3CacheURL: string[] = [];
  currentTime: number = 0;
  mediaSessionOpt: MediaSessionOpt | null = null;
  ctx: AudioContext | null = null;
  source: MediaElementAudioSourceNode | null = null;
  analyser: AnalyserNode | null = null;
  gainNode: GainNode | null = null;
  constructor(opt: AudioToolOpt, mediaSessionOpt: MediaSessionOpt) {
    this.opt = opt;
    this.mediaSessionOpt = mediaSessionOpt;
    this.audio = new Audio();
    this.ctx = new AudioContext();
    this.source = this.ctx.createMediaElementSource(this.audio);
    this.analyser = this.ctx.createAnalyser();
    this.gainNode = this.ctx.createGain();

    this.source.connect(this.analyser);
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);

    this.audio.addEventListener("play", this.opt.onplay);
    this.audio.addEventListener("pause", this.opt.onpause);
    this.audio.addEventListener("ended", this.opt.onended);
    this.audio.addEventListener("timeupdate", this.opt.ontimeupdate);
  }
  async load(song?: LocalMp3FileInfo) {
    const [path, cacheUrl] = this.mp3CacheURL;

    if (!this.audio) throw new Error("初始化");

    if (!this.audio.src || (song && path !== song.path)) {
      cacheUrl && URL.revokeObjectURL(cacheUrl);

      const src = await getWebviewFilePath(song?.path!);

      if (!src) {
        window.$message.error("获取文件路径失败");
        this.mp3CacheURL = [];
        return;
      } else {
        this.mp3CacheURL = [song?.path!, this.audio.src];
      }
      this.audio.src = src;
      this.audio.load();
    }
  }
  async play(song?: LocalMp3FileInfo) {
    this.load(song).then(() => {
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
    this.gainNode!.gain.value = num;
  }
  // 通知系统
  async updateMediaMetadata(song: Mp3FileInfo) {
    const metadata = new MediaMetadata({
      title: song.name,
      artist: song.singer.join(", "),
      album: "wy-music",
      artwork: [
        {
          // 这里的 img 已经是 base64 的数据格式
          src: song.img,
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
