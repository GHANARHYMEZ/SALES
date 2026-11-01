const { contextBridge, ipcRenderer } = require('electron');
// The app calls window.shopdeskNative.print() so printing works the same as in a browser.
contextBridge.exposeInMainWorld('shopdeskNative', { print: () => ipcRenderer.invoke('print') });
