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
      <div flex wfull>
        <p w30px text-center>#</p>
        <div flex flex-1 gap-6px justify-between>
          <span>标题（{{ song_list?.length }}）</span>
          <div>
            <NButton @click="clearList" text v-show="type === 'play_list'">
              <template #icon>
                <i i-mdi:trash-can-outline mr-3px></i>
              </template>
              清空
            </NButton>
            <NButton @click="playAll" v-show="!['play_list', 'search'].includes(type)" text color="#fc3c55"
              size="small">
              <template #icon>
                <i i-mdi:play mr-3px></i>
              </template>
              播放全部
            </NButton>
          </div>
        </div>
      </div>
      <Song v-for="(item, index) in song_list" :index="index" :key="item.id" :song="item" :active="song_list_active"
        @setActive="setActive">
      </Song>
    </div>
    <!-- 定位按钮 阴影 -->
    <div v-if="showPosition" class="!fixed !bottom-6 !right-6 z-999 shadow-md rounded-full">
      <NButton color="white" text-color="red" circle @click="positionSong">
        <template #icon>
          <i i-mdi-target></i>
        </template>
      </NButton>
    </div>
  </NScrollbar>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';
import Song from './Song.vue';
import { ScrollbarInst } from 'naive-ui'
import { useSongStore } from "@/store/module/song";

const songStore = useSongStore();
const scrollbar = useTemplateRef<ScrollbarInst>('scrollbar');
const showPosition = ref(false)
const observer = ref<IntersectionObserver | null>(null)
const songRef = ref<Element | null>(null)
const props = defineProps<{
  loaging: boolean;
  list: SongType[];
  type: TabsType;
}>()
const emit = defineEmits<{
  search: [query: string];
  clear: [];
  playAll: [];
}>()
const song_list_active = ref<null | number>(null);

const song_list = computed(() => {
  if (!props.list.length) return []

  return props.list.map((item) => {
    return {
      ...item,
      picUrl: songStore.isLocal(item) ? item.picUrl : item.picUrl.replace("http://", "https://"),
    };
  });
});
const selectValue = ref('');

function handleSubmit() {
  emit('search', selectValue.value)
}

function setActive(i: number) {
  song_list_active.value = i;
}
async function playAll() {
  emit('playAll')
}
function clearList() {
  emit('clear')
}

watch(() => songStore.song, () => {
  if (observer.value) {
    observer.value.disconnect()
  }
  createObserve()
}, { deep: true })
// 判断当前播放歌曲是否在可视区域
function createObserve() {
  if (!songStore.song?.id) return

  const scrollbarInst = (scrollbar.value as any).scrollbarInstRef

  if (!scrollbarInst) return

  const { contentRef, wrapperRef } = scrollbarInst
  songRef.value = contentRef.querySelector(`[data-id="${songStore.song.id}"]`);

  if (!songRef.value) return

  observer.value = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      showPosition.value = !entry.isIntersecting
    })
  }, {
    root: wrapperRef,
    threshold: 0.0,
  })
  observer.value.observe(songRef.value)
}

onMounted(() => {
  createObserve()
})
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