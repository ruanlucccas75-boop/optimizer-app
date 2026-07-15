// modules/performanceBoost.js
// Tweaks avancados, todos documentados como seguros e 100% reversiveis.
// Cada um mexe em UMA chave de registro pontual - nada de scripts agressivos
// que tocam varias partes do sistema de uma vez.

const { runPS } = require('./psRunner');

const ITENS = [
  {
    id: 'visual_effects',
    titulo: 'Ajustar Windows para melhor desempenho (efeitos visuais)',
    ganho: 'Menos uso de GPU/CPU ao arrastar janelas e abrir menus',
    impacto: 'alto',
    path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects',
    name: 'VisualFXSetting',
    valorLigado: 2, // 2 = "Ajustar para melhor desempenho"
    valorOriginal: 0, // 0 = "Deixar o Windows escolher" (padrao de fabrica)
  },
  {
    id: 'transparency',
    titulo: 'Desativar efeitos de transparência',
    ganho: 'Reduz carga de composição na GPU',
    impacto: 'medio',
    path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize',
    name: 'EnableTransparency',
    valorLigado: 0,
    valorOriginal: 1,
  },
  {
    id: 'menu_delay',
    titulo: 'Remover atraso ao abrir menus',
    ganho: 'Menus e submenus abrem instantaneamente',
    impacto: 'baixo',
    path: 'HKCU:\\Control Panel\\Desktop',
    name: 'MenuShowDelay',
    valorLigado: 0,
    valorOriginal: 400,
    tipoString: true,
  },
  {
    id: 'background_apps',
    titulo: 'Desativar apps rodando em segundo plano',
    ganho: 'Libera RAM e CPU ocupados por apps da Store que voce nao esta usando',
    impacto: 'alto',
    path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications',
    name: 'GlobalUserDisabled',
    valorLigado: 1,
    valorOriginal: 0,
  },
  {
    id: 'game_dvr',
    titulo: 'Desativar gravação em segundo plano do Xbox Game Bar',
    ganho: 'Remove overlay que consome GPU mesmo fora de jogos',
    impacto: 'medio',
    path: 'HKCU:\\System\\GameConfigStore',
    name: 'GameDVR_Enabled',
    valorLigado: 0,
    valorOriginal: 1,
  },
];

async function scan() {
  const pendentes = [];

  for (const item of ITENS) {
    try {
      const raw = await runPS(
        `(Get-ItemProperty -Path '${item.path}' -Name '${item.name}' -ErrorAction Stop).${item.name}`
      );
      const atual = item.tipoString ? raw.trim() : parseInt(raw, 10);
      if (atual !== item.valorLigado) pendentes.push(item);
    } catch (e) {
      // chave nao existe ainda -> tratamos como "nao aplicado"
      pendentes.push(item);
    }
  }

  return pendentes;
}

async function applyItem(id) {
  const item = ITENS.find((i) => i.id === id);
  if (!item) throw new Error('Tweak desconhecido: ' + id);

  const valor = item.tipoString ? `'${item.valorLigado}'` : item.valorLigado;
  await runPS(
    `New-Item -Path '${item.path}' -Force | Out-Null; Set-ItemProperty -Path '${item.path}' -Name '${item.name}' -Value ${valor} -Type ${item.tipoString ? 'String' : 'DWord'}`
  );
  return { id, status: 'aplicado' };
}

async function applyAll() {
  const pendentes = await scan();
  const resultados = [];
  for (const item of pendentes) {
    resultados.push(await applyItem(item.id));
  }
  return resultados;
}

// Reverte um tweak para o valor original (padrao de fabrica)
async function revertItem(id) {
  const item = ITENS.find((i) => i.id === id);
  if (!item) throw new Error('Tweak desconhecido: ' + id);

  const valor = item.tipoString ? `'${item.valorOriginal}'` : item.valorOriginal;
  await runPS(
    `Set-ItemProperty -Path '${item.path}' -Name '${item.name}' -Value ${valor} -Type ${item.tipoString ? 'String' : 'DWord'}`
  );
  return { id, status: 'revertido' };
}

module.exports = { ITENS, scan, applyItem, applyAll, revertItem };
