import { ipcRenderer } from "electron";

let inited = false;

window.addEventListener("load", () => {
  if (inited) return;
  inited = true;

  let previewPlaying = false;

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
