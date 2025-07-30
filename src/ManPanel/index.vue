<template>
  <div h-330px w-330px relative overflow-hidden>
    <header line-height-40px overflow-hidden w-full z-200 absolute top-0 left-0 font-300 text="sm center" select-none
      bg="#edebeb" data-tauri-drag-region transition-all :style="{
        height: settingStore.focused ? '40px' : '0px',
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
        <NButton :type="!settingStore.windowTop ? 'tertiary' : 'info'" text @click="settingStore.updateWindowTop()">
          <template #icon>
            <i class="i-la:thumbtack"></i>
          </template>
        </NButton>
      </div>
    </header>
    <!-- 展示歌曲专辑封面 -->
    <div h330px w330px overflow-hidden absolute inset-0 z-50 flex-center>
      <NImage width="330px" height="330px" preview-disabled :src="pic_url">
        <template #error>
          <i w130px h130px animate-spin i-mdi:image-filter-hdr-outline></i>
        </template>
      </NImage>
    </div>
    <!-- 展示歌词 -->
    <div h330px overflow-hidden w-full absolute inset-0 z-100 flex-center v-if="settingStore.showLyric">
      <LyricPanel z-30></LyricPanel>
    </div>
    <!-- 展示音频可视化 -->
    <div absolute bottom-0px left-0 wfull z-60 v-if="settingStore.showAudioVisualization"
      :class="{ 'bottom-70px': settingStore.focused }">
      <VisualizationAudio></VisualizationAudio>
    </div>
    <Control></Control>
  </div>
</template>

<script setup lang="ts">
import { useSettingStore } from "@/store/module/setting"
import { useSongStore } from "@/store/module/song"
import Control from "./Control.vue";
import LyricPanel from "./LyricPanel.vue";
import { computed, onMounted, ref, watch } from "vue";
import VisualizationAudio from "./VisualizationAudio.vue";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useMessage, useLoadingBar } from "naive-ui";
import { window as tauriWindow } from "@tauri-apps/api";

const settingStore = useSettingStore();
const songStore = useSongStore();
const pic_url = ref('')

window.$message = useMessage();
window.$loadingBar = useLoadingBar();

const title = computed(() => {
  if (!songStore.song?.name) return '音乐'
  return `${songStore.song.name} -- ${songStore.song.singer?.join('/')}`
})

function hideWindow() {
  tauriWindow.getCurrentWindow().close();
}
function minWindow() {
  tauriWindow.getCurrentWindow().minimize();
}

const get_pic_url = async () => {
  let url = ''
  if (songStore.song) {
    url = songStore.isLocal(songStore.song) ? await settingStore.getWebviewFilePath(songStore.song.picUrl) : songStore.song.picUrl ?? ''
  }
  pic_url.value = url;

  url && settingStore.setMainColor(url)
}
watch(() => songStore.song, get_pic_url, { deep: true })

onMounted(get_pic_url)

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
