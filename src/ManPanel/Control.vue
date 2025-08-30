<template>
  <footer flex flex-col justify-center w-full select-none absolute overflow-hidden bottom-0 z-200 transition-all :style="{
    height: settingStore.focused ? '70px' : '0px',
    background: backgroundColor,
    color: textColor
  }">
    <!-- 控制 -->
    <div h-35px min-h-35px relative>
      <!-- 用户信息 -->
      <div absolute left-0 top-0 h-full flex-center gap-1 overflow-hidden>
        <NAvatar :style="{
          color: '#000',
          backgroundColor: 'transparent',
        }" cursor-pointer @click="showBottomPanel('setting')" :title="user_title">
          <template #default>
            <img v-show="!!userStore.profile?.avatarUrl" :src="userStore.profile?.avatarUrl" />
            <NButton v-show="!userStore.profile?.avatarUrl" text :color="textColor">
              <template #icon>
                <i i-solar:user-rounded-outline w20px h20px></i>
              </template>
            </NButton>
          </template>
        </NAvatar>
        <NButton @click="showBottomPanel('song_list')" text title="底部播放列表" :color="textColor">
          <template #icon>
            <i i-mdi:menu w20px h20px></i>
          </template>
        </NButton>
      </div>
      <div text-red-600 w-full h-full flex-center gap-8px>
        <NButton text :color="textColor" @click="playPrev">
          <template #icon>
            <i origin-center rotate-180 i-mdi:skip-forward></i>
          </template>
        </NButton>
        <NButton strong secondary circle type="info" :color="textColor" @click="fn">
          <template #icon>
            <i :class="playIcon"></i>
          </template>
        </NButton>
        <NButton text :color="textColor" @click="playNext">
          <template #icon>
            <i i-mdi:skip-forward></i>
          </template>
        </NButton>
      </div>
      <div h-full absolute right-6px top-0 flex-center gap-6px>
        <NButton text @click="settingStore.showAudioView" :color="textColor">频</NButton>
        <NButton text @click="settingStore.showLyric = !settingStore.showLyric" :color="textColor">词</NButton>
        <NPopover :on-update:show="updateShow" :show-arrow="false" scrollable ref="popoverRef"
          style="height: 100px; width: 20px; padding: 0"
          content-style="height: 100%; width: 100%; display: flex;justify-content: center;padding: 10px 0">
          <template #trigger>
            <NButton text @click="offHandle" :color="textColor">
              <template #icon>
                <i :class="`w-20px h-20px  ${songStore.volume == 0
                  ? 'i-iconoir:sound-off'
                  : 'i-iconoir:sound-min'
                  }`"></i>
              </template>
            </NButton>
          </template>
          <NSlider :tooltip="false" :default-value="0.33" :theme-overrides="sliderSoundThemeOverrides" :step="0.01"
            :max="1" v-model:value="songStore.volume" vertical />
        </NPopover>
      </div>
    </div>
    <!-- 歌曲播放条 -->
    <div h-25px min-h-25px flex justify-center overflow-hidden v-if="songStore.currSong">
      <div px-6px w-full flex-center text-xs text-gray-500>
        <span inline-block mr-1>{{ numToTime(songStore.timer * 1000) }}</span>
        <NSlider :tooltip="false" :default-value="33" :theme-overrides="sliderThemeOverrides" :step="1"
          :max="(songStore.currSong?.dt || 0) / 1000" :disabled="!songStore.currSong" v-model:value="drag"
          :on-dragend="dragEnd" />
        <span inline-block ml-1>{{ numToTime(songStore.currSong?.dt || 0) }}</span>
      </div>
    </div>
  </footer>
</template>

<script setup lang="tsx">
import type { SliderProps } from "naive-ui";
import { ref, computed, useTemplateRef, watchPostEffect } from "vue";
import { useSettingStore } from "@/store/module/setting";
import { useSongStore } from "@/store/module/song";
import { useUserStore } from "@/store/module/user";
import { throttle } from "lodash-es"
import { numToTime } from "@/tools"
type SliderThemeOverrides = NonNullable<SliderProps["themeOverrides"]>;

const songStore = useSongStore();
const settingStore = useSettingStore();
const userStore = useUserStore();
const drag = ref(0);

const playIcon = computed(() => {
  const { playLoading, isPlaying } = songStore
  return playLoading ? 'i-eos-icons-three-dots-loading' : (!isPlaying ? 'i-mdi:play' : 'i-mdi:pause')
})

const backgroundColor = computed(() => {
  const [r, g, b] = settingStore.color.match(/\d+/g)!.map(Number);
  return `rgba(${r}, ${g}, ${b}, 0.75)`
})
const textColor = computed(() => {
  const [r, g, b] = settingStore.color.match(/\d+/g)!.map(Number);
  return `rgba(${255 - r}, ${255 - g}, ${255 - b}, 1)`
})

const user_title = computed(() => {
  if (userStore.cookie) {
    return userStore.profile?.nickname ? userStore.profile?.nickname : "游客"
  }
  return '未登入'
})


watchPostEffect(throttle(() => {
  drag.value = songStore.timer;
  !store.focused && popoverRef.value?.setShow(false);
}, 800))

function dragEnd() {
  songStore.setSeek(drag.value || 0);
}
const playPrev = function () {
  songStore.playNext("prev");
}
const playNext = function () {
  if (songStore.playLoading || !songStore.currSongId) return;
  songStore.playNext("next");
}

const fn = function () {
  if (songStore.playLoading || !songStore.currSongId) return
  !songStore.isPlaying ? songStore.play() : songStore.pause();
}

// 歌曲列表
function showBottomPanel(value: 'song_list' | 'setting') {
  if (settingStore.showBottomPanel === value) {
    settingStore.showBottomPanel = null;
  } else {
    settingStore.showBottomPanel = value;
  }
}

const sliderThemeOverrides = computed<SliderThemeOverrides>(() => {
  return {
    fillColor: textColor.value,
    fillColorHover: textColor.value,
    railHeight: "4px",
    handleSize: "12px",
    handleColor: textColor.value,
  }
});

// 音量
const popoverRef = useTemplateRef("popoverRef");
const store = useSettingStore();

const sliderSoundThemeOverrides = computed<SliderThemeOverrides>(() => {
  return {
    fillColor: textColor.value,
    fillColorHover: textColor.value,
    handleColor: textColor.value,
    railWidthVertical: "8px",
    handleSize: "8px",
  }
});

let oldVolume = songStore.volume;
function offHandle() {
  if (songStore.volume != 0) {
    oldVolume = songStore.volume;
    songStore.volume = 0;
  } else {
    songStore.volume = oldVolume;
  }
  songStore.audioTool?.volume(songStore.volume);
}
const isShowRange = ref(false);

function updateShow(value: boolean) {
  isShowRange.value = value;
}
</script>
