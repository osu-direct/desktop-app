import { ipcRenderer } from "electron";
import { Setting } from "./types";

window.addEventListener("load", async () => {
  const songsDirInputField = document.getElementById(
    "download-folder",
  ) as HTMLInputElement;

  const mutePreviewCheckbox = document.getElementById(
    "mute-preview",
  ) as HTMLInputElement;

  const settings: Setting[] = await ipcRenderer.invoke("get-settings");

  const songsDir = settings.find((setting) => setting.key === "songs_dir");
  songsDirInputField.value = songsDir?.val as string ?? "";

  const mutePreview = settings.find((setting) => setting.key === "mute_osu");
  mutePreviewCheckbox.checked =
    (mutePreview?.val as string ?? "true") === "true";

  document.getElementById("browse-download-folder").onclick =
    async function () {
      const selectedFolder: string = await ipcRenderer.invoke("browse-folder");
      if (selectedFolder && selectedFolder.length > 0) {
        songsDirInputField.value = selectedFolder;
        ipcRenderer.send("set-folder", selectedFolder);
      }
    };

  mutePreviewCheckbox.onchange = async function () {
    console.log("mute", mutePreviewCheckbox.checked);
    ipcRenderer.send("set-osu-mute", `${mutePreviewCheckbox.checked}`);
  };
});
