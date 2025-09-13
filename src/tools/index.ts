import { convertFileSrc } from "@tauri-apps/api/core";

export async function getWebviewFilePath(path: string) {
  if (!path) return "";

  const url = convertFileSrc(path, "asset");

  const worker = new Worker(
    new URL("../workers/fetch-worker.ts", import.meta.url)
  );

  worker.postMessage({ url: url });

  return new Promise<string>((resolve) => {
    // 接收结果
    worker.onmessage = (e) => {
      const { result, type } = e.data;
      if (result) {
        // 从 Worker 接收的 arrayBuffer 创建 blob 和 Object URL
        const blob = new Blob([result], { type });
        const url = URL.createObjectURL(blob);
        resolve(url);
      } else {
        resolve("");
      }
    };
  });
}

export function numToTime(num?: number) {
  if (!num && num !== 0) return "";
  const hour = Math.floor(num / 1000 / 60 / 60) | 0;
  const minute = Math.floor(num / 1000 / 60) | 0;
  const second = Math.floor(num / 1000) % 60 | 0;

  const _h = hour.toString().padStart(2, "0");
  const _m = minute.toString().padStart(2, "0");
  const _s = second.toString().padStart(2, "0");

  return `${hour > 0 ? _h + ":" : ""}${_m}:${_s}`;
}

/** 获取区域图片主颜色 */
export async function getImgColor(
  imgUrl: string,
  imgRegion?: { x: number; y: number; width: number; height: number }
): Promise<string[]> {
  const box_height = 330;
  const box_width = 330;

  if (!imgUrl) return Promise.reject([]);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "Anonymous";
    image.src = imgUrl;
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const region_ratio = {
        x: 0,
        y: 0,
        w: 1,
        h: 1,
      };
      if (imgRegion) {
        // 图片和容器的比例
        region_ratio.h =
          Math.min(box_height, imgRegion.height) /
          Math.max(box_height, imgRegion.height);
        region_ratio.w =
          Math.min(box_width, imgRegion.width) /
          Math.max(box_width, imgRegion.width);
        region_ratio.x = imgRegion.x / box_width;
        region_ratio.y = imgRegion.y / box_width;
      }
      const ctx = canvas.getContext("2d");
      canvas.width = imgRegion?.width ?? image.width;
      canvas.height = imgRegion?.height ?? image.height;

      ctx?.drawImage(
        image,
        image.width * region_ratio.x,
        image.height * region_ratio.y,
        image.width * region_ratio.w,
        image.height * region_ratio.h,
        0,
        0,
        canvas.width,
        canvas.height
      );

      const worker = new Worker(
        new URL("../workers/image-pixel-color.worker.ts", import.meta.url)
      );
      const data = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      // 获取图片上所有 像素 颜色
      worker.postMessage({ data });

      worker.onmessage = (e) => {
        const { colors } = e.data;
        resolve(colors as string[]);
      };
    };

    image.onerror = () => {
      reject([]);
    };
  });
}

export async function getBase64(url: string) {
  // 使用 Image 加载图片
  const image = new Image();
  image.crossOrigin = "Anonymous";
  image.src = url;

  // 等待图片加载完成
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  // 创建 canvas 元素
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;

  // 绘制图片到 canvas
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(image, 0, 0);

  // 转换为 base64 编码
  return canvas.toDataURL("image/jpeg", 0.8);
}

/** 获取 字节 单位 */
export function getByteSize(size: number) {
  const units = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index++;
  }
  return `${size.toFixed(2)} ${units[index]}`;
}
