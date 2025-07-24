<template>
  <NDropdown :options="menu" :x="x" :y="y" :show="show" trigger="manual" @select="handleSelect"
    :on-clickoutside="onClickoutside">
  </NDropdown>
</template>

<script setup lang="ts">
import { NDropdown, DropdownOption } from 'naive-ui'
import { computed, inject } from 'vue';
import { useSongStore } from "@/store/module/song"

const songStore = useSongStore()
const props = defineProps<{
  song: SongType | null,
  x: number,
  y: number,
  show: boolean
}>()
const menuOperate = inject('menuOperate', { add_play_list: false, remove_play_list: false })
const menuOperateFn = inject<(key: MenuOperateType, song: SongType | null) => void>("menuOperateFn", () => { });
const showMenuAbility = inject<(song: SongType | null, x: number, y: number, show: boolean) => void>("showMenuAbility", () => { });
function onClickoutside() {
  setTimeout(() => {
    showMenuAbility(props.song, props.x, props.y, false)
  }, 0);
}
function handleSelect(key: MenuOperateType) {
  menuOperateFn(key, props.song)
  showMenuAbility(props.song, props.x, props.y, false)

}

const menu = computed<Array<DropdownOption>>(() => {
  if (!props.song) return []
  const is_local = songStore.isLocal(props.song)
  const is_play = songStore.song?.id == props.song?.id
  const is_play_list = songStore.inPlayList(props.song)
  const is_download = songStore.downloadList.find(id => id == props.song?.id)

  const { add_play_list, remove_play_list } = menuOperate

  const down = is_download ? [] : [!is_local ? {
    label: '下载',
    key: 'download',
  } : {
    label: '删除下载',
    key: 'delete_download',
  }];

  const play = is_play && songStore.isPlaying ? {
    label: '暂停',
    key: 'pause',
  } : {
    label: '播放',
    key: 'play',
  }

  // 当前歌曲 和下一首歌曲
  const index = songStore.playList.findIndex(item => item.id == songStore.song?.id)
  const next_index = index == songStore.playList.length - 1 ? 0 : index + 1
  const is_next_song = songStore.playList[next_index]?.id == props.song?.id

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
  return [
    play,
    ...next_play,
    ...add_play_list_item,
    ...down,
    ...remove_play_list_item
  ]
})

</script>