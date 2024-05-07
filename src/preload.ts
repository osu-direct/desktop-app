import { Titlebar, TitlebarColor } from "custom-electron-titlebar";
import { ipcRenderer } from "electron";

window.addEventListener("DOMContentLoaded", () => {
  const titlebar = new Titlebar({
    backgroundColor: TitlebarColor.fromHex("#1e1e2e"),
    itemBackgroundColor: TitlebarColor.fromHex("#121212"),
    enableMnemonics: false,
  });
  titlebar.updateTitle(`osu.direct`);

  window.addEventListener("download", async (e) => {
    const customEvent = e as CustomEvent;
    console.log(customEvent.detail);
    await ipcRenderer.invoke("download", customEvent.detail);
  });
});
