// app.js - Funções globais e utilidades

// Limpa toda a comunicação anterior (usado ao finalizar o jogo manualmente)
function limparEstadoJogo() {
  // Limpeza local (localStorage)
  localStorage.removeItem("jogoIniciado");
  localStorage.removeItem("jogadores");
  localStorage.removeItem("sorteioAtual");
  localStorage.removeItem("historico");
  localStorage.removeItem("perguntasRestantes");
  localStorage.removeItem("cartelas");
  localStorage.removeItem("jogoFinalizado");
  localStorage.removeItem("vencedor");
  localStorage.removeItem("bingoAviso");
  localStorage.removeItem("bingoFalso");
  localStorage.removeItem("erroJogador");

  // Limpeza remota (planilha) – a função resetarJogoRemoto está definida em sheets.js
  if (typeof resetarJogoRemoto === "function") {
    resetarJogoRemoto().catch(console.error);
  }
}

// Limpa estados inconsistentes (ex: jogoFinalizado true sem jogoIniciado)
function limparEstadoInconsistente() {
  // Se o jogo não foi iniciado, mas existe flag de finalizado, remove
  if (localStorage.getItem("jogoIniciado") !== "true") {
    if (localStorage.getItem("jogoFinalizado") === "true") {
      console.log(
        "⚠️ Estado inconsistente detectado. Limpando flags de finalização.",
      );
      localStorage.removeItem("jogoFinalizado");
      localStorage.removeItem("vencedor");
    }
    // Também remove outras chaves que podem estar poluídas
    localStorage.removeItem("bingoAviso");
    localStorage.removeItem("bingoFalso");
    localStorage.removeItem("erroJogador");
  }
}

// Obtém o parâmetro da URL
function getParameterByName(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// Executa a limpeza de inconsistências assim que o script carrega
limparEstadoInconsistente();
