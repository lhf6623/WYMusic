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
  const box_height = 330;
  const box_width = 330;

  if (!imgUrl) return Promise.reject("请传入图片链接");
  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "Anonymous";
    image.src = imgUrl;
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const region_ratio = {
        x: 1,
        y: 1,
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

      const base64 = canvas.toDataURL("image/png");

      resolve(base64);
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
