// modules/serviceOptimizer.js
// Verifica servicos do Windows que sao seguros de colocar em "Manual" (nao
// "Desativado" - isso evita quebrar algo caso o servico seja necessario em
// algum momento, mas para de consumir recursos no boot).
//
// A lista abaixo e deliberadamente curta e conservadora: cada item so entra
// aqui se for amplamente documentado como seguro para a maioria dos usuarios.

const { runPS } = require('./psRunner');

const SAFE_SERVICES = [
  { nome: 'DiagTrack', descricao: 'Telemetria/Experiencia do Usuario Conectado', impacto: 'baixo' },
  { nome: 'Fax', descricao: 'Servico de Fax (raramente usado)', impacto: 'baixo' },
  { nome: 'PrintNotify', descricao: 'Notificacoes de impressora (mantenha se voce imprime)', impacto: 'baixo' },
];

async function scanServices() {
  const results = [];

  for (const svc of SAFE_SERVICES) {
    try {
      const raw = await runPS(
        `Get-Service -Name '${svc.nome}' -ErrorAction Stop | Select-Object Status, StartType | ConvertTo-Json -Compress`
      );
      const info = JSON.parse(raw);
      if (info.StartType !== 'Manual' && info.StartType !== 'Disabled') {
        results.push({ ...svc, statusAtual: info.Status, startTypeAtual: info.StartType });
      }
    } catch (e) {
      // servico pode nao existir nessa versao do Windows - ignora
      continue;
    }
  }

  return results;
}

// Muda o tipo de inicializacao para Manual (reversivel com setToAutomatic)
async function setServiceManual(serviceName) {
  await runPS(`Set-Service -Name '${serviceName}' -StartupType Manual`);
  return { nome: serviceName, status: 'aplicado' };
}

async function setServiceAutomatic(serviceName) {
  await runPS(`Set-Service -Name '${serviceName}' -StartupType Automatic`);
  return { nome: serviceName, status: 'revertido' };
}

module.exports = { scanServices, setServiceManual, setServiceAutomatic };
