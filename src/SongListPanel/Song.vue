<template>
  <div hover="bg-#e2e8fe" :data-id="`${props.type}_${songId}`" ref="songRef"
    class="group flex cursor-pointer select-none" @click="setActive(props.index)" @dblclick="play()"
    :class="active == props.index ? 'bg-#e2e8fe' : ''">
    <p w30px flex-shrink-0 flex-center text="#8990a2" cursor-pointer>
      <span v-if="songStore.currSong?.id != props.songId" inline-block group-hover:hidden>
        {{ (props.index + 1).toString().padStart(2, "0") }}
      </span>
      <span v-if="songStore.currSong?.id != props.songId" text-2xl
        :class="songStore.currSong?.id != props.songId ? 'hidden' : ''" group-hover:inline-block i-mdi:play
        @click="play()"></span>

      <span v-if="songStore.currSong?.id == props.songId && !songStore.isPlaying" text-2xl i-mdi:play
        @click="play()"></span>
      <span v-if="songStore.currSong?.id == props.songId && songStore.isPlaying" text-2xl i-mdi:pause text-16px
        @click="play()"></span>
    </p>
    <div flex w300px overflow-hidden text="#283248" items-center h50px relative>
      <NImage preview-disabled :src="pic_url" w40px h40px rounded mr4px />
      <div flex-1 truncate relative>
        <p truncate>
          {{ song?.name }}
        </p>
        <p truncate text="#7b8290 12px">
          {{ song?.singer.join('/') }}
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
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSongStore } from "@/store/module/song";
import { ref, onMounted, computed, useTemplateRef, onUnmounted } from "vue";
import { getWebviewFilePath, numToTime } from "@/tools/index";
import { useMenuInject } from "./useMenuContext"

const songStore = useSongStore();
const { showMenu } = useMenuInject()
const songRef = useTemplateRef<HTMLDivElement>('songRef')

const props = defineProps<{
  active: number | null;
  index: number;
  songId: number | string,
  type: string
}>();
const emit = defineEmits<{
  (e: "setActive", index: number): void;
}>();

const song = computed(() => {
  const song = songStore.allList.find((item) => item.id == props.songId)
  return song
})

const pic_url = ref('')


const intersectionObserver = new IntersectionObserver((entries) => {
  // 如果 intersectionRatio 为 0，则目标在视野外，
  // 我们不需要做任何事情。
  if (entries[0].intersectionRatio <= 0) return;

  get_pic_url();
});
// 这里需要优化一下，在显示的时候才获取地址
const get_pic_url = async () => {
  pic_url.value = await getWebviewFilePath(song.value, 'jpg') ?? ''
  // 展示后，取消监听
  songRef.value && intersectionObserver.unobserve(songRef.value);
}

onMounted(() => {
  if (!songRef.value) return
  intersectionObserver.observe(songRef.value);
})
onUnmounted(() => {
  if (!songRef.value) return
  intersectionObserver.unobserve(songRef.value);
})

function changeShowMenu(e: MouseEvent) {
  showMenu(props.songId, e.clientX, e.clientY, true)
}

async function play() {
  // 当前播放歌曲
  if (songStore.currSongId == props.songId) {
    // 是否在播放
    if (!songStore.isPlaying) {
      songStore.play()
    } else {
      songStore.pause();
    }
    return;
  }

  // 已经在播放列表
  if (songStore.inPlayList(props.songId)) {
    songStore.play(props.songId);
    return;
  }

  songStore.addPlayList(props.songId);
  songStore.play(props.songId);
}
function setActive(i: number) {
  emit("setActive", i);
}
</script>
