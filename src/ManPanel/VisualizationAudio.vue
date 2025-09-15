<template>
  <div wfull h60px flex-center>
    <canvas ref="canvasRef" wfull hfull bg-transparent rounded-4px></canvas>
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef, onUnmounted, watchPostEffect } from 'vue';
import { useSongStore } from "@/store/module/song";
import { useSettingStore } from "@/store/module/setting";

const songStore = useSongStore();
const settingStore = useSettingStore();
const canvasRef = useTemplateRef<HTMLCanvasElement>('canvasRef');
let animationId: number | null = null;
let cleanup: (() => void) | undefined = undefined;

const props = defineProps<{
  song: null | LocalMp3FileInfo,
}>()

// 绘制音频可视化条纹
const drawVisualization = () => {
  if (!canvasRef.value || !songStore.audioTool?.analyser) return;
  const analyser = songStore.audioTool?.analyser

  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 设置canvas尺寸
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  analyser.fftSize = 256; // 控制频率数据的数量
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
      gradient.addColorStop(0, settingStore.textColor); // 顶部颜色
      gradient.addColorStop(1, settingStore.color); // 底部颜色

      ctx.fillStyle = gradient;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

      x += barWidth + 2; // 条纹间距
    }

    if (!settingStore.focused) {
      const progress = songStore.timer / ((props.song?.dt ?? 0) / 1000)

      // 进度条
      const gradient = ctx.createLinearGradient(0, canvas.height - 2, canvas.width * progress, canvas.height - 2);
      gradient.addColorStop(0, settingStore.color); // 顶部颜色
      gradient.addColorStop(1, settingStore.textColor); // 底部颜色
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
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };
};

watchPostEffect(() => {
  if (cleanup) { cleanup?.() }
  if (songStore.isPlaying) {
    cleanup = drawVisualization()
  }
})

onUnmounted(() => {
  cleanup?.();
});
</script>