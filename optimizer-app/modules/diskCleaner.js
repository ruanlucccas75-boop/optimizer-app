// modules/diskCleaner.js
// Mede e limpa arquivos temporarios reais do Windows (pasta %TEMP% do usuario
// e a pasta Temp do sistema). Sao pastas seguras de limpar - o proprio Windows
// as recria conforme necessario.

const { runPS } = require('./psRunner');

const TARGET_PATHS = [
  '$env:TEMP',
  'C:\\Windows\\Temp',
];

// Calcula quantos MB podem ser liberados, sem apagar nada ainda
async function scanTempFiles() {
  let totalBytes = 0;
  const details = [];

  for (const path of TARGET_PATHS) {
    try {
      const raw = await runPS(
        `(Get-ChildItem -Path ${path} -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum`
      );
      const bytes = parseInt(raw, 10) || 0;
      totalBytes += bytes;
      details.push({ pasta: path, tamanhoMb: Math.round(bytes / 1024 / 1024) });
    } catch (e) {
      continue;
    }
  }

  return {
    totalMb: Math.round(totalBytes / 1024 / 1024),
    detalhes: details,
  };
}

// Remove os arquivos de fato. -ErrorAction SilentlyContinue ignora arquivos
// que estao em uso no momento (nao trava a limpeza por causa de 1 arquivo travado)
async function cleanTempFiles() {
  for (const path of TARGET_PATHS) {
    await runPS(
      `Remove-Item -Path "${path}\\*" -Recurse -Force -ErrorAction SilentlyContinue`
    );
  }
  return { status: 'aplicado' };
}

module.exports = { scanTempFiles, cleanTempFiles };
