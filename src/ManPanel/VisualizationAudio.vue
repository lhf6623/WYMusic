<template>
  <div wfull h60px flex-center>
    <canvas ref="canvasRef" wfull hfull bg-transparent rounded-4px></canvas>
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef, onUnmounted, nextTick, computed, watch, onMounted } from 'vue';
import { useSongStore } from "@/store/module/song";
import { useSettingStore } from "@/store/module/setting";
import { Howler } from "howler"

const songStore = useSongStore();
const settingStore = useSettingStore();
const canvasRef = useTemplateRef<HTMLCanvasElement>('canvasRef');
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let animationId: number | null = null;
let cleanup: (() => void) | undefined = undefined;
let gainNode: GainNode | null = null;


// 条纹顶部色
const stripeTopColor = computed(() => {
  if (!settingStore.color) return 'rgb(0, 0, 0)'
  const [r, g, b] = settingStore.color.match(/\d+/g)!.map(Number);
  // 顶部颜色取反
  return `rgb(${255 - r}, ${255 - g}, ${255 - b})`
})

// 初始化音频分析器
const initAudioAnalyser = () => {
  if (!Howler.ctx) return;

  try {
    audioContext = Howler.ctx
    // 创建独立增益节点
    gainNode = audioContext.createGain();
    gainNode.gain.value = 1.0; // 明确设置增益值

    analyser = audioContext.createAnalyser();
    Howler.masterGain.disconnect();
    Howler.masterGain.connect(gainNode);
    gainNode.connect(analyser);
    gainNode.connect(audioContext.destination);

    analyser.fftSize = 256; // 控制频率数据的数量
  } catch (error) {
    console.error('音频可视化初始化失败:', error);
  }
};

// 绘制音频可视化条纹
const drawVisualization = () => {
  if (!canvasRef.value || !analyser) return;

  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 设置canvas尺寸
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const renderFrame = () => {
    animationId = requestAnimationFrame(renderFrame);
    analyser!.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = Math.floor(canvas.width / bufferLength * 0.8);

    let barHeight;
    let x = 0;
    // 绘制条纹
    for (let i = 0; i < bufferLength; i++) {
      barHeight = (dataArray[i] / 255) * canvas.height;

      // 创建渐变颜色
      const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
      gradient.addColorStop(0, stripeTopColor.value); // 顶部颜色
      gradient.addColorStop(1, settingStore.color); // 底部颜色

      ctx.fillStyle = gradient;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

      x += barWidth + 2; // 条纹间距
    }

    if (!settingStore.focused) {
      const progress = songStore.timer / ((songStore.currSong?.dt ?? 0) / 1000)

      // 进度条
      const gradient = ctx.createLinearGradient(0, canvas.height - 2, canvas.width * progress, canvas.height - 2);
      gradient.addColorStop(0, settingStore.color); // 顶部颜色
      gradient.addColorStop(1, stripeTopColor.value); // 底部颜色
      ctx.fillStyle = gradient;
      ctx.fillRect(0, canvas.height - 2, canvas.width * progress, 2);
    }
  };

  renderFrame();
  // 清理函数
  return () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null
    }
    if (gainNode) {
      Howler.masterGain.disconnect();
      gainNode.disconnect();
      Howler.masterGain.connect(Howler.ctx.destination);
    }
    /** 清空画布中的内容 */
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };
};

watch(() => songStore.isPlaying, () => {
  if (songStore.isPlaying) {
    init()
  } else {
    cleanup?.();
  }
})

const init = async () => {
  await nextTick();
  if (cleanup) {
    cleanup()
  }
  initAudioAnalyser();
  setTimeout(() => {
    cleanup = drawVisualization()
  }, 0);
}
onMounted(() => {
  if (songStore.howl?.playing()) {
    init()
  }
})
onUnmounted(() => {
  cleanup?.();
});
</script>