// lobby.js - Sistema de sala única com regras do código original (bloqueio quando finalizado)
import {
  db,
  ref,
  set,
  get,
  onValue,
  update,
  remove,
  SALA_ID,
} from "./firebase-init.js";

function getParameterByName(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

const role = getParameterByName("role");

// ========== GARANTIR QUE A SALA EXISTA (SEM RESET AUTOMÁTICO) ==========
async function garantirSala() {
  const salaRef = ref(db, `salas/${SALA_ID}`);
  const snap = await get(salaRef);
  if (!snap.exists()) {
    // Cria a sala com status 'aguardando'
    await set(salaRef, { status: "aguardando", criadoEm: Date.now() });
    console.log("✅ Sala criada no Firebase.");
  }
  // Se a sala já existe, NÃO reseta automaticamente (mantém o status atual)
}

// ========== MESTRE: REINICIAR O JOGO (LIMPA DADOS E VOLTA PARA AGUARDANDO) ==========
async function reiniciarJogo() {
  if (
    !confirm(
      "⚠️ Reiniciar o jogo apagará todos os dados atuais (jogadores, sorteio, histórico). Deseja continuar?",
    )
  )
    return;
  try {
    const salaRef = ref(db, `salas/${SALA_ID}`);
    // Reseta o status para 'aguardando'
    await update(salaRef, { status: "aguardando", criadoEm: Date.now() });
    // Remove todos os jogadores
    const jogadoresRef = ref(db, `salas/${SALA_ID}/jogadores`);
    await set(jogadoresRef, null);
    // Remove sorteio atual
    const sorteioRef = ref(db, `salas/${SALA_ID}/sorteio`);
    await set(sorteioRef, null);
    // Limpa dados locais do mestre
    localStorage.removeItem(`perguntas_${SALA_ID}`);
    localStorage.removeItem(`historico_${SALA_ID}`);
    localStorage.removeItem(`vencedor_${SALA_ID}`);
    localStorage.removeItem(`jogoIniciado_${SALA_ID}`);
    alert("✅ Jogo reiniciado! A sala está novamente em espera.");
    // Recarrega a página para atualizar a interface
    window.location.reload();
  } catch (error) {
    console.error("Erro ao reiniciar:", error);
    alert("Erro ao reiniciar o jogo.");
  }
}

// ========== MESTRE: INICIAR JOGO ==========
async function iniciarJogo() {
  const salaRef = ref(db, `salas/${SALA_ID}`);
  const salaSnap = await get(salaRef);
  if (!salaSnap.exists() || salaSnap.val().status !== "aguardando") {
    alert("O jogo não está em estado de espera. Não é possível iniciar.");
    return;
  }

  // Verifica se há jogadores na sala
  const jogadoresRef = ref(db, `salas/${SALA_ID}/jogadores`);
  const jogadoresSnap = await get(jogadoresRef);
  const jogadores = jogadoresSnap.exists()
    ? Object.values(jogadoresSnap.val())
    : [];
  if (jogadores.length === 0) {
    alert("Nenhum jogador na sala!");
    return;
  }

  const todasPerguntas = await window.carregarDadosDoBingo();
  if (!todasPerguntas || todasPerguntas.length === 0) {
    alert("Erro ao carregar perguntas. Verifique a planilha.");
    return;
  }

  // Embaralha as perguntas
  const perguntasEmbaralhadas = [...todasPerguntas];
  for (let i = perguntasEmbaralhadas.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [perguntasEmbaralhadas[i], perguntasEmbaralhadas[j]] = [
      perguntasEmbaralhadas[j],
      perguntasEmbaralhadas[i],
    ];
  }

  // Salva estado local do mestre (para usar em mestre.js)
  localStorage.setItem(
    `perguntas_${SALA_ID}`,
    JSON.stringify(perguntasEmbaralhadas),
  );
  localStorage.setItem(`historico_${SALA_ID}`, JSON.stringify([]));
  localStorage.setItem(`jogoIniciado_${SALA_ID}`, "true");
  localStorage.removeItem(`jogoFinalizado_${SALA_ID}`);
  localStorage.removeItem(`vencedor_${SALA_ID}`);

  // Atualiza status da sala no Firebase
  // Atualiza status da sala no Firebase
  await update(salaRef, {
    status: "jogando",
    timestampInicio: Date.now(),
    timestampUltimoSorteio: Date.now(),
  });
  window.location.href = "mestre.html";
}

// ========== JOGADOR: ENTRAR NA SALA (APENAS SE ESTIVER AGUARDANDO) ==========
async function entrarComoJogador(nomeJogador) {
  try {
    // Garante que a sala exista (mas não reseta se finalizada)
    await garantirSala();

    const salaRef = ref(db, `salas/${SALA_ID}`);
    const salaSnap = await get(salaRef);
    const salaData = salaSnap.val();

    // Verifica se o jogo está em estado de espera (regra do código original)
    if (salaData.status !== "aguardando") {
      alert(
        "O jogo já começou ou foi finalizado. Não é possível entrar agora.",
      );
      return false;
    }

    const jogadorRef = ref(db, `salas/${SALA_ID}/jogadores/${nomeJogador}`);
    const jogadorSnap = await get(jogadorRef);
    if (jogadorSnap.exists()) {
      alert("Nome já usado nesta sala. Escolha outro.");
      return false;
    }

    // Adiciona o jogador
    await set(jogadorRef, {
      nome: nomeJogador,
      online: true,
      presente: true,
      bingoCorreto: false,
      ultimaAtividade: Date.now(),
    });

    sessionStorage.setItem("meuNome", nomeJogador);
    return true;
  } catch (error) {
    console.error("Erro ao entrar:", error);
    alert("Erro ao entrar na sala.");
    return false;
  }
}

// ========== LISTA DE JOGADORES (TEMPO REAL) – APENAS PARA O MESTRE ==========
let jogadoresAtuais = [];
let unsubscribeJogadores = null;

function atualizarListaJogadoresMestre() {
  const listaUl = document.getElementById("listaJogadores");
  if (!listaUl) return;
  if (unsubscribeJogadores) unsubscribeJogadores();

  const jogadoresRef = ref(db, `salas/${SALA_ID}/jogadores`);
  unsubscribeJogadores = onValue(jogadoresRef, (snapshot) => {
    const data = snapshot.val() || {};
    jogadoresAtuais = Object.values(data);
    listaUl.innerHTML = "";
    jogadoresAtuais.forEach((jog) => {
      const li = document.createElement("li");
      li.className =
        "list-group-item d-flex justify-content-between align-items-center";
      li.innerHTML = `<span>${escapeHtml(jog.nome)}</span>`;
      listaUl.appendChild(li);
    });
    const btnIniciar = document.getElementById("btnIniciar");
    if (btnIniciar) btnIniciar.disabled = jogadoresAtuais.length === 0;
  });
}

// ========== RENDERIZAÇÃO DO LOBBY CONFORME O PAPEL ==========
async function carregarLobby() {
  await garantirSala(); // só garante existência, sem reset

  const content = document.getElementById("lobbyContent");
  if (role === "mestre") {
    // Verifica o status atual da sala para mostrar botão de reiniciar se necessário
    const salaRef = ref(db, `salas/${SALA_ID}`);
    const salaSnap = await get(salaRef);
    const status = salaSnap.exists() ? salaSnap.val().status : "aguardando";

    content.innerHTML = `
      <div class="card">
        <div class="card-header bg-primary text-white"><h4 class="mb-0">👑 Painel do Mestre</h4></div>
        <div class="card-body">
          <h5 class="card-title">Jogadores na sala:</h5>
          <ul id="listaJogadores" class="list-group mb-3"></ul>
          <button id="btnIniciar" class="btn btn-success w-100 mb-2" disabled>🎬 Iniciar Jogo</button>
          ${status === "finalizado" ? '<button id="btnReiniciar" class="btn btn-warning w-100">🔄 Reiniciar Jogo (apagar dados)</button>' : ""}
        </div>
      </div>
    `;
    atualizarListaJogadoresMestre();
    document
      .getElementById("btnIniciar")
      .addEventListener("click", iniciarJogo);
    if (status === "finalizado") {
      document
        .getElementById("btnReiniciar")
        .addEventListener("click", reiniciarJogo);
    }
  } else if (role === "jogador") {
    content.innerHTML = `
      <div class="card">
        <div class="card-header bg-success text-white"><h4 class="mb-0">🎮 Entrar no Jogo</h4></div>
        <div class="card-body">
          <input type="text" id="nomeJogador" class="form-control mb-2" placeholder="Digite seu nome">
          <button id="btnEntrar" class="btn btn-primary w-100">Entrar no Jogo</button>
          <div id="mensagem" class="mt-3 text-center"></div>
        </div>
      </div>
    `;

    const btnEntrar = document.getElementById("btnEntrar");
    const nomeInput = document.getElementById("nomeJogador");
    const msgDiv = document.getElementById("mensagem");

    // Escuta o status da sala em tempo real para bloquear entrada se necessário
    const salaRef = ref(db, `salas/${SALA_ID}`);
    onValue(salaRef, (snap) => {
      if (snap.exists()) {
        const status = snap.val().status;
        if (status !== "aguardando") {
          btnEntrar.disabled = true;
          msgDiv.innerHTML = `<div class="alert alert-warning">⚠️ O jogo já começou ou foi finalizado. Não é possível entrar agora.</div>`;
        } else {
          btnEntrar.disabled = false;
          msgDiv.innerHTML = "";
        }
      }
    });

    btnEntrar.addEventListener("click", async () => {
      const nome = nomeInput.value.trim();
      if (!nome) {
        msgDiv.innerHTML =
          '<div class="alert alert-danger">Digite seu nome</div>';
        return;
      }
      const ok = await entrarComoJogador(nome);
      if (ok) {
        window.location.href = "jogador.html";
      } else {
        msgDiv.innerHTML =
          '<div class="alert alert-danger">Falha ao entrar. Verifique se o jogo está em espera.</div>';
      }
    });
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(
    /[&<>]/g,
    (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m],
  );
}

window.onload = carregarLobby;
