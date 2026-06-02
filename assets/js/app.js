// app.js - Funções globais e utilitárias (versão original com localStorage)

// Limpa toda a comunicação anterior (usado ao finalizar o jogo manualmente)
function limparEstadoJogo() {
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