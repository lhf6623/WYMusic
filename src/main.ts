import { createApp } from "vue";
import App from "./App.vue";
import "@unocss/reset/tailwind-compat.css";
import "virtual:uno.css";
import { useNaive } from "./tools/useNaive";

import { pinia } from "./store";
import { useSettingStore } from "./store/module/setting";
import { useSongStore } from "./store/module/song";

const app = createApp(App);
app.use(pinia);

useNaive(app);
app.mount("#app");

(async () => {
  const settingStore = useSettingStore();
  if (!settingStore.localAudioDir) {
    settingStore.localAudioDir = await settingStore.getDefaultAudioDir();
  }
  setTimeout(() => {
    const songStore = useSongStore();
    songStore.setupMediaSession();
  }, 0);
})();
