<template>
  <div h-330px w-330px relative overflow-hidden>
    <header line-height-40px overflow-hidden w-full z-200 absolute top-0 left-0 font-300 text="sm center" select-none
      data-tauri-drag-region transition-all :class="{
        'h-40px min-h-40px': settingStore.focused,
        'h-0px': !settingStore.focused
      }" :style="{
        background: settingStore.backgroundColor,
        color: settingStore.textColor
      }">
      <div w16px hfull absolute flex-center left-0 top-0 flex-col px4px>
        <button hover-op-80 active-op-60 i-mdi:window-close @click="hideWindow"></button>
        <button hover-op-80 active-op-60 i-mdi:window-minimize @click="minWindow"></button>
      </div>
      <p data-tauri-drag-region truncate mx20px cursor-pointer>
        <span data-tauri-drag-region>
          {{ title }}
        </span>
      </p>
      <div absolute flex-center top-0 right-0 hfull px-6px>
        <NButton :type="!settingStore.windowTop ? 'tertiary' : 'info'" :color="settingStore.textColor" text
          @click="settingStore.updateWindowTop()" :class="settingStore.windowTop ? '-rotate-45' : 'rotate-0'">
          <template #icon>
            <i class="i-la:thumbtack"></i>
          </template>
        </NButton>
      </div>
    </header>
    <!-- 展示歌曲专辑封面 -->
    <div h330px w330px overflow-hidden absolute inset-0 z-50 flex-center>
      <img v-if="song?.img" w-330px h-330px preview-disabled :src="song.img"></img>
      <i v-else w130px h130px animate-spin i-streamline-pixel-music-headphones-human></i>
    </div>
    <!-- 展示歌词 -->
    <div h330px overflow-hidden w-full absolute inset-0 z-100 flex-center v-if="settingStore.showLyric">
      <LyricPanel z-30 :song="song" :timer="songStore.timer"></LyricPanel>
    </div>
    <!-- 展示音频可视化 -->
    <div absolute bottom-0px left-0 wfull z-60 v-if="settingStore.showAudioVisualization"
      :class="{ 'bottom-70px': settingStore.focused }">
      <VisualizationAudio :song="song"></VisualizationAudio>
    </div>
    <Control :song="song"></Control>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue"
import { useSettingStore } from "@/store/module/setting"
import { useSongStore } from "@/store/module/song"
import { computed, ref, watchPostEffect } from "vue";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useMessage, useLoadingBar } from "naive-ui";
import { window as tauriWindow } from "@tauri-apps/api";

const Control = defineAsyncComponent(() => import("./Control.vue"));
const LyricPanel = defineAsyncComponent(() => import("./LyricPanel.vue"))
const VisualizationAudio = defineAsyncComponent(() => import("./VisualizationAudio.vue"))

const settingStore = useSettingStore();
const songStore = useSongStore();
const song = ref<LocalMp3FileInfo | null>(null)

window.$message = useMessage();
window.$loadingBar = useLoadingBar();

const title = computed(() => {
  if (!song || !song.value?.name) return '音乐'
  return `${song.value.name} -- ${song.value.singer?.join('/')}`
})

function hideWindow() {
  // 隐藏窗口
  tauriWindow.getCurrentWindow().hide();
}
function minWindow() {
  tauriWindow.getCurrentWindow().minimize();
}


watchPostEffect(async () => {
  if (songStore.currSongKey && songStore.localList) {
    songStore.getSong(songStore.currSongKey).then(res => {
      song.value = res as LocalMp3FileInfo
      settingStore.setMainColor(song.value?.img)
    })
  } else {
    song.value = null
    settingStore.setMainColor('')
  }
})

const app = getCurrentWindow();

app.onFocusChanged((focused) => {
  // settingStore.focused = true;
  // return
  settingStore.focused = focused.payload;
  if (!focused.payload) {
    settingStore.showBottomPanel = null
  }
})
</script>
