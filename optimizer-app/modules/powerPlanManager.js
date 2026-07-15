// modules/powerPlanManager.js
// Le e altera o plano de energia do Windows usando o utilitario nativo powercfg.
// GUID padrao do Windows para "Alto Desempenho":
const HIGH_PERFORMANCE_GUID = '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c';

const { runPS } = require('./psRunner');

async function getActivePlan() {
  // Saida tipica: "Esquema de energia Ativo (Ativo): (GUID)  Nome do plano"
  const raw = await runPS('powercfg /getactivescheme');
  return raw;
}

async function isHighPerformanceActive() {
  const active = await getActivePlan();
  return active.toLowerCase().includes(HIGH_PERFORMANCE_GUID);
}

// Ativa o plano de Alto Desempenho. Em algumas maquinas esse plano fica
// "escondido" por padrao, entao primeiro garantimos que ele existe na lista.
async function setHighPerformance() {
  await runPS(`powercfg -duplicatescheme ${HIGH_PERFORMANCE_GUID}`).catch(() => {});
  await runPS(`powercfg /setactive ${HIGH_PERFORMANCE_GUID}`);
  return { status: 'aplicado', plano: 'Alto Desempenho' };
}

module.exports = { getActivePlan, isHighPerformanceActive, setHighPerformance };
