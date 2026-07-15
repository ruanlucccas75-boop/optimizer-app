// modules/startupManager.js
// Le e gerencia os aplicativos que iniciam junto com o Windows.
// Usa as chaves de registro Run (a mesma fonte que o Gerenciador de Tarefas usa).

const { runPS } = require('./psRunner');

const REGISTRY_PATHS = [
  { hive: 'HKCU', path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' },
  { hive: 'HKLM', path: 'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' },
];

// Lista todos os apps configurados para iniciar com o Windows
async function getStartupApps() {
  const items = [];

  for (const reg of REGISTRY_PATHS) {
    try {
      // ConvertTo-Json transforma a saida em algo facil de parsear no Node
      const raw = await runPS(
        `Get-ItemProperty -Path '${reg.path}' | Select-Object * -ExcludeProperty PS* | ConvertTo-Json -Compress`
      );
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      // Quando ha apenas 1 item, ConvertTo-Json nao retorna um array -> normalizamos
      const entries = Array.isArray(parsed) ? parsed : [parsed];

      for (const entry of entries) {
        for (const [name, command] of Object.entries(entry)) {
          if (typeof command !== 'string') continue;
          items.push({
            nome: name,
            comando: command,
            hive: reg.hive,
            path: reg.path,
            // heuristica simples de impacto: apps de nuvem/comunicacao tendem a pesar mais no boot
            impacto: /onedrive|dropbox|teams|spotify|discord|steam|epic/i.test(name) ? 'alto' : 'medio',
          });
        }
      }
    } catch (e) {
      // Chave pode nao existir em algumas maquinas - segue sem quebrar o scan
      continue;
    }
  }

  return items;
}

// Remove um item do startup (reversivel, pois devolvemos o valor original)
async function disableStartupItem(item) {
  const command = `Remove-ItemProperty -Path '${item.path}' -Name '${item.nome}' -ErrorAction Stop`;
  await runPS(command);
  return { ...item, status: 'aplicado' };
}

// Restaura um item removido anteriormente
async function enableStartupItem(item) {
  const escapedValue = item.comando.replace(/'/g, "''");
  const command = `Set-ItemProperty -Path '${item.path}' -Name '${item.nome}' -Value '${escapedValue}'`;
  await runPS(command);
  return { ...item, status: 'revertido' };
}

module.exports = { getStartupApps, disableStartupItem, enableStartupItem };
