import { Titlebar, TitlebarColor } from "custom-electron-titlebar";
import { ipcRenderer } from "electron";
import { version } from "./appInfo";

let titleBar: Titlebar | undefined;
let inited = false;

window.addEventListener("load", () => {
  if (inited) return;
  inited = true;

  if (!titleBar) {
    titleBar = new Titlebar({
      backgroundColor: TitlebarColor.fromHex("#050616"),
      itemBackgroundColor: TitlebarColor.fromHex("#050616"),
      enableMnemonics: false,
    });
    titleBar.updateTitle(`osu.direct ${version}`);
  }

  let previewPlaying = false;

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

  window.addEventListener("preview-play", async () => {
    if (previewPlaying) return;
    previewPlaying = true;
    ipcRenderer.send("preview-play");
  });

  window.addEventListener("preview-stop", async () => {
    if (!previewPlaying) return;
    previewPlaying = false;
    ipcRenderer.send("preview-stop");
  });
});
