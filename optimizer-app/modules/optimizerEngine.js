// modules/optimizerEngine.js
// Este e o "cerebro" do app: recebe os dados brutos dos scans (startup,
// temp files, energia, drivers, servicos) e produz:
//   1) um score de saude do PC de 0 a 100
//   2) uma lista de acoes priorizadas por impacto
//
// LOGICA DO SCORE (explicada):
// Comecamos com 100 pontos (PC "perfeito") e subtraimos penalidades por
// cada problema encontrado. Cada categoria tem um peso diferente porque
// o impacto real na experiencia do usuario nao e igual entre elas -
// por exemplo, 10 apps de inicializacao pesam mais no dia a dia do que
// 500MB de arquivos temporarios.

const PESOS = {
  startupPorApp: 3, // cada app de inicializacao "extra" (acima de 5) custa 3 pontos
  startupLimiteOk: 5, // ate 5 apps de startup e considerado normal
  tempPorGb: 4, // cada GB de arquivos temporarios custa 4 pontos
  tempTetoPontos: 20, // nunca descontar mais que 20 pontos so por temp files
  energiaForaDoIdeal: 10, // plano de energia diferente de Alto Desempenho
  driverPorItem: 2, // cada driver desatualizado custa 2 pontos
  driverTetoPontos: 16,
  servicoPorItem: 1.5, // cada servico "pesado" ainda ativo custa 1.5 pontos
  boostPorItem: 3, // cada tweak de desempenho avancado nao aplicado custa 3 pontos
};

function calcularScore({ startupApps, tempScan, energiaOk, driversDesatualizados, servicosPendentes, boostsPendentes = [] }) {
  let score = 100;

  // Startup: penaliza apenas o excedente acima do limite considerado normal
  const excedenteStartup = Math.max(0, startupApps.length - PESOS.startupLimiteOk);
  score -= excedenteStartup * PESOS.startupPorApp;

  // Temp files: converte MB -> GB e aplica peso, com teto para nao distorcer o score
  const tempGb = tempScan.totalMb / 1024;
  score -= Math.min(tempGb * PESOS.tempPorGb, PESOS.tempTetoPontos);

  // Energia: penalidade fixa se nao estiver no plano ideal
  if (!energiaOk) score -= PESOS.energiaForaDoIdeal;

  // Drivers desatualizados, com teto
  score -= Math.min(driversDesatualizados.length * PESOS.driverPorItem, PESOS.driverTetoPontos);

  // Servicos pendentes de otimizacao
  score -= servicosPendentes.length * PESOS.servicoPorItem;

  // Tweaks avancados (efeitos visuais, apps em segundo plano, game bar, etc)
  score -= boostsPendentes.length * PESOS.boostPorItem;

  // Score nunca sai do intervalo 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
}

// Monta a lista de acoes recomendadas, ordenada por impacto (maior primeiro).
// Essa ordenacao e o que decide o que aparece no topo da tela para o usuario.
function priorizarAcoes({ startupApps, tempScan, energiaOk, driversDesatualizados, servicosPendentes, boostsPendentes = [] }) {
  const acoes = [];

  if (startupApps.length > PESOS.startupLimiteOk) {
    acoes.push({
      categoria: 'startup',
      titulo: `Desativar ${startupApps.length - PESOS.startupLimiteOk} apps de inicializacao`,
      impacto: 'alto',
      ganhoEstimado: `${(startupApps.length - PESOS.startupLimiteOk) * 2}s mais rapido no boot`,
    });
  }

  if (tempScan.totalMb > 500) {
    acoes.push({
      categoria: 'temp_files',
      titulo: `Limpar ${(tempScan.totalMb / 1024).toFixed(1)} GB de arquivos temporarios`,
      impacto: tempScan.totalMb > 3000 ? 'alto' : 'medio',
      ganhoEstimado: `${tempScan.totalMb} MB liberados`,
    });
  }

  if (!energiaOk) {
    acoes.push({
      categoria: 'power',
      titulo: 'Ativar plano de energia de Alto Desempenho',
      impacto: 'medio',
      ganhoEstimado: 'Menos throttling de CPU em tarefas pesadas',
    });
  }

  if (driversDesatualizados.length > 0) {
    acoes.push({
      categoria: 'driver',
      titulo: `Revisar ${driversDesatualizados.length} driver(s) desatualizado(s)`,
      impacto: driversDesatualizados.length > 3 ? 'alto' : 'baixo',
      ganhoEstimado: 'Melhor estabilidade e compatibilidade',
    });
  }

  if (servicosPendentes.length > 0) {
    acoes.push({
      categoria: 'service',
      titulo: `Ajustar ${servicosPendentes.length} servico(s) em segundo plano`,
      impacto: 'baixo',
      ganhoEstimado: 'Menos uso de RAM/CPU em segundo plano',
    });
  }

  // Tweaks avancados entram um por um (cada um e independente e reversivel)
  for (const boost of boostsPendentes) {
    acoes.push({
      categoria: (boost._modulo || 'boost') + ':' + boost.id,
      titulo: boost.titulo,
      impacto: boost.impacto,
      ganhoEstimado: boost.ganho,
    });
  }

  // Ordena por impacto: alto > medio > baixo
  const pesoImpacto = { alto: 3, medio: 2, baixo: 1 };
  acoes.sort((a, b) => pesoImpacto[b.impacto] - pesoImpacto[a.impacto]);

  return acoes;
}

module.exports = { calcularScore, priorizarAcoes };
