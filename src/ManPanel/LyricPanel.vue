<template>
  <div ref="lyricPanel" max-h-130px wfull flex-center flex-col text-18px class="lyric-panel">
    <p v-for="(text, index) in lyric_text" :key="index" text-center pb-1>{{ text || '~~' }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed, useTemplateRef } from 'vue';
import { useSongStore } from "@/store/module/song";
import { useSettingStore } from "@/store/module/setting";
import { getImgColor } from "@/tools";

const songStore = useSongStore();
const settingStore = useSettingStore();
const lyric_all_text = ref<{ time: number, text: string }[]>([]);
const color = ref('rgb(255, 255, 255)')
const lyricPanel = useTemplateRef('lyricPanel')

// 处理歌词
function get_lyric_text(text: string) {

  lyric_all_text.value = text.split('\n').filter(Boolean).map(item => {
    return {
      time: timeToSeconds(item),
      text: item.replace(/\[(.*?)\]/, '') || '',
    }
  })
}

const lyric_text = computed(() => {
  if (lyric_all_text.value.length <= 3) return lyric_all_text.value.map(item => item.text)
  let index = 1

  const { timer } = songStore

  for (let i = 1; i < lyric_all_text.value.length - 1; i++) {
    const item = lyric_all_text.value[i]
    const nextItem = lyric_all_text.value[i + 1]
    if (timer >= item.time && timer < nextItem.time) {
      index = i
      break;
    }
  }
  return lyric_all_text.value.flatMap((item, i) => {
    return (i == index - 1 || i == index || i == index + 1) ? [item.text] : []
  })
})

async function get_color() {
  if (!lyric_all_text.value.length) return;
  if (!songStore.song?.picUrl) return

  const rect = lyricPanel.value!.getBoundingClientRect()
  const url = songStore.isLocal(songStore.song) ? await settingStore.getWebviewFilePath(songStore.song.picUrl) : songStore.song.picUrl

  const _color = await getImgColor(url, {
    width: rect.width,
    height: rect.height,
    x: rect.x,
    y: rect.y
  });
  if (_color) {
    color.value = _color
  }
}

onMounted(async () => {
  get_lyric_text(songStore.lyric)
  get_color()
})

watch(() => songStore.lyric, () => {
  get_lyric_text(songStore.lyric)
  get_color()
})

function timeToSeconds(timeString: string) {

  const date_arr = timeString.match(/([\d]+)/g);
  if (!date_arr) return 0
  let res = 0
  for (let i = 0; i < date_arr.length - 1; i++) {
    const num = Number(date_arr[i])
    res += Math.pow(60, date_arr.length - 2 - i) * num
  }
  const lastNum = date_arr.at(-1) || ''
  return res + Number(lastNum) / Math.pow(10, lastNum?.length)
}

const text_color = computed(() => {
  const [r, g, b] = color.value.match(/\d+/g)!.map(Number);
  return `rgba(${255 - r}, ${255 - g}, ${255 - b}, 1)`
})

const text_shadow_color = computed(() => {
  const [r, g, b] = color.value.match(/\d+/g)!.map(Number);
  return `0 0 3px rgba(${r}, ${g}, ${b}, 1)`
})
</script>

<style scoped>
.lyric-panel {
  color: v-bind('text_color');
  text-shadow: v-bind('text_shadow_color');
}
</style>
