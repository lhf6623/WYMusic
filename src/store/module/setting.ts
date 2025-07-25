import { defineStore } from "pinia";
import { versionKey } from "..";
import { getImgRegion } from "@/tools";
import analyze from "rgbaster";

import { join, audioDir } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/core";

export interface SettingStore {
  /** 应用是否被聚焦 */
  focused: boolean;
  /** 聚焦触发时间 */
  triggerTime: number;
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
  /** 专注模式 */
  focusMode: boolean;
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
      triggerTime: 4500,
      color: "rgb(255, 255, 255)",
      showBottomPanel: null,
      localAudioDir: "",
      apiAudioUrl: import.meta.env.VITE_API_AUDIO_URL,
      showAudioVisualization: true,
      focusMode: true,
      testApiAudioUrl: false,
      windowTop: false,
    };
  },
  actions: {
    /** 获取默认的本地音频目录 */
    async getDefaultAudioDir() {
      return await join(await audioDir(), "WYMusic");
    },
    /** 获取能在webview中使用的文件路径 */
    async getWebviewFilePath(name: string, dir?: string) {
      const path = await join(dir ?? this.localAudioDir, `${name}`);
      return await convertFileSrc(path);
    },
    /** 获取主色调 */
    setMainColor(url: string) {
      // 耗时任务，不要同步代码
      getImgRegion(url).then((img) => {
        analyze(img).then((res: [{ color: string }]) => {
          const [imgObj] = res;
          this.color = imgObj.color;
        });
      });
    },
  },
});
