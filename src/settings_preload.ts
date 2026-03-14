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
  const display = document.getElementById("keybindDisplay") as HTMLInputElement;

  if (overlayKeybind) display.value = overlayKeybind.val as string;

  let recording = false;

  recordButton.addEventListener("click", () => {
    recording = true;
    display.value = "Press a key (ESC to cancel)";
    recordButton.disabled = true;
  });
  const modifiers = ["CONTROL", "SHIFT", "ALT", "META"];
  const disallowedKeys = ["SPACE", "ENTER", "BACKSPACE", "CAPSLOCK"];

  const updateDisplay = async (e: KeyboardEvent) => {
    if (!recording) return undefined;

    e.preventDefault();

    if (e.key === "Escape") {
      recording = false;
      recordButton.disabled = false;

      const settings: Setting[] = await ipcRenderer.invoke("get-settings");
      const overlayKeybind = settings.find(
        (setting) => setting.key === "overlay_keybind",
      );
      if (overlayKeybind) display.value = overlayKeybind.val as string;
      return undefined;
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
    display.value = keybind || "Press a key (ESC to cancel)";
    return { keybind, invalidKey };
  };

  window.addEventListener("keydown", async (e: KeyboardEvent) => {
    const result = await updateDisplay(e);
    if (result && !result.invalidKey) {
      recording = false;
      recordButton.disabled = false;
      ipcRenderer.send("set-keybind", result.keybind);
    }
  });

  window.addEventListener("keyup", (e: KeyboardEvent) => {
    updateDisplay(e);
  });
});
