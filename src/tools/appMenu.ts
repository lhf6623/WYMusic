import { Menu, PredefinedMenuItem, Submenu } from "@tauri-apps/api/menu";
import { defaultWindowIcon } from "@tauri-apps/api/app";

export async function createAppMenu() {
  const about = await PredefinedMenuItem.new({
    text: "关于",
    item: {
      About: {
        icon: (await defaultWindowIcon())!,
      },
    },
  });

  const separator = await PredefinedMenuItem.new({
    item: "Separator",
  });

  const quit = await PredefinedMenuItem.new({
    text: "退出",
    item: "Quit",
  });
  const editSubmenu = await Submenu.new({
    text: "wy-music",
    items: [about, separator, quit],
  });
  const menu = await Menu.new({
    items: [editSubmenu],
  });

  await menu.setAsAppMenu();
}
