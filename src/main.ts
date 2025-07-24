import { createApp } from "vue";
import App from "./App.vue";
import "@unocss/reset/tailwind-compat.css";
import "virtual:uno.css";

import { pinia } from "./store";
import { useSettingStore } from "./store/module/setting";

const app = createApp(App);
app.use(pinia);

const meta = document.createElement("meta");
meta.name = "naive-ui-style";
document.head.appendChild(meta);

app.mount("#app");

(async () => {
  const settingStore = useSettingStore();
  settingStore.localAudioDir = await settingStore.getDefaultAudioDir();
})();
