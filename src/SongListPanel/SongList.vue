<template>
  <NScrollbar ref="scrollbar" style="max-height: 286px; width: 330px;"
    content-style="overflow: hidden;position: relative;">
    <div v-if="type === 'search'" overflow-hidden px6px pt6px>
      <NForm @submit.prevent="handleSubmit()">
        <NInputGroup>
          <NInput v-model:value="selectValue" placeholder="搜索歌曲"></NInput>
          <NButton :loading="loaging" attr-type="submit">搜索</NButton>
        </NInputGroup>
      </NForm>
    </div>
    <div v-if="loaging" text-center>加载中。。。</div>
    <div v-else relative wfull min-w-330px px15px>
      <div flex wfull items-center>
        <p w30px text-center>#</p>
        <div flex flex-1 gap-6px justify-between>
          <span v-if="type == 'search'">标题</span>
          <NInput v-else size="tiny" :placeholder="`搜索标题(${list.length})`" clearable v-model:value="filterInput"
            :bordered="false">
          </NInput>
          <div>
            <NButton @click="clearList" text v-show="type === 'playList'">
              <template #icon>
                <i i-mdi:trash-can-outline mr-3px></i>
              </template>
              清空
            </NButton>
            <NButton @click="playAll" v-show="!['playList', 'search'].includes(type)" text color="#fc3c55" size="small">
              <template #icon>
                <i i-mdi:play mr-3px></i>
              </template>
              播放全部
            </NButton>
          </div>
        </div>
      </div>
      <Song v-for="(path, index) in list" :index="index" :key="path" :songKey="path" :type="type" :filter="filterInput">
      </Song>
    </div>
    <!-- 定位按钮 阴影 -->
    <div v-if="showPosition && !filterInput" class="!fixed !bottom-6 !right-6 z-999 shadow-md rounded-full">
      <NButton color="white" text-color="red" circle @click="positionSong">
        <template #icon>
          <i i-mdi-target></i>
        </template>
      </NButton>
    </div>
  </NScrollbar>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';
import Song from './Song.vue';
import { ScrollbarInst } from 'naive-ui'
import { useSongStore } from "@/store/module/song";

const songStore = useSongStore();
const scrollbar = useTemplateRef<ScrollbarInst>('scrollbar');
const showPosition = ref(false)
const observer = ref<IntersectionObserver | null>(null)
const songRef = ref<Element | null>(null)
const props = defineProps<{
  loaging?: boolean;
  list: string[];
  type: TabsType;
  activeType: TabsType;
}>()
const emit = defineEmits<{
  search: [query: string];
  clear: [];
  playAll: [];
}>()

const selectValue = ref('');
const filterInput = ref('')

function handleSubmit() {
  emit('search', selectValue.value)
}
async function playAll() {
  emit('playAll')
}
function clearList() {
  emit('clear')
}

watch(() => [props.activeType, songStore.currSongKey], createObserve, { deep: true })

// 判断当前播放歌曲是否在可视区域
function createObserve() {
  if (observer.value) {
    observer.value.disconnect()
    observer.value = null
  }
  if (!songStore.currSongKey) return

  const scrollbarInst = (scrollbar.value as any).scrollbarInstRef

  if (!scrollbarInst) return

  const { contentRef } = scrollbarInst
  songRef.value = contentRef.querySelector(`[data-id="${props.type}_${songStore.currSongKey}"]`);

  if (!songRef.value) return

  observer.value = new IntersectionObserver((entries) => {
    showPosition.value = entries[0].intersectionRatio <= 0
  })
  observer.value.observe(songRef.value)
}

onMounted(createObserve)
onUnmounted(() => {
  if (observer.value) {
    observer.value.disconnect()
  }
})

function positionSong() {
  if (!songRef.value || !scrollbar.value) return

  const scrollbarInst = (scrollbar.value as any).scrollbarInstRef

  if (!scrollbarInst) return

  const contentRef = scrollbarInst.contentRef
  const songTop = songRef.value.getBoundingClientRect().top
  const contentTop = contentRef.getBoundingClientRect().top

  scrollbar.value.scrollTo({
    top: songTop - contentTop,
    behavior: 'smooth',
  })
}
</script>