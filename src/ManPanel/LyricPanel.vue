<template>
  <div hfull wfull relative pt-40px pb-50px overflow-hidden>
    <NScrollbar ref="lyricPanelRef" style="max-height: 330px;" p16px hfull overflow-auto>
      <p v-for="item in lyricRef" :key="item.time" :data-time="item.time" text-center mb-1
        :class="{ 'text-red-600': item.time === activeIndex }">{{ item.text }}</p>
    </NScrollbar>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, useTemplateRef, nextTick } from 'vue';
import { useSongStore } from "@/store/module/song";
import { NScrollbar } from 'naive-ui';

const songStore = useSongStore();
const lyricPanelRef = useTemplateRef('lyricPanelRef')
const panelItems = ref<{
  top: number;
  time: number;
  height: number;
}[]>([])
const activeIndex = ref<number>(0)
const lyricRef = ref<{ time: number, text: string }[]>([]);

// 处理歌词
function handleLyric(text: string) {

  lyricRef.value = text.split('\n').filter(Boolean).map(item => {

    return {
      time: timeToSeconds(item),
      text: item.replace(/\[(.*?)\]/, ''),
    }
  })
  nextTick(() => {
    initPanelItems()
    handleScroll()
  })

}
// 初始化panelItems
function initPanelItems() {

  const box = lyricPanelRef.value?.scrollbarInstRef?.contentRef

  if (!box) return

  // 时间，scroll高度，每行歌词距离父级顶部的距离
  const lyricItems = box!.querySelectorAll('p')

  panelItems.value = Array.from(lyricItems).map(item => {
    // 距离顶部高度
    let top = item.offsetTop
    // 时间
    let time = Number(item.dataset.time)
    return {
      top,
      time,
      height: item.clientHeight,
    }
  })

}
// 处理滚动条
function handleScroll() {

  if (!lyricPanelRef.value || !panelItems.value.length) return

  const box = lyricPanelRef.value?.scrollbarInstRef?.containerRef

  if (!box) return
  // 父级容器实际高度
  const lyricPanelHeight = box.clientHeight

  for (let i = 0; i < panelItems.value.length - 1; i++) {
    const item = panelItems.value[i]
    const nextItem = panelItems.value[i + 1]
    if (songStore.currentTime >= item.time && songStore.currentTime < nextItem.time && activeIndex.value !== item.time) {
      activeIndex.value = item.time

      const top = item.top - lyricPanelHeight / 2 + item.height / 2

      lyricPanelRef.value!.scrollTo({
        top,
        behavior: 'smooth',
      })
    }
  }
}

onMounted(() => {
  handleLyric(songStore.lyric)
})

watch(() => songStore.lyric, handleLyric)
watch(() => songStore.currentTime, handleScroll)

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
</script>