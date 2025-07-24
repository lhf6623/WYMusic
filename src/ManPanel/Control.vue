<template>
  <footer h-50px w-full select-none absolute bottom-0 z-50 bg="#edebeb" v-show="settingStore.focused">
    <!-- 控制 -->
    <div h-35px relative>
      <div absolute left-0 top-0 h-full flex-center gap-1 overflow-hidden>
        <NAvatar :style="{
          color: '#000',
          backgroundColor: 'transparent',
        }" cursor-pointer @click="showBottomPanel('setting')" :title="user_title">
          <template #default>
            <img v-if="!!userStore.profile?.avatarUrl" :src="userStore.profile?.avatarUrl" />
            <i i-solar:user-rounded-outline w20px h20px v-else></i>
          </template>
        </NAvatar>
        <NButton @click="showBottomPanel('song_list')" text title="底部播放列表">
          <template #icon>
            <i i-mdi:menu w20px h20px></i>
          </template>
        </NButton>
      </div>
      <div text-red-600 w-full h-full flex-center>
        <NButton text color="#dc2626" @click="playPrev">
          <template #icon>
            <i origin-center rotate-180 i-mdi:skip-forward></i>
          </template>
        </NButton>
        <NButton text color="#dc2626" @click="fn">
          <i mx-12px text-3xl :class="!songStore.isPlaying ? 'i-mdi:play' : 'i-mdi:pause'"></i>
        </NButton>
        <NButton text color="#dc2626" @click="playNext">
          <template #icon>
            <i i-mdi:skip-forward></i>
          </template>
        </NButton>
      </div>
      <div h-full absolute right-6px top-0 flex-center gap-6px>
        <NButton text @click="likeSong" :disabled="!songStore.song">
          <template #icon>
            <i :class="isLike ? 'i-flat-color-icons:like' : 'i-mdi:heart-outline'" w20px h20px></i>
          </template>
        </NButton>

        <NButton text @click="songStore.showLyric = !songStore.showLyric">词</NButton>
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
    <div h-15px flex justify-center overflow-hidden>
      <div px-10px w-full>
        <NSlider :tooltip="false" :default-value="33" :theme-overrides="sliderThemeOverrides" :step="1"
          :max="(songStore.song?.dt || 0) / 1000" :disabled="!songStore.song" v-model:value="drag"
          :on-dragend="dragEnd" />
      </div>
    </div>
  </footer>
</template>

<script setup lang="tsx">
import { NButton, NPopover, NSlider, SliderProps, NAvatar } from "naive-ui";
import { ref, watch, computed, useTemplateRef, onMounted } from "vue";
import { useSettingStore } from "@/store/module/setting";
import { useSongStore } from "@/store/module/song";
import { useUserStore } from "@/store/module/user";
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
  drag.value = songStore.currentTime;
});

watch(
  () => songStore.currentTime,
  (val) => {
    if (drag.value === songStore.currentTime) return;
    drag.value = val;
  }
);

function dragEnd() {
  songStore.setCurrentTime(drag.value || 0);
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
  railHeight: "2px",
  handleSize: "8px",
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

  songStore.audio!.volume = songStore.volume;
}

watch(() => songStore.volume, () => {
  songStore.audio!.volume = songStore.volume;
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
