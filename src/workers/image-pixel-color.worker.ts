self.onmessage = async (e) => {
  const { data } = e.data;
  // 统计图片上的颜色，返回数组，第一个是出现次数最多的颜色
  const analyze = (data: ImageData) => {
    const colorCount: Record<string, number> = {};
    // 使用双指针，效率提高一倍
    let left = 0;
    let right = data.data.length - 4;
    while (left <= right) {
      const r = data.data[left];
      const g = data.data[left + 1];
      const b = data.data[left + 2];
      const a = data.data[left + 3];
      if (a === 0) {
        left += 4;
        continue;
      }
      const color = `rgb(${r}, ${g}, ${b})`;
      colorCount[color] = (colorCount[color] || 0) + 1;
      left += 4;
      right -= 4;
    }
    const sortedColors = Object.keys(colorCount).sort(
      (a, b) => colorCount[b] - colorCount[a]
    );
    return sortedColors;
  };

  self.postMessage({ colors: analyze(data) });
};
