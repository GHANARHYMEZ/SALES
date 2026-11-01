const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const path = require('path');

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let win = null;

  app.on('second-instance', () => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });

  function createWindow() {
    Menu.setApplicationMenu(null);
    win = new BrowserWindow({
      width: 1280,
      height: 820,
      minWidth: 420,
      minHeight: 560,
      show: false,
      title: 'ShopDesk Ghana',
      backgroundColor: '#eef2ee',
      icon: path.join(__dirname, '..', 'build', 'icon.png'),
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
        devTools: !app.isPackaged
      }
    });
    win.loadFile(path.join(__dirname, '..', 'www', 'index.html'));
    win.once('ready-to-show', () => win.show());
    win.on('closed', () => { win = null; });
    win.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https?:/.test(url)) shell.openExternal(url);
      return { action: 'deny' };
    });
    win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file://')) e.preventDefault(); });
  }

  ipcMain.handle('print', e => new Promise(resolve => {
    e.sender.print({ silent: false, printBackground: true }, ok => resolve(ok));
  }));

  app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });
  app.on('window-all-closed', () => app.quit());
}
