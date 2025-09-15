<template>
  <div ref="lyricPanel" wfull flex-center text-18px class="lrc-panel">
    <p v-for="(text, index) in lyric_text" :key="index" text-center pb-1>{{ text || '~~' }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watchPostEffect } from 'vue';
import { useSettingStore } from '@/store/module/setting';

const settingStore = useSettingStore()
const lyric_all_text = ref<{ time: number, text: string }[]>([]);

const props = defineProps<{
  song: null | LocalMp3FileInfo,
  timer: number,
}>()

const showPanel = computed(() => {
  return !!props.song ? 'block' : 'none'
})

const lyric_text = computed(() => {
  if (lyric_all_text.value.length <= 3) return lyric_all_text.value.map(item => item.text)
  let index = 1

  const { timer } = props
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

watchPostEffect(() => {
  if (!props.song || !props.song?.lrc) {
    lyric_all_text.value = []
    return;
  }

  lyric_all_text.value = props.song.lrc.split('\n').filter(Boolean).map(item => {
    return {
      time: timeToSeconds(item),
      text: item.replace(/\[(.*?)\]/, '') || '',
    }
  })
})

function timeToSeconds(timeString: string) {

  const time = timeString.match(/\[(.*?)\]/)?.[1]
  if (!time) return 0
  const date_arr = time.match(/([\d]+)/g);
  if (!date_arr) return 0
  let res = 0
  for (let i = 0; i < date_arr.length - 1; i++) {
    const num = Number(date_arr[i])
    res += Math.pow(60, date_arr.length - 2 - i) * num
  }
  const lastNum = date_arr.at(-1) || ''
  return res + Number(lastNum) / Math.pow(10, lastNum?.length)
}

const text_shadow_color = computed(() => {
  const [r, g, b] = settingStore.color.match(/\d+/g)!.map(Number);
  return `0 0 3px rgba(${r}, ${g}, ${b}, 1)`
})

const backgroundColor = computed(() => {
  const [r, g, b] = settingStore.color.match(/\d+/g)!.map(Number);
  const rgba = `rgba(${r}, ${g}, ${b}, 0.8)`
  const rgba1 = `rgba(${r}, ${g}, ${b}, 0.6)`
  return `linear-gradient(0deg, transparent, ${rgba1} 30%, ${rgba} 50%, ${rgba1} 70%, transparent)`
})
</script>

<style scoped>
.lrc-panel {
  display: v-bind('showPanel');
  color: v-bind('settingStore.textColor');
  text-shadow: v-bind('text_shadow_color');
  /* 背景渐变 上中下 中间黑色，上下透明 */
  background: v-bind('backgroundColor');
}
</style>
