// sheets.js - versão com JSONP (sem CORS) para GET e no-cors para POST
const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR1ISirEM6MHmtCO3h6AsOrJy6u53UfvE54jF0maos3oSpGm-5XvnoTpblNU1K13V2vsnM16NM8dX49/pub?output=csv";
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzkjIMhqxPG8ySlG5p48P7cAz6ltC_gWO9619iU2mfOwaQJ2RWrjrtchGjbiYs8bT4t/exec";

// ---------- Parse CSV (original, sem alterações) ----------
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
        atual += '"';
        i++;
      } else {
        dentroAspas = !dentroAspas;
      }
    } else if (char === "," && !dentroAspas) {
      linhaAtual.push(atual.trim());
      atual = "";
    } else if ((char === "\n" || char === "\r") && !dentroAspas) {
      if (char === "\r" && nextChar === "\n") continue;
      linhaAtual.push(atual.trim());
      if (linhaAtual.length > 0 && linhaAtual.some((c) => c !== ""))
        linhas.push(linhaAtual);
      linhaAtual = [];
      atual = "";
      if (char === "\r" && nextChar === "\n") i++;
    } else {
      atual += char;
    }
  }
  if (atual !== "" || linhaAtual.length > 0) {
    linhaAtual.push(atual.trim());
    if (linhaAtual.some((c) => c !== "")) linhas.push(linhaAtual);
  }
  return linhas;
}

async function carregarDadosDoBingo() {
  try {
    const response = await fetch(CSV_URL);
    const csvTexto = await response.text();
    const linhas = parseCSV(csvTexto);
    if (linhas.length < 2) return [];
    const dados = [];
    for (let i = 1; i < linhas.length; i++) {
      const pergunta = linhas[i][0]
        ? linhas[i][0].replace(/^"|"$/g, "").trim()
        : "";
      const resposta = linhas[i][1]
        ? linhas[i][1].replace(/^"|"$/g, "").trim()
        : "";
      if (pergunta && resposta) dados.push({ pergunta, resposta });
    }
    return dados;
  } catch (error) {
    console.error("Erro ao carregar a planilha de perguntas:", error);
    return [];
  }
}

// ---------- Comunicação com JSONP (contorna CORS completamente) ----------
function obterEstadoCompleto() {
  return new Promise((resolve, reject) => {
    const callbackName =
      "jsonp_callback_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
    const script = document.createElement("script");
    const url = `${SCRIPT_URL}?callback=${callbackName}`;

    window[callbackName] = function (data) {
      delete window[callbackName];
      document.body.removeChild(script);
      resolve({
        jogadores: Array.isArray(data.jogadores) ? data.jogadores : [],
        estado:
          data.estado && typeof data.estado === "object" ? data.estado : {},
      });
    };

    script.onerror = function () {
      delete window[callbackName];
      document.body.removeChild(script);
      console.error("JSONP request failed");
      reject(new Error("JSONP request failed"));
    };

    script.src = url;
    document.body.appendChild(script);
  });
}

// POSTs continuam com no-cors (não precisamos ler resposta)
async function atualizarJogadorRemoto(jogador) {
  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "atualizarJogador", jogador }),
    });
  } catch (error) {
    console.error("Erro ao atualizar jogador:", error);
  }
}

async function atualizarEstadoRemoto(estado) {
  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "atualizarEstado", estado }),
    });
  } catch (error) {
    console.error("Erro ao atualizar estado:", error);
  }
}

async function resetarJogoRemoto() {
  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "resetarJogo" }),
    });
  } catch (error) {
    console.error("Erro ao resetar jogo:", error);
  }
}
