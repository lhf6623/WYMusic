<template>
  <div h-330px w-330px relative>
    <TitleHaed></TitleHaed>
    <div h330px relative overflow-hidden w-full absolute inset-0 z-50 flex items-center justify-center>
      <!-- 展示歌词 -->
      <LyricPanel v-if="songStore.showLyric" z-30></LyricPanel>
      <!-- 展示歌曲专辑封面 -->
      <NImage width="330px" height="330px" absolute preview-disabled :src="pic_url">
        <template #error>
          <i w130px h130px animate-spin i-mdi:image-filter-hdr-outline></i>
        </template>
      </NImage>
      <div absolute bottom-0px left-0 wfull z-20 v-show="settingStore.showAudioVisualization"
        :class="{ 'bottom-50px': settingStore.focused }">
        <VisualizationAudio></VisualizationAudio>
      </div>
    </div>
    <Control></Control>
  </div>
</template>

<script setup lang="ts">
import { useSettingStore } from "@/store/module/setting"
import { useSongStore } from "@/store/module/song"
import TitleHaed from "./TitleHeader.vue";
import Control from "./Control.vue";
import LyricPanel from "./LyricPanel.vue";
import { NImage } from "naive-ui";
import { onMounted, onUnmounted, ref, watch } from "vue";
import VisualizationAudio from "./VisualizationAudio.vue";

const settingStore = useSettingStore();
const songStore = useSongStore();
const pic_url = ref('')

const get_pic_url = async () => {
  let url = ''

  if (songStore.song) {
    url = songStore.isLocal(songStore.song) ? await settingStore.getWebviewFilePath(songStore.song.picUrl) : songStore.song.picUrl ?? ''
  }

  url && settingStore.setMainColor(url)
  pic_url.value = url;
}

let tim: NodeJS.Timeout;
function handleMouseActive() {

  settingStore.focused = true;
  if (tim) {
    clearTimeout(tim);
  }
  tim = setTimeout(() => {
    if (settingStore.focusMode) {
      settingStore.focused = false;
      settingStore.showBottomPanel = null
    }
  }, settingStore.triggerTime);
}

watch(() => songStore.song, () => {
  get_pic_url()
}, { deep: true })

onMounted(() => {
  get_pic_url()
  document.addEventListener("mousemove", handleMouseActive);
  document.addEventListener("mousedown", handleMouseActive);
})


onUnmounted(() => {
  document.removeEventListener("mousemove", handleMouseActive);
  document.removeEventListener("mousedown", handleMouseActive);
});
</script>
