// main.js
// Processo principal do Electron. Cria a janela, registra os handlers de IPC
// que a interface (renderer) chama, e orquestra os modulos de otimizacao.

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const db = require('./modules/database');
const startupManager = require('./modules/startupManager');
const diskCleaner = require('./modules/diskCleaner');
const powerPlanManager = require('./modules/powerPlanManager');
const driverChecker = require('./modules/driverChecker');
const serviceOptimizer = require('./modules/serviceOptimizer');
const performanceBoost = require('./modules/performanceBoost');
const storageOptimizer = require('./modules/storageOptimizer');
const processOptimizer = require('./modules/processOptimizer');
const engine = require('./modules/optimizerEngine');

let mainWindow;
let lastScanData = null; // guarda o resultado bruto do ultimo scan em memoria

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0f1115',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  db.init(app.getPath('userData'));
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---------- IPC: SCAN ----------
ipcMain.handle('scan:run', async () => {
  const [startupApps, tempScan, energiaOk, driversDesatualizados, servicosPendentes, boostsRaw, storageRaw, processosRaw] = await Promise.all([
    startupManager.getStartupApps(),
    diskCleaner.scanTempFiles(),
    powerPlanManager.isHighPerformanceActive(),
    driverChecker.checkOutdatedDrivers(),
    serviceOptimizer.scanServices(),
    performanceBoost.scan(),
    storageOptimizer.scan(),
    processOptimizer.scan(),
  ]);

  // Combina os tres tipos de tweak em uma unica lista, mas mantem o prefixo
  // na categoria para sabermos qual modulo chamar na hora de aplicar
  const boostsPendentes = [
    ...boostsRaw.map((b) => ({ ...b, _modulo: 'boost' })),
    ...storageRaw.map((b) => ({ ...b, _modulo: 'storage' })),
    ...processosRaw.map((b) => ({ ...b, _modulo: 'process' })),
  ];

  const score = engine.calcularScore({ startupApps, tempScan, energiaOk, driversDesatualizados, servicosPendentes, boostsPendentes });
  const acoes = engine.priorizarAcoes({ startupApps, tempScan, energiaOk, driversDesatualizados, servicosPendentes, boostsPendentes });

  lastScanData = { startupApps, tempScan, energiaOk, driversDesatualizados, servicosPendentes, boostsPendentes };

  const scanRecord = db.saveScan({
    score,
    ramTempMb: tempScan.totalMb,
    qtdStartup: startupApps.length,
    qtdDriversDesatualizados: driversDesatualizados.length,
  });

  return { score, acoes, scanId: scanRecord.id, detalhes: lastScanData };
});

// ---------- IPC: APLICAR UMA ACAO ----------
// categoria pode vir como "boost:visual_effects" para os tweaks avancados,
// que sao aplicados individualmente (cada um e uma chave de registro isolada)
ipcMain.handle('optimize:apply', async (event, categoria) => {
  if (!lastScanData) throw new Error('Rode um scan antes de otimizar.');

  if (categoria.startsWith('boost:')) {
    const boostId = categoria.split(':')[1];
    const resultado = await performanceBoost.applyItem(boostId);
    db.saveHistoryEntry({ categoria: 'boost:' + boostId, resultado });
    return resultado;
  }

  if (categoria.startsWith('storage:')) {
    const storageId = categoria.split(':')[1];
    const resultado = await storageOptimizer.applyItem(storageId);
    db.saveHistoryEntry({ categoria: 'storage:' + storageId, resultado });
    return resultado;
  }

  if (categoria.startsWith('process:')) {
    const nomeProcesso = categoria.substring('process:'.length);
    const resultado = await processOptimizer.applyItem(nomeProcesso);
    db.saveHistoryEntry({ categoria: 'process:' + nomeProcesso, resultado });
    return resultado;
  }

  let resultado;

  switch (categoria) {
    case 'startup':
      resultado = [];
      for (const item of lastScanData.startupApps) {
        try {
          resultado.push(await startupManager.disableStartupItem(item));
        } catch (e) {
          continue; // alguns itens podem exigir permissao de admin - ignora e segue
        }
      }
      break;

    case 'temp_files':
      resultado = await diskCleaner.cleanTempFiles();
      break;

    case 'power':
      resultado = await powerPlanManager.setHighPerformance();
      break;

    case 'service':
      resultado = [];
      for (const svc of lastScanData.servicosPendentes) {
        resultado.push(await serviceOptimizer.setServiceManual(svc.nome));
      }
      break;

    case 'driver':
      // Drivers nao sao aplicados automaticamente - apenas informativo
      resultado = { status: 'informativo', mensagem: 'Atualize manualmente pelo site do fabricante ou Windows Update.' };
      break;

    default:
      throw new Error('Categoria desconhecida: ' + categoria);
  }

  db.saveHistoryEntry({ categoria, resultado });
  return resultado;
});

// ---------- IPC: HISTORICO ----------
ipcMain.handle('history:get', async () => {
  return db.getHistory();
});
