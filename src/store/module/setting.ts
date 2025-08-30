import { defineStore } from "pinia";
import { versionKey } from "..";
import { getImgColor } from "@/tools";

import { join, audioDir } from "@tauri-apps/api/path";
import { getCurrentWindow } from "@tauri-apps/api/window";

export interface SettingStore {
  /** 应用是否被聚焦 */
  focused: boolean;
  /** 是否展示歌词 */
  showLyric: boolean;
  /** 主色调 */
  color: string;
  /** 底部面板展示 */
  showBottomPanel: "song_list" | "setting" | null;
  /** 本地音频目录 */
  localAudioDir: string;
  /** 请求地址 */
  apiAudioUrl: string;
  /** 展示音频可视化面板 */
  showAudioVisualization: boolean;
  /** 测试 apiAudioUrl 地址是否有效 */
  testApiAudioUrl: boolean;
  /** 窗口置顶 */
  windowTop: boolean;
}

export const useSettingStore = defineStore("setting", {
  persist: {
    key: versionKey("setting"),
  },
  state: (): SettingStore => {
    return {
      focused: true,
      showLyric: false,
      color: "rgb(255, 255, 255)",
      showBottomPanel: null,
      localAudioDir: "",
      apiAudioUrl: import.meta.env.VITE_API_AUDIO_URL,
      showAudioVisualization: true,
      testApiAudioUrl: false,
      windowTop: false,
    };
  },
  actions: {
    showAudioView() {
      this.showAudioVisualization = !this.showAudioVisualization;
    },
    /** 窗口置顶 */
    updateWindowTop(value?: boolean) {
      const flag = value ?? !this.windowTop;
      getCurrentWindow()
        .setAlwaysOnTop(flag)
        .then(() => {
          this.windowTop = flag;
        });
    },
    /** 获取默认的本地音频目录 */
    async getDefaultAudioDir(fileName?: string) {
      return await join(await audioDir(), "WYMusic", fileName || "");
    },
    /** 获取主色调 */
    setMainColor(url: string) {
      // 耗时任务，不要同步代码
      return getImgColor(url).then((_color) => {
        this.color = _color ?? "rgb(255, 255, 255)";
      });
    },
  },
});
