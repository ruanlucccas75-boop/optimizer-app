// renderer.js - roda dentro da janela, sem acesso direto ao Node.
// Toda comunicação com o sistema operacional passa por window.optimizerAPI
// (exposta pelo preload.js).

const scoreValue = document.getElementById('score-value');
const scoreLabel = document.getElementById('score-label');
const scoreRing = document.getElementById('score-ring');
const actionsList = document.getElementById('actions-list');
const btnScan = document.getElementById('btn-scan');
const btnApplyAll = document.getElementById('btn-apply-all');
const btnHistory = document.getElementById('btn-history');
const btnBack = document.getElementById('btn-back');
const viewDashboard = document.getElementById('view-dashboard');
const viewHistory = document.getElementById('view-history');
const historyList = document.getElementById('history-list');

let currentActions = [];

function corPorScore(score) {
  if (score >= 80) return '#22c55e';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

function renderScore(score) {
  const cor = corPorScore(score);
  const graus = (score / 100) * 360;
  scoreRing.style.background = `conic-gradient(${cor} ${graus}deg, #262b33 ${graus}deg)`;
  scoreValue.textContent = score;
  scoreLabel.textContent =
    score >= 80 ? 'Seu PC está saudável' : score >= 50 ? 'Há espaço para otimizar' : 'PC precisa de atenção';
}

function renderActions(acoes) {
  currentActions = acoes;
  actionsList.innerHTML = '';

  if (acoes.length === 0) {
    actionsList.innerHTML = '<li class="empty-state">Tudo otimizado por aqui. 🎉</li>';
    btnApplyAll.disabled = true;
    return;
  }

  btnApplyAll.disabled = false;

  for (const acao of acoes) {
    const li = document.createElement('li');
    li.className = 'action-item';
    li.innerHTML = `
      <div>
        <div class="titulo"><span class="badge ${acao.impacto}">${acao.impacto}</span>${acao.titulo}</div>
        <div class="ganho">${acao.ganhoEstimado}</div>
      </div>
      <button class="btn-primary btn-small" data-categoria="${acao.categoria}">Aplicar</button>
    `;
    actionsList.appendChild(li);
  }

  document.querySelectorAll('[data-categoria]').forEach((btn) => {
    btn.addEventListener('click', () => aplicarOtimizacao(btn.dataset.categoria));
  });
}

async function rodarScan() {
  btnScan.textContent = 'Escaneando...';
  btnScan.disabled = true;
  try {
    const resultado = await window.optimizerAPI.runScan();
    renderScore(resultado.score);
    renderActions(resultado.acoes);
  } catch (e) {
    scoreLabel.textContent = 'Erro ao escanear: ' + e.message;
  } finally {
    btnScan.textContent = 'Escanear PC';
    btnScan.disabled = false;
  }
}

async function aplicarOtimizacao(categoria) {
  try {
    await window.optimizerAPI.applyOptimization(categoria);
    await rodarScan(); // re-escaneia para atualizar o score e a lista
  } catch (e) {
    alert('Não foi possível aplicar: ' + e.message);
  }
}

async function aplicarTudo() {
  for (const acao of currentActions) {
    await window.optimizerAPI.applyOptimization(acao.categoria);
  }
  await rodarScan();
}

async function abrirHistorico() {
  const historico = await window.optimizerAPI.getHistory();
  historyList.innerHTML = historico.length
    ? ''
    : '<li class="empty-state">Nenhuma otimização aplicada ainda.</li>';

  for (const item of historico) {
    const li = document.createElement('li');
    li.className = 'action-item';
    const data = new Date(item.dataAplicacao).toLocaleString('pt-BR');
    li.innerHTML = `<div><div class="titulo">${item.categoria}</div><div class="ganho">${data}</div></div>`;
    historyList.appendChild(li);
  }

  viewDashboard.classList.add('hidden');
  viewHistory.classList.remove('hidden');
}

btnScan.addEventListener('click', rodarScan);
btnApplyAll.addEventListener('click', aplicarTudo);
btnHistory.addEventListener('click', abrirHistorico);
btnBack.addEventListener('click', () => {
  viewHistory.classList.add('hidden');
  viewDashboard.classList.remove('hidden');
});
