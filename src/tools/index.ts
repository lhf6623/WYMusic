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

/**
 * 切割图片
 */
export function getImgRegion(imgUrl: string): Promise<string> {
  if (!imgUrl) return Promise.reject("请传入图片链接");
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "";
    image.src = imgUrl;
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d");

      ctx?.drawImage(image, 0, 0, canvas.width, canvas.height);

      const imageData = ctx!.getImageData(0, 0, image.width, image.height);

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
}
