// modules/database.js
// Persistencia local simples em arquivo JSON, guardado na pasta de dados do
// usuario (%APPDATA%/Optimizer). Optamos por JSON em vez de SQLite para evitar
// dependencias nativas (better-sqlite3 exige compilador C++ instalado na
// maquina do usuario, o que quebraria a instalacao em muitos PCs).

const fs = require('fs');
const path = require('path');

let dbPath = null;
let cache = null;

function init(userDataPath) {
  dbPath = path.join(userDataPath, 'optimizer-data.json');
  if (fs.existsSync(dbPath)) {
    cache = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  } else {
    cache = { scans: [], history: [], settings: {} };
    persist();
  }
}

function persist() {
  fs.writeFileSync(dbPath, JSON.stringify(cache, null, 2), 'utf-8');
}

function saveScan(scan) {
  const record = { id: Date.now(), dataHora: new Date().toISOString(), ...scan };
  cache.scans.push(record);
  persist();
  return record;
}

function saveHistoryEntry(entry) {
  const record = { id: Date.now(), dataAplicacao: new Date().toISOString(), ...entry };
  cache.history.push(record);
  persist();
  return record;
}

function getHistory() {
  return [...cache.history].reverse();
}

function getLastScan() {
  return cache.scans[cache.scans.length - 1] || null;
}

module.exports = { init, saveScan, saveHistoryEntry, getHistory, getLastScan };
