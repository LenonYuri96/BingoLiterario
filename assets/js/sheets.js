// sheets.js
const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR1ISirEM6MHmtCO3h6AsOrJy6u53UfvE54jF0maos3oSpGm-5XvnoTpblNU1K13V2vsnM16NM8dX49/pub?output=csv";

// Função para parse de CSV respeitando aspas duplas e vírgulas dentro de campos
function parseCSV(csvTexto) {
  const linhas = [];
  let atual = "";
  let dentroAspas = false;
  let linhaAtual = [];

  for (let i = 0; i < csvTexto.length; i++) {
    const char = csvTexto[i];
    const nextChar = csvTexto[i + 1];

    if (char === '"') {
      if (dentroAspas && nextChar === '"') {
        // Aspas duplas escapadas -> adiciona uma aspa literal
        atual += '"';
        i++; // pula a próxima aspa
      } else {
        // Alterna o estado de dentro/fora de aspas
        dentroAspas = !dentroAspas;
      }
    } else if (char === "," && !dentroAspas) {
      // Finaliza o campo atual
      linhaAtual.push(atual.trim());
      atual = "";
    } else if ((char === "\n" || char === "\r") && !dentroAspas) {
      // Finaliza a linha (ignora \r)
      if (char === "\r" && nextChar === "\n") continue; // trata \r\n
      linhaAtual.push(atual.trim());
      if (linhaAtual.length > 0 && linhaAtual.some((c) => c !== "")) {
        linhas.push(linhaAtual);
      }
      linhaAtual = [];
      atual = "";
      if (char === "\r" && nextChar === "\n") i++; // pula o \n
    } else {
      atual += char;
    }
  }
  // Último campo
  if (atual !== "" || linhaAtual.length > 0) {
    linhaAtual.push(atual.trim());
    if (linhaAtual.some((c) => c !== "")) {
      linhas.push(linhaAtual);
    }
  }
  return linhas;
}

async function carregarDadosDoBingo() {
  try {
    const response = await fetch(CSV_URL);
    const csvTexto = await response.text();
    const linhas = parseCSV(csvTexto);

    if (linhas.length < 2) return [];

    // A primeira linha é o cabeçalho. Vamos assumir coluna 0 = Obra/Pergunta, coluna 1 = Autor/Resposta
    const dados = [];
    for (let i = 1; i < linhas.length; i++) {
      const pergunta = linhas[i][0]
        ? linhas[i][0].replace(/^"|"$/g, "").trim()
        : "";
      const resposta = linhas[i][1]
        ? linhas[i][1].replace(/^"|"$/g, "").trim()
        : "";
      if (pergunta && resposta) {
        dados.push({
          pergunta: pergunta,
          resposta: resposta,
        });
      }
    }
    return dados;
  } catch (error) {
    console.error("Erro ao carregar a planilha:", error);
    return [];
  }
}
