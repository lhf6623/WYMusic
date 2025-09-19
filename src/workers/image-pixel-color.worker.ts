interface WorkerMessage {
  data: Uint8ClampedArray;
}
function getRgba(data: Uint8ClampedArray, index: number) {
  const r = data[index];
  const g = data[index + 1];
  const b = data[index + 2];
  return `rgba(${r}, ${g}, ${b})`;
}
// 统计图片上的颜色，返回数组，第一个是出现次数最多的颜色
const analyze = (data: Uint8ClampedArray) => {
  const colorCount: Record<string, number> = {};
  // 需要的是 4 的倍数
  let left = 0;
  let right = data.length;

  while (left < right) {
    if (data[left + 3] === 0) {
      left += 4;
      continue;
    }
    if (data[right] === 0) {
      right -= 4;
      continue;
    }
    const left_rgba = getRgba(data, left);
    if (left_rgba) {
      colorCount[left_rgba] = (colorCount[left_rgba] || 0) + 1;
    }
    const right_rgba = getRgba(data, right - 4);
    if (right_rgba) {
      colorCount[right_rgba] = (colorCount[right_rgba] || 0) + 1;
    }
    left += 4;
    right -= 4;
  }
  let max_value: [string, number] = ["", 0];

  for (const key in colorCount) {
    const count = colorCount[key];
    if (count > max_value[1]) {
      max_value = [key, count];
    }
  }

  return max_value[0];
};
self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { data } = e.data;

  self.postMessage({ colors: analyze(data) });
};
