// mestre.js
let perguntasRestantes = [];
let historico = [];
let jogoFinalizado = false;

window.onload = async () => {
  if (localStorage.getItem("jogoFinalizado") === "true") {
    const vencedor = localStorage.getItem("vencedor") || "um jogador";
    alert(`O jogo já foi finalizado! Vencedor: ${vencedor}`);
    // Mestre não é redirecionado, mas exibe alerta e desabilita botões
    jogoFinalizado = true;
    // Continua para renderizar o painel, mas com botão desabilitado
  }

  if (localStorage.getItem("jogoIniciado") !== "true") {
    alert("O jogo ainda não foi iniciado. Volte ao lobby.");
    window.location.href = "lobby.html?role=mestre";
    return;
  }

  const stored = localStorage.getItem("perguntasRestantes");
  if (stored) {
    perguntasRestantes = JSON.parse(stored);
  } else {
    perguntasRestantes = await carregarDadosDoBingo();
    if (perguntasRestantes.length === 0) {
      alert("Erro ao carregar perguntas.");
      return;
    }
    for (let i = perguntasRestantes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [perguntasRestantes[i], perguntasRestantes[j]] = [
        perguntasRestantes[j],
        perguntasRestantes[i],
      ];
    }
  }

  const historicoSalvo = localStorage.getItem("historico");
  if (historicoSalvo) historico = JSON.parse(historicoSalvo);
  renderizarPainelMestre();

  window.addEventListener("storage", (e) => {
    if (e.key === "erroJogador") {
      const erro = JSON.parse(e.newValue);
      if (erro && !jogoFinalizado) {
        alert(
          `⚠️ ${erro.jogador} errou! Resposta correta: ${erro.respostaCorreta}. Ele será removido.`,
        );
        atualizarListaJogadoresMestre();
      }
    }
    if (e.key === "bingoFalso") {
      const falso = JSON.parse(e.newValue);
      if (falso && !jogoFinalizado) {
        alert(`⚠️ ${falso.jogador} tentou BINGO falso! Eliminado.`);
        atualizarListaJogadoresMestre();
      }
    }
    if (e.key === "jogadores") {
      atualizarListaJogadoresMestre();
    }
    if (e.key === "bingoAviso") {
      const aviso = JSON.parse(e.newValue);
      if (aviso && !jogoFinalizado) {
        finalizarJogoPorVitoria(aviso.jogador);
      }
    }
  });
};

