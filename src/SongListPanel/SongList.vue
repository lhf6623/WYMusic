<template>
  <NScrollbar style="max-height: 286px; width: 330px;" content-style="overflow: hidden;">
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
  </NScrollbar>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import Song from './Song.vue';
import { useSongStore } from "@/store/module/song";
import { NForm, NInputGroup, NInput, NButton, NScrollbar } from 'naive-ui'

const songStore = useSongStore();
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
</script>