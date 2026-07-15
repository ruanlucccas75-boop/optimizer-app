// modules/driverChecker.js
// Lista drivers instalados e sinaliza os que estao ha muito tempo sem atualizacao.
// Importante: este app NAO baixa/instala drivers automaticamente (isso exigiria
// acessar sites de fabricantes, o que e arriscado de automatizar). Ele apenas
// aponta quais drivers merecem sua atencao manual no site do fabricante ou Windows Update.

const { runPS } = require('./psRunner');

const DOIS_ANOS_MS = 2 * 365 * 24 * 60 * 60 * 1000;

async function checkOutdatedDrivers() {
  const raw = await runPS(
    `Get-CimInstance Win32_PnPSignedDriver | Where-Object { $_.DeviceName -and $_.DriverDate } | Select-Object DeviceName, DriverDate | ConvertTo-Json -Compress`
  );

  if (!raw) return [];

  const parsed = JSON.parse(raw);
  const drivers = Array.isArray(parsed) ? parsed : [parsed];
  const now = Date.now();
  const outdated = [];

  for (const d of drivers) {
    if (!d.DriverDate) continue;
    // DriverDate vem no formato WMI "/Date(timestamp)/"
    const match = /\d+/.exec(d.DriverDate);
    if (!match) continue;
    const driverTime = parseInt(match[0], 10);
    if (now - driverTime > DOIS_ANOS_MS) {
      outdated.push({
        nome: d.DeviceName,
        dataInstalacao: new Date(driverTime).toISOString().split('T')[0],
      });
    }
  }

  return outdated;
}

module.exports = { checkOutdatedDrivers };
