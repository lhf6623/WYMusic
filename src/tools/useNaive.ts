import {
  NButton,
  create,
  NImage,
  NInput,
  NAvatar,
  NForm,
  NScrollbar,
  NSwitch,
  NSpin,
  NInputGroup,
  NPopconfirm,
  NPopover,
  NProgress,
  NSlider,
  NTabs,
  NTabPane,
  NDropdown,
  NMessageProvider,
  NLoadingBarProvider,
  NConfigProvider,
} from "naive-ui";
import { App } from "vue";

export const useNaive = (app: App) => {
  const meta = document.createElement("meta");
  meta.name = "naive-ui-style";
  document.head.appendChild(meta);

  const naive = create({
    components: [
      NButton,
      NImage,
      NInput,
      NAvatar,
      NForm,
      NInputGroup,
      NScrollbar,
      NSwitch,
      NSpin,
      NInputGroup,
      NPopconfirm,
      NPopover,
      NSlider,
      NTabs,
      NTabPane,
      NDropdown,
      NMessageProvider,
      NLoadingBarProvider,
      NConfigProvider,
      NProgress,
    ],
  });

  app.use(naive);
};
