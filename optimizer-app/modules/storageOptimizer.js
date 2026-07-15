// modules/storageOptimizer.js
// Tweaks de armazenamento. Aqui a pesquisa trouxe avisos importantes que
// respeitamos:
//   - NAO desativamos o pagefile (fontes sao unanimes: pode causar travamentos)
//   - NAO desativamos SysMain em SSD (beneficio e discutivel e o proprio
//     Windows ja pula o Superfetch dinamicamente em SSD) - so oferecemos essa
//     opcao se detectarmos que o disco do sistema e um HDD de verdade
//   - Hibernacao: seguro desativar, mas avisamos que isso desliga o Fast Startup

const { runPS } = require('./psRunner');

async function isSystemDiskHDD() {
  try {
    const raw = await runPS(
      `Get-PhysicalDisk | Where-Object { $_.DeviceId -eq (Get-Partition -DriveLetter C).DiskNumber } | Select-Object -ExpandProperty MediaType`
    );
    return raw.trim().toUpperCase() === 'HDD';
  } catch (e) {
    return false; // se nao conseguimos detectar, tratamos como SSD (opcao mais segura)
  }
}

async function scan() {
  const pendentes = [];

  // 1) TRIM - sempre seguro verificar e ativar se estiver desligado
  try {
    const trimStatus = await runPS('fsutil behavior query DisableDeleteNotify');
    // saida tipica: "DisableDeleteNotify = 0" (0 = TRIM ativo, 1 = TRIM desativado)
    if (/=\s*1/.test(trimStatus)) {
      pendentes.push({
        id: 'enable_trim',
        titulo: 'Ativar TRIM no SSD',
        ganho: 'Mantém as velocidades de escrita do SSD ao longo do tempo',
        impacto: 'alto',
      });
    }
  } catch (e) { /* segue sem quebrar o scan */ }

  // 2) Hibernacao - so sugere se estiver ativa (senao nao ha nada a fazer)
  try {
    const hibStatus = await runPS(
      `(Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power' -Name HibernateEnabled -ErrorAction Stop).HibernateEnabled`
    );
    if (parseInt(hibStatus, 10) === 1) {
      pendentes.push({
        id: 'disable_hibernation',
        titulo: 'Desativar hibernação',
        ganho: 'Libera vários GB ocupados pelo hiberfil.sys (obs: também desliga o Fast Startup)',
        impacto: 'medio',
      });
    }
  } catch (e) { /* segue sem quebrar o scan */ }

  // 3) SysMain - so entra na lista se o disco do sistema for HDD de verdade
  try {
    const isHDD = await isSystemDiskHDD();
    if (isHDD) {
      const svcRaw = await runPS(`(Get-Service -Name SysMain -ErrorAction Stop).StartType`);
      if (svcRaw.trim() !== 'Manual' && svcRaw.trim() !== 'Disabled') {
        pendentes.push({
          id: 'sysmain_manual',
          titulo: 'Reduzir SysMain (Superfetch) — recomendado só para HD mecânico',
          ganho: 'Menos picos de uso de disco em HDs mecânicos',
          impacto: 'medio',
        });
      }
    }
  } catch (e) { /* servico pode nao existir - ignora */ }

  return pendentes;
}

async function applyItem(id) {
  switch (id) {
    case 'enable_trim':
      await runPS('fsutil behavior set DisableDeleteNotify 0');
      return { id, status: 'aplicado' };

    case 'disable_hibernation':
      await runPS('powercfg /hibernate off');
      return { id, status: 'aplicado' };

    case 'sysmain_manual':
      await runPS(`Set-Service -Name SysMain -StartupType Manual`);
      return { id, status: 'aplicado' };

    default:
      throw new Error('Tweak de armazenamento desconhecido: ' + id);
  }
}

async function revertItem(id) {
  switch (id) {
    case 'enable_trim':
      // TRIM nao tem "reversao" - manter ativo e sempre a opcao correta
      return { id, status: 'nao_reversivel' };

    case 'disable_hibernation':
      await runPS('powercfg /hibernate on');
      return { id, status: 'revertido' };

    case 'sysmain_manual':
      await runPS(`Set-Service -Name SysMain -StartupType Automatic`);
      return { id, status: 'revertido' };

    default:
      throw new Error('Tweak de armazenamento desconhecido: ' + id);
  }
}

module.exports = { scan, applyItem, revertItem };
