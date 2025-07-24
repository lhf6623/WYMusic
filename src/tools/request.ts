import { useUserStore } from "@/store/module/user";
import { useSettingStore } from "@/store/module/setting";

type ExtractFunctions<T> = {
  [P in keyof T]: T[P] extends (...args: any) => any ? P : never;
}[keyof T];

type NeteaseCloudMusicApi = typeof import("NeteaseCloudMusicApi");

// 找出是函数的集合
type MusicApiEvents = Pick<
  NeteaseCloudMusicApi,
  ExtractFunctions<NeteaseCloudMusicApi>
>;

export const musicApi = <T>({
  key,
  controller,
  args,
}: {
  key: keyof MusicApiEvents;
  controller?: AbortController;
  args?: Parameters<MusicApiEvents[keyof MusicApiEvents]>[0];
}) => {
  const _key = key.split("_").join("/");
  console.log(_key);
  const { needCookie = true, ..._args } = args ?? ({} as any);
  window.$loadingBar.start();
  return new Promise<T>(async (resolve, reject) => {
    const store = useUserStore();
    const settingStore = useSettingStore();

    try {
      const temp = _args;
      if (needCookie !== false) {
        temp.cookie = store.cookie ?? "";
      }
      const params_str = Object.keys(temp)
        .map((key) => `${key}=${temp[key]}`)
        .join("&");
      const url = `${settingStore.apiAudioUrl}/${_key}?${params_str}&realIP=116.25.146.177`;

      const _q = await fetch(url, {
        signal: controller?.signal,
      }).then((res) => res.json());

      const { code, msg, message } = _q;
      if (code === 200 || code >= 800 || _key == "login/status") {
        resolve(_q);
      } else {
        window.$message.error(msg || message || "接口报错");
        console.log("接口报错", _key, _q);

        reject(_q);
      }
    } catch (e: any) {
      console.log("接口报错", _key, e);
      reject(e);
      window.$loadingBar.error();
      // window.$message.error(e.message);
    } finally {
      window.$loadingBar.finish();
    }
  });
};
