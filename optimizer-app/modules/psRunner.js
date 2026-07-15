// modules/psRunner.js
// Utilitario central para executar comandos PowerShell a partir do Node.js.
// Toda comunicacao com o Windows (registro, servicos, energia, arquivos)
// passa por aqui, para termos um unico lugar que trata erros e timeouts.

const { exec } = require('child_process');

/**
 * Executa um comando PowerShell e retorna a saida como string.
 * @param {string} command - comando PowerShell (sem aspas externas)
 * @param {number} timeoutMs - tempo maximo de execucao (padrao 15s)
 */
function runPS(command) {
  return new Promise((resolve, reject) => {
    // -NoProfile evita carregar perfis customizados (mais rapido e previsivel)
    // -Command roda o comando direto sem abrir uma janela interativa
    const fullCommand = `powershell -NoProfile -Command "${command.replace(/"/g, '\\"')}"`;

    exec(fullCommand, { timeout: 15000, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        // Nao rejeitamos silenciosamente: devolvemos o erro para a UI decidir o que mostrar
        reject(new Error(stderr || error.message));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

module.exports = { runPS };
