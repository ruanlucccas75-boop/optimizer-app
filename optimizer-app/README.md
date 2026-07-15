# Optimizer

App desktop (Windows) que faz otimizações **reais** de PC:
- Desativa apps de inicialização desnecessários (registro do Windows)
- Limpa arquivos temporários (`%TEMP%` e `C:\Windows\Temp`)
- Ativa o plano de energia de Alto Desempenho
- Verifica drivers desatualizados (mais de 2 anos sem atualização)
- Ajusta serviços em segundo plano seguros de mudar para "Manual"
- **Tweaks avançados de desempenho**: ajusta efeitos visuais para
  melhor desempenho, desativa transparência, remove atraso de menus,
  desativa apps em segundo plano da Store e desativa a gravação em segundo
  plano do Xbox Game Bar — os que mais pesam na resposta visual do sistema
- **Armazenamento**: verifica e ativa o TRIM do SSD (mantém a
  velocidade de escrita ao longo do tempo), oferece desativar a hibernação
  (libera vários GB), e só sugere reduzir o SysMain/Superfetch quando
  detecta que o disco do sistema é um HD mecânico de verdade — em SSD isso
  fica de fora de propósito, porque a pesquisa mostrou que o próprio Windows
  já pula essa otimização dinamicamente e desativar à força não traz
  ganho real
- **Encerrar processos ocupando RAM agora** (novo): detecta se apps
  opcionais conhecidos (OneDrive, Spotify, Discord, Steam, Epic Games,
  Teams pessoal, Skype, Dropbox) estão rodando em segundo plano e mostra
  quanta RAM cada um está usando, com opção de encerrar na hora

Tudo com um **score de saúde do PC (0-100)** e uma lista de ações priorizadas
por impacto. As ações são reversíveis (exceto limpeza de temp, que é segura
por natureza).

## Pré-requisitos

- Windows 10 ou 11
- [Node.js LTS](https://nodejs.org) instalado
- Rodar o app **como Administrador** (necessário para mexer em alguns
  serviços e chaves de registro em `HKLM`)

## Como rodar em modo de desenvolvimento

```bash
npm install
npm start
```

## Como gerar o instalador (.exe)

```bash
npm run build
```

Isso vai gerar o instalador dentro da pasta `dist/`, algo como
`Optimizer Setup 1.0.0.exe`. Basta rodar esse arquivo para instalar o app
normalmente, como qualquer programa do Windows (vai criar atalho na área de
trabalho e entrada no Painel de Controle > Programas).

> **Nota:** o build precisa ser feito em uma máquina Windows (ou com Wine
> configurado), porque o instalador gerado é específico para Windows (NSIS).

## Estrutura do projeto

```
optimizer-app/
├── main.js              # processo principal (orquestra tudo)
├── preload.js            # ponte segura UI <-> sistema
├── modules/
│   ├── psRunner.js        # executor de comandos PowerShell
│   ├── startupManager.js  # apps de inicialização
│   ├── diskCleaner.js     # arquivos temporários
│   ├── powerPlanManager.js# plano de energia
│   ├── driverChecker.js   # drivers desatualizados
│   ├── serviceOptimizer.js# serviços em segundo plano
│   ├── performanceBoost.js# tweaks avançados (efeitos visuais, background apps, etc)
│   ├── storageOptimizer.js# TRIM, hibernação, SysMain condicional
│   ├── processOptimizer.js# encerrar processos opcionais em segundo plano
│   ├── optimizerEngine.js # score + priorização de ações
│   └── database.js        # histórico local (JSON em %APPDATA%)
└── renderer/
    ├── index.html
    ├── style.css
    └── renderer.js
```

## O que ficou de fora (de propósito)

Durante a pesquisa apareceram outros tweaks populares que **não** entraram no
app porque relatos de usuários mostram resultados inconsistentes ou risco de
efeitos colaterais (travamentos, problemas de áudio, perda de captura de
tela): alterar o `NetworkThrottlingIndex` no registro, mexer na prioridade de
threads via MMCSS e forçar "Hardware-accelerated GPU Scheduling" (HAGS) —
esse último ajuda em algumas GPUs recentes e atrapalha outras, então fica
como recomendação manual: `Configurações → Sistema → Vídeo → Gráficos`.
Também **não desativamos o pagefile** — várias fontes de 2026 confirmam que
isso pode causar travamentos quando a RAM está sob pressão, e a economia de
espaço em disco não compensa o risco.

## Avisos importantes

- Algumas ações (registro em `HKLM`, alguns serviços) exigem que o app rode
  como Administrador. Se algo falhar silenciosamente, tente reabrir o app
  com clique direito → "Executar como administrador".
- O app **não baixa nem instala drivers automaticamente** — apenas aponta
  quais estão desatualizados, para você atualizar pelo site do fabricante ou
  Windows Update. Automatizar isso seria arriscado (poderia baixar drivers
  incompatíveis).
- Todas as mudanças de startup e serviços ficam registradas no histórico do
  app, então você sempre sabe o que foi alterado.
- **Encerrar processos** fecha o app imediatamente (é diferente de só tirar
  do startup). Só entram na lista apps opcionais conhecidos — nunca
  processos do Windows — mas ainda assim salve qualquer trabalho em aberto
  nesses apps antes de aplicar (ex: se o Spotify estiver tocando ou o
  Discord estiver numa chamada, ele vai fechar).
