<script setup lang="ts">

import { useSettingStore } from "@/store/module/setting";
import { defineAsyncComponent, onMounted, onUnmounted, watchEffect } from "vue";
import { zhCN, dateZhCN } from "naive-ui";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize } from "@tauri-apps/api/dpi";
import initTask from "@/tools/initTask";

const ManPanel = defineAsyncComponent(() => import("./ManPanel/index.vue"));
const SongListPanel = defineAsyncComponent(() => import("./SongListPanel/index.vue"));
const Setting = defineAsyncComponent(() => import("./Setting.vue"))

const settingStore = useSettingStore();
const app = getCurrentWindow();

onMounted(initTask);

onUnmounted(initTask)

watchEffect(() => {
  app.setSize(new LogicalSize(330, settingStore.showBottomPanel ? 660 : 330));
});
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