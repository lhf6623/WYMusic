import { createApp } from "vue";
import App from "./App.vue";
import "@unocss/reset/tailwind-compat.css";
import "virtual:uno.css";
import { useNaive } from "./tools/useNaive";

import { pinia } from "./store";
import { useSettingStore } from "./store/module/setting";

const app = createApp(App);
app.use(pinia);

useNaive(app);
app.mount("#app");

(async () => {
  const settingStore = useSettingStore();
  settingStore.localAudioDir = await settingStore.getDefaultAudioDir();
})();
