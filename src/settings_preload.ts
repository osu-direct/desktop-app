import { ipcRenderer } from "electron";
import { Setting } from "./types.js";

window.addEventListener("load", async () => {
  const songsDirInputField = document.getElementById(
    "download-folder",
  ) as HTMLInputElement;

  const mutePreviewCheckbox = document.getElementById(
    "mute-preview",
  ) as HTMLInputElement;

  const settings: Setting[] = await ipcRenderer.invoke("get-settings");

  const songsDir = settings.find((setting) => setting.key === "songs_dir");
  songsDirInputField.value = (songsDir?.val as string) ?? "";

  const mutePreview = settings.find((setting) => setting.key === "mute_osu");
  mutePreviewCheckbox.checked =
    ((mutePreview?.val as string) ?? "true") === "true";

  const browseButton = document.getElementById("browse-download-folder");

  if (browseButton)
    browseButton.onclick = async function () {
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

  const overlayKeybind = settings.find(
    (setting) => setting.key === "overlay_keybind",
  );
  const recordButton = document.getElementById(
    "recordKeybind",
  ) as HTMLButtonElement;
  const display = document.getElementById("keybindDisplay") as HTMLDivElement;

  if (overlayKeybind) display.textContent = overlayKeybind.val as string;

  let recording = false;

  recordButton.addEventListener("click", () => {
    recording = true;
    display.textContent = "Press a key (ESC to cancel)";
    recordButton.disabled = true;
  });
  const modifiers = ["CONTROL", "SHIFT", "ALT", "META"];
  const disallowedKeys = ["SPACE", "ENTER", "BACKSPACE", "CAPSLOCK"];

  window.addEventListener("keydown", async (e: KeyboardEvent) => {
    if (!recording) return;

    e.preventDefault();

    if (e.key === "Escape") {
      recording = false;
      display.textContent = "Cancelled";
      recordButton.disabled = false;

      const settings: Setting[] = await ipcRenderer.invoke("get-settings");
      const overlayKeybind = settings.find(
        (setting) => setting.key === "overlay_keybind",
      );
      if (overlayKeybind) display.textContent = overlayKeybind.val as string;

      return;
    }

    const combo: string[] = [];

    if (e.ctrlKey) combo.push("Ctrl");
    if (e.shiftKey) combo.push("Shift");
    if (e.altKey) combo.push("Alt");
    if (e.metaKey) combo.push("Meta");

    const invalidKey =
      modifiers.includes(e.key.toUpperCase()) ||
      disallowedKeys.includes(e.key.toUpperCase());

    if (!invalidKey) combo.push(e.key.toUpperCase());

    const keybind = combo.join("+");
    if (!disallowedKeys.includes(e.key.toUpperCase()))
      display.textContent = keybind;

    if (!invalidKey) {
      recording = false;
      recordButton.disabled = false;
      ipcRenderer.send("set-keybind", keybind);
    }
  });
});
