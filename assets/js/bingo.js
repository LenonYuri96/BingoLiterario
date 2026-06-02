// bingo.js - Função de verificação de bingo (5x3)
function verificarBingo(cartela, nomeJogador) {
  // Recupera as marcações do jogador no localStorage
  const marcacoes = JSON.parse(
    localStorage.getItem(`marcacoes_${nomeJogador}`) || "[]",
  );

  // Cria matriz 5x3 para controle das células marcadas
  const marcadas = Array(5)
    .fill()
    .map(() => Array(3).fill(false));

  // Marca as posições que o jogador selecionou
  marcacoes.forEach(({ linha, coluna }) => {
    if (linha < 5 && coluna < 3) marcadas[linha][coluna] = true;
  });

  // Verifica linhas completas (5 linhas)
  for (let i = 0; i < 5; i++) {
    let linhaCompleta = true;
    for (let j = 0; j < 3; j++) {
      if (!marcadas[i][j]) {
        linhaCompleta = false;
        break;
      }
    }
    if (linhaCompleta) return true;
  }

  // Verifica colunas completas (3 colunas)
  for (let j = 0; j < 3; j++) {
    let colunaCompleta = true;
    for (let i = 0; i < 5; i++) {
      if (!marcadas[i][j]) {
        colunaCompleta = false;
        break;
      }
    }
    if (colunaCompleta) return true;
  }

  // Nenhuma linha ou coluna completa → ainda não é BINGO
  return false;
}