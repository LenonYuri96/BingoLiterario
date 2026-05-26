// lobby.js
const role = getParameterByName("role");
let jogadores = [];
let intervaloPolling = null;

function carregarLobby() {
  const content = document.getElementById("lobbyContent");
  if (role === "mestre") {
    content.innerHTML = `
      <div class="card">
        <div class="card-header bg-primary text-white"><h4 class="mb-0">👑 Painel do Mestre</h4></div>
        <div class="card-body">
          <h5>Jogadores na sala:</h5>
          <ul id="listaJogadores" class="list-group mb-3"></ul>
          <button id="btnIniciar" class="btn btn-success btn-lg w-100" disabled>🎬 Iniciar Jogo (aguardando jogador)</button>
        </div>
      </div>
    `;
    iniciarPollingMestre();
    document
      .getElementById("btnIniciar")
      .addEventListener("click", iniciarJogo);
  } else if (role === "jogador") {
    content.innerHTML = `
      <div class="card">
        <div class="card-header bg-success text-white"><h4 class="mb-0">🎮 Entrar no Jogo</h4></div>
        <div class="card-body">
          <input type="text" id="nomeJogador" class="form-control mb-2" placeholder="Seu nome" autocomplete="off">
          <button id="btnEntrar" class="btn btn-primary w-100">Entrar no Lobby</button>
          <div id="mensagem" class="mt-3 text-center"></div>
        </div>
      </div>
    `;
    document
      .getElementById("btnEntrar")
      .addEventListener("click", entrarNoLobby);
    verificarEstadoInicial();
    iniciarPollingJogador();
  }
}

async function verificarEstadoInicial() {
  const { estado } = await obterEstadoCompleto();
  if (estado.jogoIniciado === "true") {
    document.getElementById("mensagem").innerHTML =
      '<div class="alert alert-warning">⚠️ Jogo já começou! Não pode entrar.</div>';
    document.getElementById("btnEntrar").disabled = true;
  }
  if (estado.jogoFinalizado === "true") {
    document.getElementById("mensagem").innerHTML =
      '<div class="alert alert-danger">🏆 Jogo finalizado!</div>';
    document.getElementById("btnEntrar").disabled = true;
  }
}

function iniciarPollingMestre() {
  intervaloPolling = setInterval(async () => {
    const { jogadores: lista } = await obterEstadoCompleto();
    jogadores = lista;
    atualizarListaJogadores();
  }, 2000);
}

function iniciarPollingJogador() {
  intervaloPolling = setInterval(async () => {
    const { estado } = await obterEstadoCompleto();
    if (estado.jogoIniciado === "true" && estado.jogoFinalizado !== "true") {
      if (
        sessionStorage.getItem("meuNome") &&
        !window.location.href.includes("jogador.html")
      ) {
        window.location.href = "jogador.html";
      }
    }
  }, 2000);
}

function atualizarListaJogadores() {
  const listaUl = document.getElementById("listaJogadores");
  if (!listaUl) return;
  listaUl.innerHTML = "";
  jogadores.forEach((jog) => {
    const li = document.createElement("li");
    li.className =
      "list-group-item d-flex justify-content-between align-items-center";
    li.innerHTML = `<span>${jog.nome}</span>`;
    listaUl.appendChild(li);
  });
  const btnIniciar = document.getElementById("btnIniciar");
  if (btnIniciar) btnIniciar.disabled = jogadores.length === 0;
}

async function entrarNoLobby() {
  const nome = document.getElementById("nomeJogador").value.trim();
  if (!nome) return alert("Digite um nome");
  const { estado } = await obterEstadoCompleto();
  if (estado.jogoIniciado === "true") return alert("Jogo já começou!");
  if (estado.jogoFinalizado === "true") return alert("Jogo finalizado!");

  const { jogadores: lista } = await obterEstadoCompleto();
  if (lista.some((j) => j.nome === nome)) return alert("Nome já existe!");

  const novoJogador = {
    nome,
    presente: true,
    cartela: null,
    pontuacao: 0,
    bingo: false,
    bingoCorreto: false,
    horario: new Date().toISOString(),
    lastSeen: Date.now(),
    selecoes: "[]",
  };
  await atualizarJogadorRemoto(novoJogador);
  sessionStorage.setItem("meuNome", nome);
  document.getElementById("mensagem").innerHTML =
    '<div class="alert alert-success">✅ Aguarde o mestre iniciar!</div>';
  document.getElementById("btnEntrar").disabled = true;
}

async function iniciarJogo() {
  if (jogadores.length === 0) return alert("Nenhum jogador!");
  const todasPerguntas = await carregarDadosDoBingo();
  if (!todasPerguntas.length) return alert("Erro ao carregar perguntas");
  const embaralhadas = [...todasPerguntas];
  for (let i = embaralhadas.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [embaralhadas[i], embaralhadas[j]] = [embaralhadas[j], embaralhadas[i]];
  }
  await atualizarEstadoRemoto({
    jogoIniciado: "true",
    perguntasRestantes: JSON.stringify(embaralhadas),
    historico: JSON.stringify([]),
    jogoFinalizado: "false",
    vencedor: "",
  });
  window.location.href = "mestre.html";
}

window.onload = carregarLobby;
