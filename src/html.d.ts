import type { AttributifyAttributes } from "@unocss/preset-attributify";
// import { MessageApiInjection } from "naive-ui"

declare module "vue" {
  interface HTMLAttributes extends AttributifyAttributes {}
}
