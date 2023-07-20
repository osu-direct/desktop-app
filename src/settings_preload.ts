import { ipcRenderer } from "electron";

window.addEventListener("DOMContentLoaded", () => {
  //TODO: settings here
  const inputField = document.getElementById("download-folder") as HTMLInputElement;
  document.getElementById("browse-download-folder").onclick = async function () {
    const selectedFolder: string = await ipcRenderer.invoke("browse-folder");
    if (selectedFolder && selectedFolder.length > 0)
      inputField.value = selectedFolder;
  }
});
