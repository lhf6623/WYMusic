import {
  defineConfig,
  presetMini,
  presetAttributify,
  presetIcons,
} from "unocss";
import transformerAttributifyJsx from "@unocss/transformer-attributify-jsx";

export default defineConfig({
  presets: [
    presetMini(),
    presetAttributify(),
    presetIcons({
      // cdn: "https://esm.sh/",
      extraProperties: {
        scale: "1.2,",
        display: "inline-block",
        "vertical-align": "middle",
      },
      prefix: "i-",
    }),
  ],
  safelist: [
    "i-iconoir:sound-off",
    "i-iconoir:accessibility-sign",
    "i-iconoir:sound-min",
    "i-bi:pause-fill",
  ],
  transformers: [transformerAttributifyJsx()],
  shortcuts: {
    // 文本省略
    "n-ellipsis": "overflow-hidden whitespace-nowrap text-ellipsis",
    "flex-center": "flex items-center justify-center",
  },
});
