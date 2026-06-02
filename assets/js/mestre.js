// mestre.js - Com regras do sistema original (alertas de eliminação, bingo falso, etc.)
import {
  db,
  ref,
  onValue,
  update,
  set,
  remove,
  SALA_ID,
} from "./firebase-init.js";

let perguntasRestantes = [];
let historico = [];
let jogoFinalizado = false;
let jogadoresAtivos = [];
let jogadoresAnteriores = {}; // para detectar mudanças de status
let inicioJogo = Date.now();
let ultimoSorteio = Date.now();

const salaRef = ref(db, `salas/${SALA_ID}`);
const jogadoresRef = ref(db, `salas/${SALA_ID}/jogadores`);
const sorteioRef = ref(db, `salas/${SALA_ID}/sorteio/atual`);

// ========== ESCUTA STATUS DA SALA (finalização) ==========
onValue(salaRef, (snap) => {
  if (snap.exists()) {
    const data = snap.val();
    if (data.status === "finalizado" && data.vencedor && !jogoFinalizado) {
      finalizarJogoPorVitoria(data.vencedor, true);
    } else if (
      data.status !== "jogando" &&
      !jogoFinalizado &&
      window.location.pathname.includes("mestre.html")
    ) {
      // Se a sala não estiver jogando e o mestre estiver nessa página, redireciona
      alert("O jogo não está em andamento. Voltando ao lobby.");
      window.location.href = "lobby.html?role=mestre";
    }
  }
});

// ========== ESCUTA LISTA DE JOGADORES (detecta eliminações) ==========
onValue(jogadoresRef, (snap) => {
  const novosJogadores = snap.exists() ? Object.values(snap.val()) : [];
  // Verifica quem foi eliminado (presente false) e que antes era true
  for (const jog of novosJogadores) {
    const antigo = jogadoresAnteriores[jog.nome];
    if (
      antigo &&
      antigo.presente === true &&
      jog.presente === false &&
      !jogoFinalizado
    ) {
      alert(`⚠️ ${jog.nome} tentou BINGO falso e foi ELIMINADO!`);
    }
  }
  // Atualiza lista e armazena estado anterior
  jogadoresAtivos = novosJogadores;
  jogadoresAnteriores = {};
  jogadoresAtivos.forEach((j) => {
    jogadoresAnteriores[j.nome] = { presente: j.presente };
  });
  atualizarListaJogadoresMestre();
});

// ========== INICIALIZAÇÃO ==========
window.onload = async () => {
  // Verifica se a sala está com status 'jogando'
  const salaSnap = await new Promise((resolve) => {
    onValue(salaRef, resolve, { onlyOnce: true });
  });
  if (!salaSnap.exists() || salaSnap.val().status !== "jogando") {
    alert(
      "O jogo não foi iniciado ou já foi finalizado. Redirecionando para o lobby.",
    );
    window.location.href = "lobby.html?role=mestre";
    return;
  }

  try {
    const storedPerguntas = localStorage.getItem(`perguntas_${SALA_ID}`);
    const storedHistorico = localStorage.getItem(`historico_${SALA_ID}`);
    if (storedPerguntas) perguntasRestantes = JSON.parse(storedPerguntas);
    if (storedHistorico) historico = JSON.parse(storedHistorico);

    if (perguntasRestantes.length === 0) {
      const dados = await window.carregarDadosDoBingo();
      if (!dados?.length) throw new Error("Planilha vazia");
      perguntasRestantes = [...dados];
      for (let i = perguntasRestantes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [perguntasRestantes[i], perguntasRestantes[j]] = [
          perguntasRestantes[j],
          perguntasRestantes[i],
        ];
      }
      localStorage.setItem(
        `perguntas_${SALA_ID}`,
        JSON.stringify(perguntasRestantes),
      );
    }
    renderizarPainelMestre();
  } catch (err) {
    console.error(err);
    document.body.innerHTML = `<div style="color:red;padding:20px">Erro: ${err.message}</div>`;
  }

  // Recupera timestamps do banco e inicia monitoramento de integridade
  const salaData = salaSnap.val();
  inicioJogo = salaData.timestampInicio || Date.now();
  ultimoSorteio = salaData.timestampUltimoSorteio || Date.now();

  setInterval(verificarTimeouts, 10000); // Validação a cada 10 segundos
};

