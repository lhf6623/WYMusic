<template>
  <NDropdown :options="menu" :x="x" :y="y" :show="show" trigger="manual" @select="handleSelect"
    :on-clickoutside="onClickoutside">
  </NDropdown>
</template>

<script setup lang="ts">
import { DropdownOption } from 'naive-ui'
import { computed, ref, watch } from 'vue';
import { useSongStore } from "@/store/module/song"
import { useMenuInject } from "./useMenuContext"

const { menuOperate, showMenu, selectMenu } = useMenuInject()
const songStore = useSongStore()
const props = defineProps<{
  songId: string | null,
  x: number,
  y: number,
  show: boolean
}>();
const is_local = ref(false)
function onClickoutside() {
  setTimeout(() => {
    showMenu(props.songId, props.x, props.y, false)
  }, 0);
}
function handleSelect(key: MenuOperateType) {
  selectMenu(key, props.songId)
  showMenu(props.songId, props.x, props.y, false)
}

watch(() => props.show, async (newVal) => {
  if (newVal && props.songId) {
    is_local.value = (await songStore.getSong(props.songId)).path !== undefined
  } else {
    is_local.value = false
  }
})

const menu = computed<Array<DropdownOption>>(() => {
  if (!props.songId) return []

  const is_play = songStore.currSongKey == props.songId
  const is_play_list = songStore.inPlayList(props.songId)

  const { add_play_list, remove_play_list } = menuOperate

  const play = is_play && songStore.isPlaying ? {
    label: '暂停',
    key: 'pause',
  } : {
    label: '播放',
    key: 'play',
  }

  // 当前歌曲 和下一首歌曲
  const index = songStore.playList.findIndex(item => item == songStore.currSongKey)
  const next_index = index == songStore.playList.length - 1 ? 0 : index + 1
  const is_next_song = songStore.playList[next_index] == props.songId

  const next_play = songStore.playList.length && !is_play && !is_next_song ? [{
    label: '下一首播放',
    key: 'next_play',
  }] : []

  const add_play_list_item = add_play_list && !is_play_list ? [{
    label: '添加到播放列表',
    key: 'add_play_list',
  }] : []

  const remove_play_list_item = remove_play_list && is_play_list ? [{
    label: '从列表中移除',
    key: 'remove_play_list',
  }] : []

  const download = !is_local.value ? [{
    label: '下载',
    key: 'download',
  }] : []
  return [
    play,
    ...next_play,
    ...add_play_list_item,
    ...remove_play_list_item,
    ...download,
    {
      label: '删除文件',
      key: 'delete',
    }
  ]
})

</script>