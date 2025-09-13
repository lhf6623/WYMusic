// 创建注入键（使用 Symbol 确保唯一性）
import { InjectionKey } from "vue";
// 定义上下文类型
export interface MenuContext {
  menuOperate: {
    add_play_list: boolean;
    remove_play_list: boolean;
  };
  menuData: {
    x: number;
    y: number;
    songId: string | null;
    show: boolean;
  };
  showMenu: (
    songId: string | null,
    x: number,
    y: number,
    show: boolean
  ) => void;
  selectMenu: (key: MenuOperateType, songId: string | null) => void;
}

export const menuKey: InjectionKey<MenuContext> = Symbol("menu");

// 提供类型化的 inject 函数
import { inject } from "vue";
export function useMenuInject() {
  const context = inject(menuKey);
  if (!context) {
    throw new Error("useMenuInject must be used within a MenuProvider");
  }
  return context;
}
