// modules/processOptimizer.js
// Detecta processos RODANDO AGORA que sao apps opcionais conhecidos (nao
// processos do Windows, nunca processos do sistema). A lista e a mesma
// familia de apps que o startupManager trata como "seguro desativar" -
// aqui vamos um passo alem e oferecemos ENCERRAR o processo agora, o que
// libera RAM/CPU imediatamente (diferente de so tirar do startup, que so
// faz efeito no proximo boot).
//
// Importante: encerramos apenas o processo (Stop-Process), nunca
// desinstalamos nada. O app continua instalado e pode ser reaberto quando
// o usuario quiser.

const { runPS } = require('./psRunner');

// nome do processo (sem .exe) -> nome amigavel exibido na UI
const PROCESSOS_CONHECIDOS = {
  OneDrive: 'Sincronização do OneDrive',
  Spotify: 'Spotify',
  Discord: 'Discord',
  Teams: 'Microsoft Teams (pessoal)',
  Skype: 'Skype',
  Steam: 'Steam',
  EpicGamesLauncher: 'Epic Games Launcher',
  EpicWebHelper: 'Epic Games (processo auxiliar)',
  Dropbox: 'Dropbox',
  CCleaner: 'CCleaner (em segundo plano)',
  'Spotify Helper': 'Spotify (processo auxiliar)',
};

async function scan() {
  const raw = await runPS(
    `Get-Process | Select-Object Name, Id, WorkingSet | ConvertTo-Json -Compress`
  );
  if (!raw) return [];

  const parsed = JSON.parse(raw);
  const processos = Array.isArray(parsed) ? parsed : [parsed];

  const pendentes = [];
  const jaContados = new Set();

  for (const p of processos) {
    const nomeAmigavel = PROCESSOS_CONHECIDOS[p.Name];
    if (!nomeAmigavel) continue;
    if (jaContados.has(p.Name)) continue; // alguns apps abrem varios processos com o mesmo nome
    jaContados.add(p.Name);

    // soma a memoria de todas as instancias desse processo
    const memoriaTotalBytes = processos
      .filter((x) => x.Name === p.Name)
      .reduce((soma, x) => soma + (x.WorkingSet || 0), 0);

    pendentes.push({
      id: p.Name,
      titulo: `Encerrar ${nomeAmigavel}`,
      ganho: `${Math.round(memoriaTotalBytes / 1024 / 1024)} MB de RAM liberados agora`,
      impacto: memoriaTotalBytes > 300 * 1024 * 1024 ? 'alto' : 'medio',
    });
  }

  return pendentes;
}

// Encerra todas as instancias de um processo pelo nome
async function applyItem(nomeProcesso) {
  await runPS(`Stop-Process -Name '${nomeProcesso}' -Force -ErrorAction SilentlyContinue`);
  return { id: nomeProcesso, status: 'aplicado' };
}

module.exports = { scan, applyItem };
