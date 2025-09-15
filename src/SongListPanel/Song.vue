<template>
  <div hover="bg-#e2e8fe" v-show="show" :data-id="`${type}_${songKey}`" ref="songRef"
    :class="songKey == songStore.currSongKey ? 'bg-#e2e8fe' : ''">
    <div v-if="!song" h50px>加载中...</div>
    <div v-else class="group" flex cursor-pointer select-none @dblclick="play()">
      <p w30px flex-shrink-0 flex-center text="#8990a2" cursor-pointer>
        <span v-if="songStore.currSongKey != songKey">
          <span inline-block group-hover-hidden>{{ index + 1 }}</span>
          <span text-2xl hidden group-hover-inline-block i-mdi-play @click="play()"></span>
        </span>
        <span v-else :class="songStore.isPlaying ? 'i-mdi-pause' : 'i-mdi-play'" text-2xl @click="play()"></span>
      </p>
      <div flex w300px overflow-hidden text="#283248" items-center h50px relative>
        <NImage preview-disabled :src="song?.img" w40px h40px rounded mr4px />
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
  </div>
</template>

<script setup lang="ts">
import { useSongStore } from "@/store/module/song";
import { ref, onMounted, useTemplateRef, onUnmounted, computed } from "vue";
import { numToTime } from "@/tools/index";
import { useMenuInject } from "./useMenuContext"

const songStore = useSongStore();
const { showMenu } = useMenuInject()
const songRef = useTemplateRef<HTMLDivElement>('songRef')

const props = defineProps<{
  index: number;
  songKey: string,
  type: string,
  filter: string
}>();

const song = ref<Mp3FileInfo>()

const show = computed(() => {
  if (!props.filter) return true
  return song.value?.name.includes(props.filter) || song.value?.singer.join('/').includes(props.filter)
})

const intersectionObserver = new IntersectionObserver((entries) => {
  // 如果 intersectionRatio 为 0，则目标在视野外，
  // 我们不需要做任何事情。
  if (entries[0].intersectionRatio <= 0) return;

  get_pic_url();
});
// 这里需要优化一下，在显示的时候才获取地址
const get_pic_url = async () => {
  if (song.value) return
  songStore.getSong(props.songKey).then(res => {
    song.value = res
    songRef.value && song.value && intersectionObserver.unobserve(songRef.value);
  }).catch(() => {

    song.value = undefined
  })
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
  showMenu(props.songKey, e.clientX, e.clientY, true)
}

async function play() {
  // 当前播放歌曲
  if (songStore.currSongKey == props.songKey) {
    // 是否在播放
    if (!songStore.isPlaying) {
      songStore.play()
    } else {
      songStore.pause();
    }
    return;
  }

  // 已经在播放列表
  if (songStore.inPlayList(props.songKey)) {
    songStore.play(props.songKey);
    return;
  }

  songStore.setSeek(0)
  songStore.addPlayList(props.songKey);
  songStore.play(props.songKey);
}
</script>
