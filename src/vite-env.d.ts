/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module "rgbaster";

type MessageApi = import("naive-ui").MessageApi;
type LoadingBarApi = import("naive-ui").LoadingBarApi;
interface SongType {
  id: string | number;
  name: string;
  singer: string[];
  picUrl: string;
  dt: number;
  // 歌词 如果播放过应该把歌词放进来
  lyric?: string;
}
type SongDetail = {
  name: string; // 歌曲标题
  id: number;
  ar: Array<{
    // 歌手列表
    alias: Array<string>;
    id: number;
    name: string;
  }>;
  alia: Array<string>; // 别名列表，第一个别名会被显示作副标题
  fee: 0 | 1 | 4 | 8; // 0: 免费或无版权 1: vip歌曲 4: 购买专辑 8: 非会员可免费播放低音质，会员可播放高音质及下载
  dt: number; // 歌曲时长
  al: {
    id: number;
    name: string;
    picUrl: string;
  };
  tns: string[];
};
type TabsType = "play_list" | "daily" | "download" | "search";
type MenuOperateType =
  | "download"
  | "download_null"
  | "delete_download"
  | "pause"
  | "play"
  | "next_play"
  | "add_play_list"
  | "remove_play_list";

interface Window {
  $message: MessageApi;
  $loadingBar: LoadingBarApi;
  SongType: SongType;
  SongDetail: SongDetail;
  TabsType: TabsType;
  MenuOperateType: MenuOperateType;
}
