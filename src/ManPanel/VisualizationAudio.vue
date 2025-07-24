<template>
  <div class="audio-visualization">
    <canvas ref="canvasRef" class="visualization-canvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useSongStore } from "@/store/module/song";

const songStore = useSongStore();
const canvasRef = ref<HTMLCanvasElement | null>(null);
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let animationId: number | null = null;
let cleanup: (() => void) | undefined = undefined;

// 初始化音频分析器
const initAudioAnalyser = () => {
  if (!songStore.audio) return;

  try {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256; // 控制频率数据的数量
    const source = audioContext.createMediaElementSource(songStore.audio);
    source.connect(analyser);
    analyser.connect(audioContext.destination);
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
  const updateCanvasSize = () => {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  };

  updateCanvasSize();
  window.addEventListener('resize', updateCanvasSize);

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const renderFrame = () => {
    animationId = requestAnimationFrame(renderFrame);
    analyser!.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = canvas.width / bufferLength * 0.8;
    let barHeight;
    let x = 0;

    // 绘制条纹
    for (let i = 0; i < bufferLength; i++) {
      barHeight = (dataArray[i] / 255) * canvas.height;

      // 创建渐变颜色
      const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
      gradient.addColorStop(0, '#4F46E5'); // 顶部颜色
      gradient.addColorStop(1, '#818CF8'); // 底部颜色

      ctx.fillStyle = gradient;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

      x += barWidth + 2; // 条纹间距
    }
  };

  renderFrame();

  // 清理函数
  return () => {
    window.removeEventListener('resize', updateCanvasSize);
    if (animationId) cancelAnimationFrame(animationId);
  };
};

onMounted(async () => {
  await nextTick();
  initAudioAnalyser();
  cleanup = drawVisualization();

  // 监听音频播放事件
  if (songStore.audio) {
    songStore.audio.addEventListener('play', () => {
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
      }
    });
  }

});
onUnmounted(() => {
  cleanup?.();
  if (audioContext) {
    audioContext.close();
  }
});
</script>

<style scoped>
.audio-visualization {
  width: 100%;
  height: 60px;
  /* 可根据需要调整高度 */
  display: flex;
  align-items: center;
  justify-content: center;
}

.visualization-canvas {
  width: 100%;
  height: 100%;
  background: transparent;
  border-radius: 4px;
}
</style>