function renderizarPainelMestre() {
  const panel = document.getElementById("mestrePanel");
  const jogadores = JSON.parse(localStorage.getItem("jogadores") || "[]");
  const ativos = jogadores.filter((j) => j.presente === true).length;
  const total = jogadores.length;
  const vencedor = localStorage.getItem("vencedor") || null;

  panel.innerHTML = `
    <div class="mestre-grid">
      <div class="mestre-col-left">
        <div class="card mb-3">
          <div class="card-header bg-warning text-dark">
            <h4 class="mb-0">🎲 Sorteio</h4>
          </div>
          <div class="card-body">
            <div class="d-flex flex-wrap justify-content-between gap-2 mb-3">
              <span class="badge bg-secondary fs-6">📋 Perguntas: ${perguntasRestantes.length}</span>
              <span class="badge bg-info fs-6">👥 Ativos: ${ativos}/${total}</span>
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
          <div class="card-body p-2" id="historicoLista" style="max-height: 350px; overflow-y: auto;">
            ${historico.length === 0 ? '<p class="text-muted text-center py-3">Nenhuma pergunta sorteada.</p>' : ""}
            ${historico
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
              .join("")}
          </div>
        </div>

        <button id="btnFinalizar" class="btn btn-danger w-100 py-2 mb-2">🏁 Finalizar Jogo</button>
      </div>

      <div class="mestre-col-right">
        <div class="card">
          <div class="card-header bg-info text-white"><h4 class="mb-0">👥 Jogadores</h4></div>
          <div class="card-body p-0" id="listaJogadoresMestre">${carregarListaJogadoresHTML()}</div>
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
}

function atualizarListaJogadoresMestre() {
  if (jogoFinalizado) return;
  const container = document.getElementById("listaJogadoresMestre");
  if (container) container.innerHTML = carregarListaJogadoresHTML();

  const ativosSpan = document.querySelector(".badge.bg-info");
  if (ativosSpan) {
    const jogadores = JSON.parse(localStorage.getItem("jogadores") || "[]");
    const ativos = jogadores.filter((j) => j.presente === true).length;
    const total = jogadores.length;
    ativosSpan.textContent = `👥 Ativos: ${ativos}/${total}`;
  }
}

function carregarListaJogadoresHTML() {
  const jogadores = JSON.parse(localStorage.getItem("jogadores") || "[]");
  if (jogadores.length === 0)
    return '<p class="text-muted text-center p-3">Nenhum jogador.</p>';

  const ordenados = [...jogadores].sort((a, b) => {
    if (a.presente !== b.presente) return a.presente ? -1 : 1;
    return (b.pontuacao || 0) - (a.pontuacao || 0);
  });

  return `<ul class="list-group list-group-flush">${ordenados
    .map(
      (j) => `
    <li class="list-group-item d-flex flex-wrap justify-content-between align-items-center ${!j.presente ? "opacity-50 bg-light" : ""}">
      <div class="d-flex flex-column">
        <span class="fw-bold ${!j.presente ? "text-decoration-line-through" : ""}">${j.nome}</span>
        <small class="text-muted">🎯 Acertos: ${j.pontuacao || 0}</small>
      </div>
      <div class="d-flex gap-2 mt-1 mt-sm-0">
        ${j.bingo ? '<span class="badge bg-success rounded-pill">🏆 BINGO!</span>' : ""}
        ${!j.presente ? '<span class="badge bg-secondary rounded-pill">❌ Eliminado</span>' : ""}
      </div>
    </li>
  `,
    )
    .join("")}</ul>`;
}

function sortearPergunta() {
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
  localStorage.setItem(
    "perguntasRestantes",
    JSON.stringify(perguntasRestantes),
  );
  localStorage.setItem("historico", JSON.stringify(historico));
  localStorage.setItem(
    "sorteioAtual",
    JSON.stringify({
      pergunta: sorteada.pergunta,
      resposta: sorteada.resposta,
    }),
  );

  const perguntaDiv = document.getElementById("perguntaAtual");
  if (perguntaDiv) perguntaDiv.style.display = "block";
  document.getElementById("textoPergunta").innerText = sorteada.pergunta;
  document.getElementById("textoResposta").innerText = sorteada.resposta;

  const historicoDiv = document.getElementById("historicoLista");
  if (historicoDiv) {
    historicoDiv.innerHTML = historico
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

  const restantesSpan = document.querySelector(".badge.bg-secondary");
  if (restantesSpan)
    restantesSpan.textContent = `📋 Perguntas: ${perguntasRestantes.length}`;

  if (perguntasRestantes.length === 0) {
    document.getElementById("btnSortear").disabled = true;
    alert("Fim das perguntas! O jogo terminou.");
  }
}

function finalizarJogoPorVitoria(vencedor) {
  if (jogoFinalizado) return;
  jogoFinalizado = true;

  // Remove o estado de jogo iniciado e marca como finalizado
  localStorage.removeItem("jogoIniciado");
  localStorage.setItem("jogoFinalizado", "true");
  localStorage.setItem("vencedor", vencedor);

  let jogadores = JSON.parse(localStorage.getItem("jogadores") || "[]");
  const idx = jogadores.findIndex((j) => j.nome === vencedor);
  if (idx !== -1) {
    jogadores[idx].bingo = true;
    jogadores[idx].bingoCorreto = true;
    localStorage.setItem("jogadores", JSON.stringify(jogadores));
  }

  alert(`🎉 ${vencedor} fez BINGO verdadeiro! O jogo foi finalizado.`);

  const btnSortear = document.getElementById("btnSortear");
  if (btnSortear) btnSortear.disabled = true;
  atualizarListaJogadoresMestre();

  // Recarregar o painel para mostrar a mensagem de vencedor
  renderizarPainelMestre();
}

function finalizarJogo() {
  if (jogoFinalizado) {
    alert("O jogo já foi finalizado por um vencedor!");
    return;
  }
  if (
    confirm("Deseja realmente finalizar o jogo? Todos os dados serão perdidos.")
  ) {
    limparEstadoJogo(); // remove TODAS as chaves (jogoIniciado, jogoFinalizado, etc.)
    // Não definir jogoFinalizado novamente!
    window.location.href = "index.html";
  }
}
