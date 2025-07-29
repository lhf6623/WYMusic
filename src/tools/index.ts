import analyze from "rgbaster";

export function getSongName(song: SongType) {
  const { name, singer, id } = song;
  const _singer = singer.join(" ");
  const fileName = `${name}-${_singer}-${id}`;
  return `${fileName}.mp3`;
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
): Promise<string> {
  if (!imgUrl) return Promise.reject("请传入图片链接");
  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "";
    image.src = imgUrl;
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = imgRegion?.width || image.width;
      canvas.height = imgRegion?.height || image.height;
      const ctx = canvas.getContext("2d");

      ctx?.drawImage(
        image,
        imgRegion?.x || 0,
        imgRegion?.y || 0,
        canvas.width,
        canvas.height
      );

      const imageData = ctx!.getImageData(
        imgRegion?.x || 0,
        imgRegion?.y || 0,
        canvas.width,
        canvas.height
      );

      // 保存图片
      const sliceCanvas = document.createElement("canvas");
      const sliceCtx = sliceCanvas.getContext("2d");

      // 这个 API 绘制的图片不需要提供宽高，默认是图片的宽高
      sliceCtx?.putImageData(imageData, 0, 0);

      resolve(sliceCanvas.toDataURL());
    };

    image.onerror = () => {
      reject("图片加载失败");
    };
  });
  return await analyze(img).then((res: [{ color: string }]) => {
    const [imgObj] = res;

    return imgObj?.color;
  });
}
