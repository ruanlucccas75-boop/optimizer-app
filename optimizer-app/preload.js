// preload.js
// Expoe apenas as funcoes necessarias para a interface (renderer), sem dar
// acesso direto ao Node.js dentro da pagina - isso mantem o app mais seguro.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('optimizerAPI', {
  runScan: () => ipcRenderer.invoke('scan:run'),
  applyOptimization: (categoria) => ipcRenderer.invoke('optimize:apply', categoria),
  getHistory: () => ipcRenderer.invoke('history:get'),
});
