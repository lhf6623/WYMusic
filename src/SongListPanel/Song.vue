<template>
  <div hover="bg-#e2e8fe" :data-id="`${song.id}`" class="group flex cursor-pointer select-none"
    @click="setActive(props.index)" @dblclick="play()"
    :style="{ backgroundColor: active == props.index ? '#e2e8fe' : '' }">
    <p w30px flex-shrink-0 flex-center text="#8990a2" cursor-pointer>
      <span v-if="songStore.song?.id != props.song.id" inline-block group-hover:hidden>
        {{ (props.index + 1).toString().padStart(2, "0") }}
      </span>
      <span v-if="songStore.song?.id != props.song.id" text-2xl
        :class="songStore.song?.id != props.song.id ? 'hidden' : ''" group-hover:inline-block i-mdi:play
        @click="play()"></span>

      <span v-if="songStore.song?.id == props.song.id && !songStore.isPlaying" text-2xl i-mdi:play
        @click="play()"></span>
      <span v-if="songStore.song?.id == props.song.id && songStore.isPlaying" text-2xl i-mdi:pause text-16px
        @click="play()"></span>
    </p>
    <div flex w300px overflow-hidden text="#283248" items-center h50px relative>
      <NImage preview-disabled :src="pic_url" w40px h40px rounded mr4px />
      <div flex-1 truncate relative>
        <p truncate>
          {{ song.name }}
        </p>
        <p truncate text="#7b8290 12px">
          {{ song.singer.join('/') }}
        </p>
      </div>
      <div flex-center hfull>
        <div relative text="#8990a2" flex-center gap-6px p4px rounded z-100>

          <div>{{ numToTime(song?.dt) }}</div>
          <div w20px flex-center hfull>
            <span hfull hidden flex-center group-hover:flex>
              <NButton text @click="changeShowMenu">
                <template #icon>
                  <i i-solar:menu-dots-bold></i>
                </template>
              </NButton>
            </span>
          </div>
          <i @click="download()" :class="is_downloading" title="mp3 格式" cursor-pointer></i>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSongStore } from "@/store/module/song";
import { useSettingStore } from "@/store/module/setting";
import { computed, ref, inject, onMounted } from "vue";
import { numToTime } from "@/tools/index";

const songStore = useSongStore();
const settingStore = useSettingStore();

const props = defineProps<{
  active: number | null;
  index: number;
  song: SongType
}>();
const emit = defineEmits<{
  (e: "setActive", index: number): void;
}>();

const downloading = ref(false);
const is_downloading = computed(() => {
  const is_down = songStore.isLocal(props.song)
  const is_download = songStore.downloadList.find(id => id == props.song?.id)
  if (downloading.value || is_download) {
    return "i-eos-icons:three-dots-loading";
  }
  return is_down
    ? "i-mdi:success-circle text-green-5"
    : "i-mdi:download-outline";
});
const pic_url = ref('')

const get_pic_url = async () => {
  if (!props.song.id || !props.song.picUrl) {
    pic_url.value = ''
    return
  }
  if (songStore.isLocal(props.song)) {
    pic_url.value = await settingStore.getWebviewFilePath(props.song.picUrl)
    return
  }

  pic_url.value = props.song.picUrl || '';
}

onMounted(() => {
  get_pic_url()
})

const showMenuAbility = inject<(song: SongType | null, x: number, y: number, show: boolean) => void>("showMenuAbility", () => { });
const menuOperateFn = inject<(key: MenuOperateType, song: SongType | null) => void>("menuOperateFn", () => { });

function changeShowMenu(e: MouseEvent) {
  showMenuAbility(props.song, e.clientX, e.clientY, true)
}

function download() {
  const is_down = songStore.isLocal(props.song)
  if (downloading.value) {
    window.$message.warning("正在下载中");
    return;
  }
  if (is_down) {
    window.$message.warning("已经下载过了");
    return;
  }
  downloading.value = true;
  songStore.download(props.song).then(song => {
    menuOperateFn('download_null', song)
  }).finally(() => {
    downloading.value = false;
  });
}

async function play() {
  const song = props.song
  if (!song) {
    window.$message.warning("数据错误，没有 ID");
    console.log("数据错误，没有 ID");
    return;
  }

  // 当前播放歌曲
  if (songStore.song?.id == song.id) {
    // 是否在播放
    if (!songStore.isPlaying) {
      songStore.play()
    } else {
      songStore.pause();
    }
    return;
  }

  // 已经在播放列表
  if (songStore.inPlayList(song)) {
    songStore.play(song);
    return;
  }

  songStore.addPlayList(song);
  songStore.play(song);
}
function setActive(i: number) {
  emit("setActive", i);
}
</script>