// ========== RENDERIZAÇÃO DO PAINEL ==========
function renderizarPainelMestre() {
  const ativos = jogadoresAtivos.filter((j) => j.presente === true).length;
  const total = jogadoresAtivos.length;
  const vencedor = localStorage.getItem(`vencedor_${SALA_ID}`) || "";

  document.getElementById("mestrePanel").innerHTML = `
    <div class="mestre-grid">
      <div class="mestre-col-left">
        <div class="card mb-3">
          <div class="card-header bg-warning"><h4>🎲 Sorteio</h4></div>
          <div class="card-body">
            <div class="d-flex justify-content-between mb-3">
              <span class="badge bg-secondary">📋 Perguntas: ${perguntasRestantes.length}</span>
              <span class="badge bg-info">👥 Ativos: ${ativos}/${total}</span>
            </div>
            <button id="btnSortear" class="btn btn-sortear w-100 mb-3" ${perguntasRestantes.length === 0 || jogoFinalizado ? "disabled" : ""}>🎲 Sortear Pergunta</button>
            ${jogoFinalizado ? `<div class="alert alert-success">🏆 Jogo finalizado! Vencedor: ${escapeHtml(vencedor)}</div>` : ""}
            <div id="perguntaAtual" class="alert alert-info" style="display:none">
              <div class="fw-bold">📢 Pergunta:</div>
              <div id="textoPergunta" class="mb-2 p-2 bg-white rounded"></div>
              <div class="fw-bold">🔑 Resposta:</div>
              <div id="textoResposta" class="p-2 bg-white rounded text-success fw-bold"></div>
            </div>
          </div>
        </div>
        <div class="card mb-3">
          <div class="card-header bg-secondary"><h4>📜 Histórico</h4></div>
          <div class="card-body p-2" id="historicoLista" style="max-height:350px;overflow-y:auto">
            ${historico.length === 0 ? '<p class="text-muted text-center">Nenhuma pergunta sorteada.</p>' : ""}
            ${historico
              .map(
                (item, idx) => `
              <div class="historico-item p-2 mb-2 bg-light rounded border-start border-primary">
                <strong>#${idx + 1}</strong> ${escapeHtml(item.pergunta)}<br>
                <small class="text-muted">✅ ${escapeHtml(item.resposta)}</small>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
        <button id="btnFinalizar" class="btn btn-danger w-100">🏁 Finalizar Jogo</button>
      </div>
      <div class="mestre-col-right">
        <div class="card">
          <div class="card-header bg-info"><h4>👥 Jogadores</h4></div>
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

function carregarListaJogadoresHTML() {
  if (!jogadoresAtivos.length)
    return '<p class="text-muted p-3">Nenhum jogador.</p>';
  const ordenados = [...jogadoresAtivos].sort((a, b) => {
    if (a.presente !== b.presente) return a.presente ? -1 : 1;
    return (b.pontuacao || 0) - (a.pontuacao || 0);
  });
  return `<ul class="list-group list-group-flush">${ordenados
    .map(
      (j) => `
    <li class="list-group-item ${!j.presente ? "opacity-50" : ""}">
      <div><span class="fw-bold ${!j.presente ? "text-decoration-line-through" : ""}">${escapeHtml(j.nome)}</span><br><small>🎯 Acertos: ${j.pontuacao || 0}</small></div>
      <div>${j.bingo ? '<span class="badge bg-success">🏆 BINGO!</span>' : ""}${!j.presente ? '<span class="badge bg-secondary">❌ Eliminado</span>' : ""}</div>
    </li>
  `,
    )
    .join("")}</ul>`;
}

function atualizarListaJogadoresMestre() {
  const container = document.getElementById("listaJogadoresMestre");
  if (container && !jogoFinalizado)
    container.innerHTML = carregarListaJogadoresHTML();
  const ativosSpan = document.querySelector(".badge.bg-info");
  if (ativosSpan) {
    const ativos = jogadoresAtivos.filter((j) => j.presente === true).length;
    const total = jogadoresAtivos.length;
    ativosSpan.textContent = `👥 Ativos: ${ativos}/${total}`;
  }
}

// ========== SORTEAR PERGUNTA ==========
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
  localStorage.setItem(
    `perguntas_${SALA_ID}`,
    JSON.stringify(perguntasRestantes),
  );
  localStorage.setItem(`historico_${SALA_ID}`, JSON.stringify(historico));

  // Atualiza o sorteio atual no Firebase para os jogadores
  await set(sorteioRef, {
    pergunta: sorteada.pergunta,
    resposta: sorteada.resposta,
    timestamp: Date.now(),
  });

  // Atualiza tempo do último sorteio
  ultimoSorteio = Date.now();
  await update(salaRef, { timestampUltimoSorteio: ultimoSorteio });

  // Exibe no painel do mestre
  const perguntaDiv = document.getElementById("perguntaAtual");
  if (perguntaDiv) perguntaDiv.style.display = "block";
  document.getElementById("textoPergunta").innerText = sorteada.pergunta;
  document.getElementById("textoResposta").innerText = sorteada.resposta;

  // Atualiza histórico na interface
  const historicoDiv = document.getElementById("historicoLista");
  if (historicoDiv) {
    historicoDiv.innerHTML = historico
      .map(
        (item, idx) => `
      <div class="historico-item p-2 mb-2 bg-light rounded border-start border-primary">
        <strong>#${idx + 1}</strong> ${escapeHtml(item.pergunta)}<br>
        <small class="text-muted">✅ ${escapeHtml(item.resposta)}</small>
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

// ========== FINALIZAÇÃO DO JOGO ==========
async function finalizarJogoPorVitoria(vencedor, fromFirebase = false) {
  if (jogoFinalizado) return;
  jogoFinalizado = true;
  if (!fromFirebase) {
    await update(salaRef, { status: "finalizado", vencedor });
  }
  localStorage.setItem(`vencedor_${SALA_ID}`, vencedor);
  alert(`🎉 ${vencedor} fez BINGO verdadeiro! O jogo foi finalizado.`);
  const btnSortear = document.getElementById("btnSortear");
  if (btnSortear) btnSortear.disabled = true;
  renderizarPainelMestre();
  // Não apaga dados automaticamente; deixa o mestre decidir reiniciar via lobby
}

async function finalizarJogo() {
  if (jogoFinalizado) {
    alert("O jogo já foi finalizado por um vencedor!");
    return;
  }
  if (
    confirm(
      "Deseja realmente finalizar o jogo? Todos os dados da partida atual serão perdidos.",
    )
  ) {
    // Atualiza status da sala para finalizado (sem apagar jogadores, apenas marca)
    await update(salaRef, { status: "finalizado", vencedor: "Mestre" });
    localStorage.removeItem(`perguntas_${SALA_ID}`);
    localStorage.removeItem(`historico_${SALA_ID}`);
    localStorage.removeItem(`vencedor_${SALA_ID}`);
    alert("Jogo finalizado. Volte ao lobby para reiniciar.");
    window.location.href = "lobby.html?role=mestre";
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(
    /[&<>]/g,
    (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m],
  );
}

// ========== MONITORAMENTO E ENCERRAMENTO AUTOMÁTICO ==========
async function verificarTimeouts() {
  if (jogoFinalizado) return;

  const agora = Date.now();
  const limiteTotal = 60 * 60 * 1000; // 60 minutos
  const limiteInatividade = 10 * 60 * 1000; // 10 minutos

  if (agora - inicioJogo > limiteTotal) {
    await executarEncerramentoForcado(
      "Tempo limite absoluto da sala (60 minutos) excedido.",
    );
  } else if (agora - ultimoSorteio > limiteInatividade) {
    await executarEncerramentoForcado(
      "Ociosidade detectada (10 minutos sem realizar sorteio).",
    );
  }
}

async function executarEncerramentoForcado(motivo) {
  if (jogoFinalizado) return;
  jogoFinalizado = true;

  alert(`⚠️ Encerramento automático: ${motivo}`);

  await update(salaRef, {
    status: "finalizado",
    vencedor: "Timeout/Ociosidade",
  });
  localStorage.removeItem(`perguntas_${SALA_ID}`);
  localStorage.removeItem(`historico_${SALA_ID}`);
  localStorage.removeItem(`vencedor_${SALA_ID}`);

  window.location.href = "lobby.html?role=mestre";
}
