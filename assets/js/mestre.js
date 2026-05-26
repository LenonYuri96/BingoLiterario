// mestre.js
let perguntasRestantes = [];
let historico = [];
let jogoFinalizado = false;
let pollingInterval = null;

window.onload = async () => {
  // Obtém estado atual da planilha
  const { estado } = await obterEstadoCompleto();

  // 🔒 Verificação de segurança: garante que 'estado' seja um objeto válido
  if (!estado || typeof estado !== "object") {
    console.error("Estado inválido recebido da API:", estado);
    alert(
      "Erro ao carregar dados do servidor. Recarregue a página e tente novamente.",
    );
    return;
  }

  if (estado.jogoFinalizado === "true") {
    alert(`Jogo finalizado! Vencedor: ${estado.vencedor || "um jogador"}`);
    jogoFinalizado = true;
  }

  if (estado.jogoIniciado !== "true") {
    alert("O jogo ainda não foi iniciado. Volte ao lobby.");
    window.location.href = "lobby.html?role=mestre";
    return;
  }

  // Carrega perguntas e histórico do estado remoto
  perguntasRestantes = JSON.parse(estado.perguntasRestantes || "[]");
  historico = JSON.parse(estado.historico || "[]");

  renderizarPainelMestre();
  iniciarPolling();
};

function iniciarPolling() {
  pollingInterval = setInterval(async () => {
    const { estado, jogadores } = await obterEstadoCompleto();

    // Verifica se o jogo foi finalizado por algum jogador
    if (estado && estado.jogoFinalizado === "true" && !jogoFinalizado) {
      jogoFinalizado = true;
      alert(
        `🎉 ${estado.vencedor} fez BINGO verdadeiro! O jogo foi finalizado.`,
      );
      renderizarPainelMestre(); // recarrega o painel mostrando o vencedor
    }

    // Atualiza a lista de jogadores em tempo real
    const container = document.getElementById("listaJogadoresMestre");
    if (container && jogadores) {
      container.innerHTML = carregarListaJogadoresHTML(jogadores);
    }

    // Atualiza o contador de ativos (considerando lastSeen nos últimos 10 segundos)
    const ativosSpan = document.querySelector(".badge.bg-info");
    if (ativosSpan && jogadores) {
      const onlineCutoff = Date.now() - 10000;
      const ativos = jogadores.filter(
        (j) => j.presente === true && (j.lastSeen || 0) > onlineCutoff,
      ).length;
      ativosSpan.textContent = `👥 Ativos: ${ativos}/${jogadores.length}`;
    }
  }, 2000);
}

function renderizarPainelMestre() {
  const panel = document.getElementById("mestrePanel");
  const vencedor = jogoFinalizado
    ? JSON.parse(localStorage.getItem("estadoCache") || "{}").vencedor || "?"
    : null;

  panel.innerHTML = `
    <div class="mestre-grid">
      <div class="mestre-col-left">
        <div class="card mb-3">
          <div class="card-header bg-warning text-dark"><h4 class="mb-0">🎲 Sorteio</h4></div>
          <div class="card-body">
            <div class="d-flex flex-wrap justify-content-between gap-2 mb-3">
              <span class="badge bg-secondary fs-6">📋 Perguntas: ${perguntasRestantes.length}</span>
              <span class="badge bg-info fs-6">👥 Ativos: --</span>
            </div>
            <button id="btnSortear" class="btn btn-sortear btn-lg w-100 mb-3" ${
              perguntasRestantes.length === 0 || jogoFinalizado
                ? "disabled"
                : ""
            }>🎲 Sortear Pergunta</button>
            ${jogoFinalizado ? `<div class="alert alert-success text-center">🏆 Jogo finalizado! Vencedor: <strong>${vencedor}</strong></div>` : ""}
            <div id="perguntaAtual" class="mt-3 alert alert-info" style="display:none;">
              <div class="fw-bold mb-1">📢 Pergunta:</div>
              <div id="textoPergunta" class="mb-2 p-2 bg-white rounded"></div>
              <div class="fw-bold mb-1">🔑 Resposta:</div>
              <div id="textoResposta" class="p-2 bg-white rounded text-success fw-bold"></div>
            </div>
          </div>
        </div>

        <div class="card mb-3">
          <div class="card-header bg-secondary text-white"><h4 class="mb-0">📜 Histórico</h4></div>
          <div class="card-body p-2" id="historicoLista" style="max-height: 350px; overflow-y: auto;"></div>
        </div>

        <button id="btnFinalizar" class="btn btn-danger w-100 py-2 mb-2">🏁 Finalizar Jogo</button>
      </div>

      <div class="mestre-col-right">
        <div class="card">
          <div class="card-header bg-info text-white"><h4 class="mb-0">👥 Jogadores</h4></div>
          <div class="card-body p-0" id="listaJogadoresMestre">${carregarListaJogadoresHTML([])}</div>
        </div>
      </div>
    </div>
  `;

  document
    .getElementById("btnSortear")
    ?.addEventListener("click", sortearPergunta);
  document
    .getElementById("btnFinalizar")
    ?.addEventListener("click", finalizarJogo);

  // Preenche o histórico visualmente
  atualizarHistoricoUI();
}

