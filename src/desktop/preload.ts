import { contextBridge, ipcRenderer } from "electron";
import type { DesktopBridge } from "./bridge";
const bridge: DesktopBridge = {
  environment: () => ipcRenderer.invoke("desktop:environment"),
  chooseFolder: () => ipcRenderer.invoke("desktop:folder"),
  setApiKey: (key) => ipcRenderer.invoke("desktop:key", key),
  openExternal: (url) => ipcRenderer.invoke("desktop:external", url),
  openExtensionFolder: () => ipcRenderer.invoke("desktop:extension"),
};
contextBridge.exposeInMainWorld("gitLearnDesktop", bridge);
