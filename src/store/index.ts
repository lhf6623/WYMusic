import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { name, version } from "../../package.json";

export const pinia = createPinia();

pinia.use(piniaPluginPersistedstate);

export const versionKey = (key: string) =>
  `${key}_${name}_${version}`
    .split("")
    .map((item) => {
      // 写一个正则，判断是a-z0-9A-Z的字符，其他字符转为下划线 _
      if (/[a-z0-9A-Z]/.test(item)) {
        return item;
      } else {
        return "_";
      }
    })
    .join("")
    .toLocaleUpperCase();
