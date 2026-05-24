// lobby.js
const role = getParameterByName("role");
let jogadores = [];

function carregarLobby() {
  const content = document.getElementById("lobbyContent");
  if (role === "mestre") {
    // Mestre vê a lista de jogadores e botão iniciar
    content.innerHTML = `
      <div class="card">
        <div class="card-header bg-primary text-white">
          <h4 class="mb-0">👑 Painel do Mestre</h4>
        </div>
        <div class="card-body">
          <h5 class="card-title">Jogadores na sala:</h5>
          <ul id="listaJogadores" class="list-group mb-3"></ul>
          <button id="btnIniciar" class="btn btn-success btn-lg w-100" disabled>🎬 Iniciar Jogo (aguardando pelo menos 1 jogador)</button>
        </div>
      </div>
    `;
    atualizarListaJogadores();
    // Ouvir mudanças na lista de jogadores
    window.addEventListener("storage", (e) => {
      if (e.key === "jogadores") atualizarListaJogadores();
    });
    document
      .getElementById("btnIniciar")
      .addEventListener("click", iniciarJogo);
  } else if (role === "jogador") {
    // Jogador entra com nome
    content.innerHTML = `
      <div class="card">
        <div class="card-header bg-success text-white">
          <h4 class="mb-0">🎮 Entrar no Jogo</h4>
        </div>
        <div class="card-body">
          <input type="text" id="nomeJogador" class="form-control mb-2" placeholder="Digite seu nome" autocomplete="off">
          <button id="btnEntrar" class="btn btn-primary w-100">Entrar no Lobby</button>
          <div id="mensagem" class="mt-3 text-center"></div>
        </div>
      </div>
    `;
    document
      .getElementById("btnEntrar")
      .addEventListener("click", entrarNoLobby);

    // Verificar se o jogo já começou ou já foi finalizado
    if (localStorage.getItem("jogoIniciado") === "true") {
      document.getElementById("mensagem").innerHTML =
        '<div class="alert alert-warning">⚠️ O jogo já começou! Não é possível entrar agora.</div>';
      document.getElementById("btnEntrar").disabled = true;
    }
    if (localStorage.getItem("jogoFinalizado") === "true") {
      document.getElementById("mensagem").innerHTML =
        '<div class="alert alert-danger">🏆 O jogo já foi finalizado! Não é possível entrar.</div>';
      document.getElementById("btnEntrar").disabled = true;
    }
  }
}

function atualizarListaJogadores() {
  const jogadoresSalvos = localStorage.getItem("jogadores");
  jogadores = jogadoresSalvos ? JSON.parse(jogadoresSalvos) : [];

  const listaUl = document.getElementById("listaJogadores");
  if (listaUl) {
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
}

function entrarNoLobby() {
  const nomeInput = document.getElementById("nomeJogador");
  const nome = nomeInput.value.trim();
  if (nome === "") {
    alert("Digite um nome válido");
    return;
  }

  // 🔒 Verificações de segurança
  if (localStorage.getItem("jogoIniciado") === "true") {
    document.getElementById("mensagem").innerHTML =
      '<div class="alert alert-danger">Jogo já iniciado!</div>';
    return;
  }
  if (localStorage.getItem("jogoFinalizado") === "true") {
    document.getElementById("mensagem").innerHTML =
      '<div class="alert alert-danger">Jogo já finalizado! Não é possível entrar.</div>';
    return;
  }

  let jogadoresAtuais = JSON.parse(localStorage.getItem("jogadores") || "[]");
  if (jogadoresAtuais.some((j) => j.nome === nome)) {
    alert("Este nome já está sendo usado!");
    return;
  }

  // Adiciona jogador com todos os campos obrigatórios
  jogadoresAtuais.push({
    nome: nome,
    cartela: null,
    pontuacao: 0,
    bingo: false,
    presente: true,
    bingoCorreto: false,
    horario: new Date().toISOString(),
  });
  localStorage.setItem("jogadores", JSON.stringify(jogadoresAtuais));
  sessionStorage.setItem("meuNome", nome);

  // Limpeza de flags antigas (garante estado limpo)
  localStorage.removeItem("erroJogador");
  localStorage.removeItem("bingoAviso");
  localStorage.removeItem("jogoFinalizado"); // não precisa, mas mantém coerência

  document.getElementById("mensagem").innerHTML =
    '<div class="alert alert-success">✅ Você entrou no lobby! Aguarde o mestre iniciar.</div>';
  document.getElementById("btnEntrar").disabled = true;
  nomeInput.disabled = true;
}

async function iniciarJogo() {
  if (jogadores.length === 0) {
    alert("Nenhum jogador na sala!");
    return;
  }

  // 🔒 Verifica se o jogo já foi finalizado (segurança extra)
  if (localStorage.getItem("jogoFinalizado") === "true") {
    alert("O jogo já foi finalizado. Não é possível reiniciar agora.");
    window.location.href = "index.html";
    return;
  }

  // Resetar status de eliminação, pontuação e flags de todos os jogadores
  let jogadoresReset = JSON.parse(localStorage.getItem("jogadores") || "[]");
  jogadoresReset = jogadoresReset.map((j) => ({
    ...j,
    presente: true,
    bingo: false,
    bingoCorreto: false,
    pontuacao: 0,
  }));
  localStorage.setItem("jogadores", JSON.stringify(jogadoresReset));
  jogadores = jogadoresReset;

  // Carregar perguntas
  const todasPerguntas = await carregarDadosDoBingo();
  if (todasPerguntas.length === 0) {
    alert("Erro ao carregar perguntas. Verifique a planilha.");
    return;
  }

  // Embaralhar perguntas
  const perguntasEmbaralhadas = [...todasPerguntas];
  for (let i = perguntasEmbaralhadas.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [perguntasEmbaralhadas[i], perguntasEmbaralhadas[j]] = [
      perguntasEmbaralhadas[j],
      perguntasEmbaralhadas[i],
    ];
  }

  // Guardar estado do jogo
  localStorage.setItem(
    "perguntasRestantes",
    JSON.stringify(perguntasEmbaralhadas),
  );
  localStorage.setItem("historico", JSON.stringify([]));
  localStorage.setItem("jogoIniciado", "true");
  localStorage.removeItem("jogoFinalizado"); // garante que não haja resíduo
  localStorage.removeItem("vencedor");

  // Redirecionar mestre diretamente
  window.location.href = "mestre.html";
  // Os jogadores serão redirecionados ao detectar a flag "jogoIniciado" via storage
}

window.onload = () => {
  carregarLobby();
  // Se for jogador, escutar o início do jogo
  if (role === "jogador") {
    window.addEventListener("storage", (e) => {
      if (e.key === "jogoIniciado" && e.newValue === "true") {
        // Só redireciona se o jogo não tiver sido finalizado (segurança)
        if (localStorage.getItem("jogoFinalizado") !== "true") {
          window.location.href = "jogador.html";
        } else {
          alert("O jogo já foi finalizado. Você não pode entrar.");
        }
      }
    });
  }
};
