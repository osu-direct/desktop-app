import { ipcRenderer } from "electron";

window.addEventListener("DOMContentLoaded", async () => {
  const inputField = document.getElementById("download-folder") as HTMLInputElement;

  const folder = await ipcRenderer.invoke("get-folder");

  inputField.value = folder;

  document.getElementById("browse-download-folder").onclick = async function () {
    const selectedFolder: string = await ipcRenderer.invoke("browse-folder");
    if (selectedFolder && selectedFolder.length > 0) {
      inputField.value = selectedFolder;
      ipcRenderer.send("set-folder", selectedFolder);
    }
  }
});
