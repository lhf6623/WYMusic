<script setup lang="ts">

import { useSettingStore } from "@/store/module/setting";
import { useSongStore } from "@/store/module/song";
import { useUserStore } from "@/store/module/user";
import { onMounted, watch } from "vue";
import { zhCN, dateZhCN } from "naive-ui";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize } from "@tauri-apps/api/dpi";
import SongListPanel from "./SongListPanel/index.vue";
import Setting from "./Setting.vue";
import ManPanel from "./ManPanel/index.vue";

const settingStore = useSettingStore();
const songStore = useSongStore();
const userStore = useUserStore();
const app = getCurrentWindow();

onMounted(async () => {
  settingStore.showBottomPanel = null;
  songStore.isPlaying = false;
  await songStore.getLoaclMp3Info();

  if (userStore.cookie) {
    songStore.getlikeList();
  }
  settingStore.updateWindowTop(settingStore.windowTop)
});

watch(
  () => settingStore.showBottomPanel,
  (showBottomPanel) => {
    app.setSize(new LogicalSize(330, showBottomPanel ? 660 : 330));
  },
);

watch(
  () => userStore.cookie,
  () => {
    if (userStore.cookie) {
      songStore.getlikeList();
    } else {
      songStore.likeList = [];
    }
  }
);

</script>

<template>
  <NConfigProvider :locale="zhCN" :date-locale="dateZhCN">
    <NMessageProvider>
      <NLoadingBarProvider>
        <ManPanel></ManPanel>
        <div v-show="settingStore.showBottomPanel" h330px w330px relative overflow-hidden>
          <SongListPanel v-show="settingStore.showBottomPanel === 'song_list'"> </SongListPanel>
          <Setting v-show="settingStore.showBottomPanel === 'setting'"></Setting>
        </div>
      </NLoadingBarProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>