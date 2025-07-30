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
}
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
  TabsType: TabsType;
  MenuOperateType: MenuOperateType;
}
