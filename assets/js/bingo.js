// bingo.js
function verificarBingo(cartela, nomeJogador) {
  // Cartela é 5x3
  const marcacoes = JSON.parse(
    localStorage.getItem(`marcacoes_${nomeJogador}`) || "[]",
  );
  const marcadas = Array(5)
    .fill()
    .map(() => Array(3).fill(false));
  marcacoes.forEach(({ linha, coluna }) => {
    if (linha < 5 && coluna < 3) marcadas[linha][coluna] = true;
  });
  // Verificar linhas completas
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
  // Verificar colunas (3 colunas)
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
  // Opcional: cartela toda (mas com 5x3, linha ou coluna já basta)
  // Verificar diagonal não se aplica (5x3)
  return false;
}
