<template>
  <header h-40px line-height-40px w-full z-100 absolute top-0 left-0 font-300 text="sm #000000e6 center" select-none
    bg="#edebeb" data-tauri-drag-region v-show="store.focused">
    <div w16px hfull absolute flex-center left-0 top-0 flex-col px4px>
      <button hover-op-80 active-op-60 i-mdi:window-close @click="hideWindow"></button>
      <button hover-op-80 active-op-60 i-mdi:window-minimize @click="minWindow"></button>
    </div>
    <p data-tauri-drag-region truncate mx20px cursor-pointer>
      <span v-if="!!title" data-tauri-drag-region>
        {{ title }}
      </span>
      <span v-else data-tauri-drag-region>音乐</span>
    </p>
  </header>
</template>

<script setup lang="ts">
import { useSettingStore } from "@/store/module/setting";
import { useSongStore } from "@/store/module/song";
import { window as tauriWindow } from "@tauri-apps/api";
import { useMessage, useLoadingBar } from "naive-ui";
import { computed } from "vue";

const store = useSettingStore();
const songStore = useSongStore();

const title = computed(() => {
  if (!songStore.song?.name) return ''
  return `${songStore.song.name} -- ${songStore.song.singer?.join('/')}`
})


window.$message = useMessage();
window.$loadingBar = useLoadingBar();



function hideWindow() {
  tauriWindow.getCurrentWindow().close();
}
function minWindow() {
  tauriWindow.getCurrentWindow().minimize();
}
</script>
