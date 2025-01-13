// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  selectDirs: () => ipcRenderer.send("select-dirs"),
  selectDirsCb: (callback: any) =>
    ipcRenderer.on("select-dirs-res", (_event, value) => callback(value)),
});
