<template>
  <div max-h-130px wfull flex-center flex-col text-18px class="lyric-panel">
    <!-- 只显示当前行和上一行还有下一行 -->
    <p v-for="(item, index) in lyric_text" :key="index" :data-time="item.time" text-center mb-1 :class="{
      hidden: active_index != index && active_index != index - 1 && active_index != index + 1
    }">{{ item.text || '~~' }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { useSongStore } from "@/store/module/song";
import { useSettingStore } from "@/store/module/setting";

const songStore = useSongStore();
const settingStore = useSettingStore();
const lyric_text = ref<{ time: number, text: string }[]>([]);

// 处理歌词
function handleLyric(text: string) {
  lyric_text.value = text.split('\n').filter(Boolean).map(item => {
    return {
      time: timeToSeconds(item),
      text: item.replace(/\[(.*?)\]/, '') || '',
    }
  })
}

const active_index = computed(() => {
  for (let i = 0; i < lyric_text.value.length - 1; i++) {
    const item = lyric_text.value[i]
    const nextItem = lyric_text.value[i + 1]
    if (songStore.currentTime >= item.time && songStore.currentTime < nextItem.time) {
      return i
    }
  }
  return 0
})

onMounted(() => {
  handleLyric(songStore.lyric)
})

watch(() => songStore.lyric, handleLyric)

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
  const [r, g, b] = settingStore.color.match(/\d+/g)!.map(Number);
  return `rgba(${255 - r}, ${255 - g}, ${255 - b}, 1)`
})

const text_shadow_color = computed(() => {
  const [r, g, b] = settingStore.color.match(/\d+/g)!.map(Number);
  return `0 0 3px rgba(${r}, ${g}, ${b}, 0.3)`
})

</script>

<style scoped>
.lyric-panel {
  color: v-bind('text_color');
  text-shadow: v-bind('text_shadow_color');
}
</style>
