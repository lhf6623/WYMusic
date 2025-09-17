import { TrayIcon, TrayIconEvent, TrayIconOptions } from "@tauri-apps/api/tray";
import { useSettingStore } from "@/store/module/setting";
import { defaultWindowIcon } from "@tauri-apps/api/app";
import { Menu } from "@tauri-apps/api/menu";
import { window as tauriWindow } from "@tauri-apps/api";

export async function createAppTray() {
  const setting = useSettingStore();
  const app = tauriWindow.getCurrentWindow();

  if (setting.tray) {
    const tray = await TrayIcon.getById(setting.tray.id);
    if (tray) {
      if (import.meta.env.DEV) {
        TrayIcon.removeById(tray.id);
      } else {
        return;
      }
    }
  }

  const icon = await defaultWindowIcon();

  // 创建基础菜单
  const createMenu = async (showShowApp: boolean) => {
    const menuItems = [];

    if (showShowApp) {
      menuItems.push({
        id: "show_app",
        text: `显示`,
        action: () => {
          app.show();
          app.setFocus();
        },
      });
    }

    menuItems.push({
      id: "quit",
      text: `关闭`,
      action: () => {
        app.close();
      },
    });

    return await Menu.new({ items: menuItems });
  };

  // 初始菜单，假设应用可能是可见的
  const initialMenu = await createMenu(false);

  const options: TrayIconOptions = {
    icon: icon!,
    menu: initialMenu,
    iconAsTemplate: true,
    showMenuOnLeftClick: false,
    action: async (event) => {
      const excludeTypes: TrayIconEvent["type"][] = [
        "Leave",
        "Move",
        "DoubleClick",
      ];
      if (excludeTypes.includes(event.type)) return;

      const isVisible = await app.isVisible();

      if (event.type === "Click" && event.button === "Left") {
        if (!isVisible) {
          app.show();
          app.setFocus();
        }
        return;
      }

      // 悬停时更新菜单
      if (event.type === "Enter") {
        const newMenu = await createMenu(!isVisible);
        tray.setMenu(newMenu);
      }
    },
  };

  const tray = await TrayIcon.new(options);
  setting.tray = tray;
}
