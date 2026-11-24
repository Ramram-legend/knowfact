/**
 * KnowFact – Electron Preload Script
 * Expose une API sécurisée au renderer via contextBridge.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  /** Récupère l'URL du backend FastAPI. */
  getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),
  /** Infos sur la plateforme. */
  platform: process.platform,
});
