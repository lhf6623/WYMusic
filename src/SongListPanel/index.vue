<template>
  <div relative overflow-hidden h330px w330px>
    <NTabs tab-style="margin-left: 6px" :value="active" default-value="playList" :on-update:value="handleTabChange">
      <NTabPane name="playList" tab="播放" display-directive="show:lazy">
        <SongList :list="songStore.playList" type="playList" :activeType="active" @clear="clearList"></SongList>
      </NTabPane>
      <NTabPane v-if="settingStore.testApiAudioUrl" name="dailyList" tab="每日" display-directive="show:lazy">
        <SongList :list="songStore.dailyList" :loaging="dailyLoading" type="dailyList" :activeType="active"
          @playAll="playAll"></SongList>
      </NTabPane>
      <NTabPane name="localList" tab="本地" display-directive="show:lazy">
        <SongList :list="songStore.localList" type="localList" :activeType="active" @playAll="playAll"></SongList>
      </NTabPane>
      <NTabPane v-if="settingStore.testApiAudioUrl" name="search" tab="搜索" display-directive="show:lazy">
        <SongList :list="searchList" :loaging="searchLoaging" type="search" :activeType="active" @search="handleSearch">
        </SongList>
      </NTabPane>
    </NTabs>

    <MenuAbility :songId="menuData.songId" :show="menuData.show" :x="menuData.x" :y="menuData.y"></MenuAbility>
  </div>
</template>

<script setup lang="tsx">
import { computed, provide, reactive, ref, watch } from "vue";
import { useSongStore } from "@/store/module/song";
import { useUserStore } from "@/store/module/user";
import { useSettingStore } from "@/store/module/setting";
import SongList from "./SongList.vue";
import { search } from "@/api/songs";
import MenuAbility from "./MenuAbility.vue";
import { menuKey } from "./useMenuContext"

const songStore = useSongStore();
const userStore = useUserStore();
const settingStore = useSettingStore();
const active = ref<TabsType>("playList");
const searchLoaging = ref(false);
const dailyLoading = ref(false);
const menuData = reactive<{
  x: number,
  y: number,
  songId: string | null,
  show: boolean
}>({
  x: 0,
  y: 0,
  songId: null,
  show: false
})
/** 搜索 */
const searchList = ref<string[]>([])

const menuOperate = reactive({
  /** 添加到播放列表 */
  add_play_list: false,
  /** 从播放列表移除 */
  remove_play_list: active.value == 'playList',
});

function selectMenu(key: MenuOperateType, songID: string | null) {

  if (!songID) return

  // 暂停 播放
  if (key === 'pause') {
    songStore.pause()
  }
  if (key === 'play') {
    // 如果没有在播放列表 添加到播放列表并且播放
    // 如果在播放列表 直接播放
    if (!songStore.inPlayList(songID)) {
      songStore.addPlayList(songID)
    }
    setTimeout(() => {
      songStore.play(songID)
    }, 1000);
  }
  // 添加到下一首
  if (key === 'next_play') {
    const play_list = songStore.playList.flatMap(id => {
      if (id == songStore.currSongKey) return [id, songID]
      if (id == songID) return []
      return [id]
    })

    songStore.addPlayList(play_list)
  }
  // 添加到播放列表
  if (key === 'add_play_list') {
    songStore.addPlayList(songID)
  }

  // 从列表中移除
  if (key === 'remove_play_list') {
    songStore.removePlayList(songID)
  }
  // 下载
  if (key === 'download') {
    songStore.downSong(songID)
  }
  // 删除
  if (key === 'delete') {
    songStore.delSong(songID, active.value)
  }
}
function showMenu(songId: string | null, x: number, y: number, show: boolean) {
  menuData.songId = songId;
  menuData.x = x;
  menuData.y = y;
  menuData.show = show;
}
watch(() => settingStore.showBottomPanel, () => {
  showMenu(null, 0, 0, false)
})
provide(menuKey, {
  menuOperate,
  menuData: computed(() => ({ ...menuData })).value,
  showMenu,
  selectMenu
})

// 是否登入
const isLogin = computed(() => {
  return !!userStore.cookie;
});

watch(() => settingStore.testApiAudioUrl, (val) => {
  if (!val) {
    handleTabChange('localList')
    searchList.value = []
  }
})
async function handleTabChange(value: TabsType) {
  menuOperate.add_play_list = true;
  menuOperate.remove_play_list = false;

  active.value = value;
  if (value == 'dailyList' && !songStore.dailyList.length) {
    // 每日推荐
    dailyLoading.value = true
    songStore.getDailyList().then(() => {
      dailyLoading.value = false
    })
  }

  if (value == 'playList' && isLogin) {
    menuOperate.add_play_list = false;

    menuOperate.remove_play_list = true;

  }
}

watch(() => userStore.cookie, songStore.getDailyList)

function handleSearch(value: string) {
  // 搜索列表的事件
  const query = value.trim();
  if (!query.length) {
    searchList.value = [];
    return;
  }
  searchLoaging.value = true;
  search(query).then((search_list) => {

    searchLoaging.value = false;
    searchList.value = search_list.map(item => item.id)
  });
}
async function playAll() {
  if (active.value == 'playList') return
  // 除了播放列表和搜索列表都显示
  let list: (string)[] = []
  if (active.value == 'dailyList') {
    list = songStore.dailyList
  }
  if (active.value == 'localList') {
    list = songStore.localList
  }

  songStore.addPlayList(list);

  setTimeout(() => {
    songStore.play(list[0]);
  }, 1000);

}
function clearList() {
  // 清除按钮只有在播放列表中显示
  songStore.removePlayList(songStore.playList);
}
</script>
