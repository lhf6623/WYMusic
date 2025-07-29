<template>
  <div relative overflow-hidden h330px w330px>
    <NTabs tab-style="margin-left: 6px" :value="active" default-value="play_list" :on-update:value="handleTabChange">
      <NTabPane name="play_list" tab="播放" display-directive="show:lazy">
        <SongList :list="songStore.playList" :loaging="loaging" type="play_list" @clear="clearList"></SongList>
      </NTabPane>
      <NTabPane v-if="settingStore.testApiAudioUrl" name="daily" tab="每日" display-directive="show:lazy">
        <SongList :list="dailyList" :loaging="loaging" type="daily" @playAll="playAll"></SongList>
      </NTabPane>
      <NTabPane v-if="songStore.localList.length" name="download" tab="本地" display-directive="show:lazy">
        <SongList :list="songStore.localList" :loaging="loaging" type="download" @playAll="playAll"></SongList>
      </NTabPane>
      <NTabPane v-if="isLogin && settingStore.testApiAudioUrl" name="like" tab="喜欢" display-directive="show:lazy">
        <SongList :list="songStore.likeList" :loaging="loaging" type="like" @playAll="playAll"></SongList>
      </NTabPane>
      <NTabPane v-if="settingStore.testApiAudioUrl" name="search" tab="搜索" display-directive="show:lazy">
        <SongList :list="searchList" :loaging="loaging" type="search" @search="handleSearch"></SongList>
      </NTabPane>
    </NTabs>

    <MenuAbility :song="menu_data.song" :show="menu_data.show" :x="menu_data.x" :y="menu_data.y"></MenuAbility>
  </div>
</template>

<script setup lang="tsx">
import { getRecommendSongs } from "@/tools/api_songs";
import { computed, provide, reactive, ref, watch } from "vue";
import { useSongStore } from "@/store/module/song";
import { useUserStore } from "@/store/module/user";
import { useSettingStore } from "@/store/module/setting";
import SongList from "./SongList.vue";
import { search } from "@/tools/api_songs";
import MenuAbility from "./MenuAbility.vue";

const songStore = useSongStore();
const userStore = useUserStore();
const settingStore = useSettingStore();
const active = ref<TabsType>("play_list");
const loaging = ref(false);
const menu_data = reactive<{
  x: number,
  y: number,
  song: SongType | null,
  show: boolean
}>({
  x: 0,
  y: 0,
  song: null,
  show: false
})
/** 每日推荐 */
const dailyList = ref<SongType[]>([])
/** 搜索 */
const searchList = ref<SongType[]>([])

const menuOperate = reactive({
  /** 添加到播放列表 */
  add_play_list: false,
  /** 从播放列表移除 */
  remove_play_list: active.value == 'play_list',
});
// 菜单项显示
provide("menuOperate", menuOperate);
provide("showMenuAbility", (song: SongType | null, x: number, y: number, show: boolean) => {
  menu_data.song = song;
  menu_data.x = x;
  menu_data.y = y;
  menu_data.show = show;
})
provide('menuOperateFn', async (key: MenuOperateType, song: SongType | null) => {

  if (!song) return
  // 下载 删除 不在菜单中展示的下载
  if (key === 'download_null') {
    // const _song = await songStore.download(song)
    if (song) {
      changeList(song)
    }
  }
  if (key == 'download') {
    const _song = await songStore.download(song)
    if (_song) {
      changeList(_song)
    }
  }

  if (key === 'delete_download') {
    const _song = await songStore.deleteFile(song.id)
    if (_song) {
      changeList(_song)
    }
  }
  // 暂停 播放
  if (key === 'pause') {
    songStore.pause()
  }
  if (key === 'play') {
    // 如果没有在播放列表 添加到播放列表并且播放
    // 如果在播放列表 直接播放
    if (!songStore.inPlayList(song)) {
      songStore.addPlayList(song)
    }
    setTimeout(() => {
      songStore.play(song)
    }, 1000);
  }
  // 添加到下一首
  if (key === 'next_play') {
    const play_list = songStore.playList.flatMap(item => {
      if (item.id == songStore.song?.id) return [item, song]
      if (item.id == song?.id) return []
      return [item]
    })

    songStore.addPlayList(play_list)
  }
  // 添加到播放列表
  if (key === 'add_play_list') {
    songStore.addPlayList(song)
  }

  // 从列表中移除
  if (key === 'remove_play_list') {
    songStore.removePlayList(song)
  }
})
// 这里处理 删除，下载 后的歌曲信息替换
function changeList(song: SongType) {
  let list: SongType[] = []
  if (active.value == 'play_list') {
    list = songStore.playList
  } else if (active.value == 'daily') {
    list = dailyList.value
  } else if (active.value == 'download') {
    list = songStore.localList
  } else if (active.value == 'like') {
    list = songStore.likeList
  } else if (active.value == 'search') {
    list = searchList.value
  }

  if (active.value != 'play_list') {
    list.forEach(item => {
      if (item.id == song.id) {
        Object.assign(item, song)
      }
    })
  }
  songStore.playList = songStore.playList.map(item => {
    return item.id == song.id ? song : item
  })

  if (song.id == songStore.song?.id) {
    songStore.song = song
  }
}

// 是否登入
const isLogin = computed(() => {
  return !!userStore.cookie;
});

watch(() => settingStore.testApiAudioUrl, (val) => {
  if (!val) {
    handleTabChange('download')
    songStore.likeList = []
    searchList.value = []
  }
})
async function handleTabChange(value: TabsType) {
  menuOperate.add_play_list = true;
  menuOperate.remove_play_list = false;

  active.value = value;
  if (value == 'daily' && !dailyList.value.length) {
    // 每日推荐
    getDailyList()
  }

  if (value === "play_list" && isLogin) {
    menuOperate.add_play_list = false;

    menuOperate.remove_play_list = true;

  }
}

async function getDailyList() {
  dailyList.value = []
  loaging.value = true
  await getRecommendSongs().then(list => {
    dailyList.value = list.map(item => {
      const song = songStore.localList.find(song => song.id == item.id)
      if (song) return song
      return item
    })
  }).finally(() => {
    loaging.value = false
  })
}

watch(() => userStore.cookie, getDailyList)

function handleSearch(value: string) {
  // 搜索列表的事件
  const query = value.trim();
  if (!query.length) {
    searchList.value = [];
    return;
  }
  loaging.value = true;
  search(query).then((search_list) => {

    loaging.value = false;
    searchList.value = search_list.map(item => {
      const song = songStore.localList.find(song => song.id == item.id)
      if (song) return song
      return item
    })
  });
}
async function playAll() {
  if (active.value == 'play_list') return
  // 除了播放列表和搜索列表都显示
  let list: SongType[] = []
  if (active.value == 'daily') {
    list = dailyList.value
  }
  if (active.value == 'download') {
    list = songStore.localList
  }
  if (active.value == 'like') {
    list = songStore.likeList
  }

  songStore.addPlayList(list);

  songStore.getCurrentSongInfo(list[0])
  setTimeout(() => {
    songStore.play(list[0]);
  }, 1000);

}
function clearList() {
  // 清除按钮只有在播放列表中显示
  songStore.removePlayList(songStore.playList);
}
</script>
