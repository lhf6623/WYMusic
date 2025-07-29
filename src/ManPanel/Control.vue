<template>
  <footer flex flex-col justify-center w-full select-none absolute overflow-hidden bottom-0 z-200 transition-all
    bg="#edebeb" :style="{
      height: settingStore.focused ? '70px' : '0px',
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
            <NButton v-show="!userStore.profile?.avatarUrl" text>
              <template #icon>
                <i i-solar:user-rounded-outline w20px h20px></i>
              </template>
            </NButton>
          </template>
        </NAvatar>
        <NButton @click="showBottomPanel('song_list')" text title="底部播放列表">
          <template #icon>
            <i i-mdi:menu w20px h20px></i>
          </template>
        </NButton>
      </div>
      <div text-red-600 w-full h-full flex-center gap-8px>
        <NButton text color="#dc2626" @click="playPrev">
          <template #icon>
            <i origin-center rotate-180 i-mdi:skip-forward></i>
          </template>
        </NButton>
        <NButton circle color="#dc2626" @click="fn" mx-12px>
          <template #icon>
            <i :class="!songStore.isPlaying ? 'i-mdi:play' : 'i-mdi:pause'"></i>
          </template>
        </NButton>
        <NButton text color="#dc2626" @click="playNext">
          <template #icon>
            <i i-mdi:skip-forward></i>
          </template>
        </NButton>
      </div>
      <div h-full absolute right-6px top-0 flex-center gap-6px>
        <NButton text @click="likeSong" :disabled="!songStore.song" v-if="settingStore.testApiAudioUrl">
          <template #icon>
            <i :class="isLike ? 'i-flat-color-icons:like' : 'i-mdi:heart-outline'" w20px h20px></i>
          </template>
        </NButton>

        <NButton text @click="settingStore.showAudioView">频</NButton>
        <NButton text @click="settingStore.showLyric = !settingStore.showLyric">词</NButton>
        <NPopover :on-update:show="updateShow" :show-arrow="false" scrollable ref="popoverRef"
          style="height: 100px; width: 20px; padding: 0"
          content-style="height: 100%; width: 100%; display: flex;justify-content: center;padding: 10px 0">
          <template #trigger>
            <NButton text @click="offHandle">
              <template #icon>
                <i :class="`w-20px h-20px hover:text-red-600 ${songStore.volume == 0
                  ? 'i-iconoir:sound-off'
                  : 'i-iconoir:sound-min'
                  } ${isShowRange ? 'text-red-600' : ''}`"></i>
              </template>
            </NButton>
          </template>
          <NSlider :tooltip="false" :default-value="0.33" :theme-overrides="sliderSoundThemeOverrides" :step="0.01"
            :max="1" v-model:value="songStore.volume" vertical />
        </NPopover>
      </div>
    </div>
    <!-- 歌曲播放条 -->
    <div h-25px min-h-25px flex justify-center overflow-hidden v-if="songStore.song">
      <div px-6px w-full flex-center text-xs text-gray-500>
        <span inline-block mr-1>{{ numToTime(songStore.timer * 1000) }}</span>
        <NSlider :tooltip="false" :default-value="33" :theme-overrides="sliderThemeOverrides" :step="1"
          :max="(songStore.song?.dt || 0) / 1000" :disabled="!songStore.song" v-model:value="drag"
          :on-dragend="dragEnd" />
        <span inline-block ml-1>{{ numToTime(songStore.song?.dt || 0) }}</span>
      </div>
    </div>
  </footer>
</template>

<script setup lang="tsx">
import type { SliderProps } from "naive-ui";
import { ref, watch, computed, useTemplateRef, onMounted } from "vue";
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

const user_title = computed(() => {
  if (userStore.cookie) {

    return userStore.profile?.nickname ? userStore.profile?.nickname : "游客"
  }
  return '未登入'
})

onMounted(() => {
  drag.value = songStore.timer;
});

const setDrag = throttle((val) => {
  drag.value = val;
}, 1000);
watch(() => songStore.timer, setDrag);


function dragEnd() {
  songStore.setSeek(drag.value || 0);
}
const playPrev = function () {
  songStore.playNext("prev");
}
const playNext = function () {
  songStore.playNext("next");
}

const fn = function () {
  if (!songStore.song) return
  !songStore.isPlaying ? songStore.play() : songStore.pause();
}

const isLike = computed(() => {
  return !!songStore.isLike(songStore.song);
});

function likeSong() {
  if (!songStore.song) return;
  songStore.likeSong(songStore.song);
}
// 歌曲列表
function showBottomPanel(value: 'song_list' | 'setting') {
  if (settingStore.showBottomPanel === value) {
    settingStore.showBottomPanel = null;
  } else {
    settingStore.showBottomPanel = value;
  }
}

const sliderThemeOverrides: SliderThemeOverrides = {
  fillColor: "rgb(220 38 38 / 1)",
  fillColorHover: "rgb(220 38 38 / 1)",
  railHeight: "4px",
  handleSize: "12px",
  handleColor: "rgb(220 38 38 / 1)",
};

// 音量
const popoverRef = useTemplateRef("popoverRef");
const store = useSettingStore();

const sliderSoundThemeOverrides: SliderThemeOverrides = {
  fillColor: "rgb(220 38 38 / 1)",
  fillColorHover: "rgb(220 38 38 / 1)",
  handleColor: "rgb(220 38 38 / 1)",
  railWidthVertical: "8px",
  handleSize: "8px",
};

let oldVolume = songStore.volume;
function offHandle() {
  if (songStore.volume != 0) {
    oldVolume = songStore.volume;
    songStore.volume = 0;
  } else {
    songStore.volume = oldVolume;
  }

  songStore.howl?.volume(songStore.volume);
}

watch(() => songStore.volume, () => {
  songStore.howl?.volume(songStore.volume);
})
const isShowRange = ref(false);

function updateShow(value: boolean) {
  isShowRange.value = value;
}

watch(
  () => store.focused,
  (data) => {
    !data && popoverRef.value?.setShow(false);
  },
  { deep: true }
);
</script>
