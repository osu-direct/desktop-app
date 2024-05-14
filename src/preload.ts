import { Titlebar, TitlebarColor } from "custom-electron-titlebar";
import { ipcRenderer } from "electron";
import { version } from "./appInfo";

window.addEventListener("DOMContentLoaded", () => {
  const titlebar = new Titlebar({
    backgroundColor: TitlebarColor.fromHex("#1e1e2e"),
    itemBackgroundColor: TitlebarColor.fromHex("#121212"),
    enableMnemonics: false,
  });
  titlebar.updateTitle(`osu.direct ${version}`);

  window.addEventListener("update-client", async () => {
    const result = await ipcRenderer.invoke("update-client");
    if (result.failed) {
      window.dispatchEvent(
        new CustomEvent("update-failed"),
      );
    }
  });

  window.addEventListener("download", async (e) => {
    const customEvent = e as CustomEvent;
    const result = await ipcRenderer.invoke("download", customEvent.detail);
    window.dispatchEvent(
      new CustomEvent("download-complete", {
        detail: result,
      }),
    );
  });
});
