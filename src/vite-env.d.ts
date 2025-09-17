/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

type MessageApi = import("naive-ui").MessageApi;
type LoadingBarApi = import("naive-ui").LoadingBarApi;

interface SongDetail {
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
}
type BottomPanelType = "song_list" | "setting" | null;
type TabsType = "playList" | "dailyList" | "localList" | "search";
type MenuOperateType =
  | "pause"
  | "play"
  | "next_play"
  | "add_play_list"
  | "download"
  | "delete"
  | "remove_play_list";

interface Mp3FileInfo {
  name: string; // 歌曲名
  singer: string[]; // 歌手
  dt: number; // 时长
  album: string; // 专辑
  img: string; // 图片 base64 编码
}

interface NetworkMp3FileInfo extends Mp3FileInfo {
  id: string; // 网络歌曲有个id
  lastAccessTime?: number; // 最后访问时间
  path?: string | null; // mp3 本地实际路径
}

interface LocalMp3FileInfo extends Mp3FileInfo {
  path: string; // mp3 本地实际路径
  lrc: string; // 歌词
  id?: string; // 网络歌曲id
}
interface Window {
  $message: MessageApi;
  $loadingBar: LoadingBarApi;
  SongDetail: SongDetail;
  TabsType: TabsType;
  MenuOperateType: MenuOperateType;
}
