// 一些默认设置
import { useSettingStore } from "@/store/module/setting";
import { useSongStore } from "@/store/module/song";
import { getDirAllMp3Path, getMp3Info } from "../api/local_songs";
import { putLocal } from "@/indexedDb/dexieTools";
import db from "@/indexedDb/fileListDB";

export default async function initTask() {
  const settingStore = useSettingStore();
  const songStore = useSongStore();

  settingStore.showBottomPanel = null;
  settingStore.focused = true;
  songStore.isPlaying = false;
  songStore.playLoading = false;

  settingStore.color = "rgb(255, 255, 255)";

  settingStore.updateWindowTop(settingStore.windowTop);

  // 音频工具
  songStore.initAudioTool();
  // 默认目录
  const url = await settingStore.getDefaultAudioDir();
  if (!settingStore.audioDir.includes(url)) {
    settingStore.audioDir.push(url);
  }

  getDirAllMp3Path(settingStore.audioDir).then(async (paths) => {
    // 获取 数据库 中所有的 key
    const paths_local = await db.local.toCollection().primaryKeys();
    const diff_paths = paths.filter((path) => !paths_local.includes(path));

    songStore.localList = paths;
    if (diff_paths.length) {
      getMp3Info(diff_paths).then((info) => {
        putLocal(info);
      });
    }
  });
}