function atualizarHistoricoUI() {
  const container = document.getElementById("historicoLista");
  if (!container) return;
  if (historico.length === 0) {
    container.innerHTML =
      '<p class="text-muted text-center py-3">Nenhuma pergunta sorteada.</p>';
  } else {
    container.innerHTML = historico
      .map(
        (item, idx) => `
      <div class="historico-item p-2 mb-2 bg-light rounded border-start border-4 border-primary">
        <div class="d-flex align-items-start gap-2">
          <strong class="text-primary">#${idx + 1}</strong>
          <div class="flex-grow-1">
            <div class="fw-semibold">${item.pergunta}</div>
            <small class="text-muted">✅ ${item.resposta}</small>
          </div>
        </div>
      </div>
    `,
      )
      .join("");
  }
}

function carregarListaJogadoresHTML(jogadores) {
  if (!jogadores || jogadores.length === 0) {
    return '<p class="text-muted text-center p-3">Nenhum jogador.</p>';
  }

  const onlineCutoff = Date.now() - 10000;
  const ordenados = [...jogadores].sort((a, b) => {
    const aOnline = a.presente === true && (a.lastSeen || 0) > onlineCutoff;
    const bOnline = b.presente === true && (b.lastSeen || 0) > onlineCutoff;
    if (aOnline !== bOnline) return aOnline ? -1 : 1;
    return (b.pontuacao || 0) - (a.pontuacao || 0);
  });

  return `<ul class="list-group list-group-flush">${ordenados
    .map(
      (j) => `
    <li class="list-group-item d-flex flex-wrap justify-content-between align-items-center ${!j.presente || (j.lastSeen || 0) < onlineCutoff ? "opacity-50 bg-light" : ""}">
      <div class="d-flex flex-column">
        <span class="fw-bold ${!j.presente ? "text-decoration-line-through" : ""}">${j.nome}</span>
        <small class="text-muted">🎯 Acertos: ${j.pontuacao || 0}</small>
      </div>
      <div class="d-flex gap-2 mt-1 mt-sm-0">
        ${j.bingo ? '<span class="badge bg-success rounded-pill">🏆 BINGO!</span>' : ""}
        ${!j.presente || (j.lastSeen || 0) < onlineCutoff ? '<span class="badge bg-secondary rounded-pill">❌ Offline</span>' : ""}
      </div>
    </li>
  `,
    )
    .join("")}</ul>`;
}

async function sortearPergunta() {
  if (jogoFinalizado) {
    alert("O jogo já foi finalizado por um vencedor!");
    return;
  }
  if (perguntasRestantes.length === 0) {
    alert("Todas as perguntas já foram sorteadas!");
    return;
  }

  const sorteada = perguntasRestantes.shift();
  historico.unshift(sorteada);

  // Salva o novo estado na planilha
  await atualizarEstadoRemoto({
    perguntasRestantes: JSON.stringify(perguntasRestantes),
    historico: JSON.stringify(historico),
  });

  // Exibe a pergunta e resposta no painel
  const perguntaDiv = document.getElementById("perguntaAtual");
  if (perguntaDiv) perguntaDiv.style.display = "block";
  document.getElementById("textoPergunta").innerText = sorteada.pergunta;
  document.getElementById("textoResposta").innerText = sorteada.resposta;

  // Atualiza a UI do histórico
  atualizarHistoricoUI();

  // Atualiza o contador de perguntas restantes
  const restantesSpan = document.querySelector(".badge.bg-secondary");
  if (restantesSpan) {
    restantesSpan.textContent = `📋 Perguntas: ${perguntasRestantes.length}`;
  }

  if (perguntasRestantes.length === 0) {
    document.getElementById("btnSortear").disabled = true;
    alert("Fim das perguntas! O jogo terminou.");
  }
}

async function finalizarJogo() {
  if (jogoFinalizado) {
    alert("O jogo já foi finalizado por um vencedor!");
    return;
  }
  if (
    confirm("Deseja realmente finalizar o jogo? Todos os dados serão perdidos.")
  ) {
    await resetarJogoRemoto(); // Limpa a planilha (abas Jogadores e EstadoJogo)
    window.location.href = "index.html";
  }
}
