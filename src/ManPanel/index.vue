<template>
  <div h-330px w-330px relative overflow-hidden>
    <header line-height-40px overflow-hidden w-full z-200 absolute top-0 left-0 font-300 text="sm center" select-none
      data-tauri-drag-region transition-all :class="{
        'h-40px min-h-40px': settingStore.focused,
        'h-0px': !settingStore.focused
      }" :style="{
        background: backgroundColor,
        color: textColor
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
        <NButton :type="!settingStore.windowTop ? 'tertiary' : 'info'" text @click="settingStore.updateWindowTop()"
          :class="settingStore.windowTop ? '-rotate-45' : 'rotate-0'">
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
    <!-- <div absolute bottom-0px left-0 wfull z-60 v-if="settingStore.showAudioVisualization"
      :class="{ 'bottom-70px': settingStore.focused }">
      <VisualizationAudio></VisualizationAudio>
    </div> -->
    <Control></Control>
  </div>
</template>

<script setup lang="ts">
import { useSettingStore } from "@/store/module/setting"
import { useSongStore } from "@/store/module/song"
import Control from "./Control.vue";
import LyricPanel from "./LyricPanel.vue";
import { computed, onMounted, ref, watch } from "vue";
// import VisualizationAudio from "./VisualizationAudio.vue";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useMessage, useLoadingBar } from "naive-ui";
import { window as tauriWindow } from "@tauri-apps/api";
import { getWebviewFilePath } from "@/tools";

const settingStore = useSettingStore();
const songStore = useSongStore();
const pic_url = ref('')

window.$message = useMessage();
window.$loadingBar = useLoadingBar();

const title = computed(() => {
  if (!songStore.currSong?.name) return '音乐'
  return `${songStore.currSong.name} -- ${songStore.currSong.singer?.join('/')}`
})

const backgroundColor = computed(() => {
  const [r, g, b] = settingStore.color.match(/\d+/g)!.map(Number);
  return `rgb(${r}, ${g}, ${b}, 0.75)`
})
const textColor = computed(() => {
  const [r, g, b] = settingStore.color.match(/\d+/g)!.map(Number);
  return `rgb(${255 - r}, ${255 - g}, ${255 - b}, 1)`
})

function hideWindow() {
  tauriWindow.getCurrentWindow().close();
}
function minWindow() {
  tauriWindow.getCurrentWindow().minimize();
}

const get_pic_url = async () => {

  let url = (await getWebviewFilePath(songStore.currSong, 'jpg')) ?? ''
  pic_url.value = url;

  url && settingStore.setMainColor(url)
}
watch(() => songStore.currSongId, get_pic_url, { deep: true })

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
