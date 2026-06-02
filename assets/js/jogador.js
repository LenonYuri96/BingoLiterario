// jogador.js - Regras de bingo: precisa marcar as 15 células E todas as respostas já sorteadas
import { db, ref, onValue, update, SALA_ID } from './firebase-init.js';

let minhaCartela = [];
let nomeJogador = "";
let bingoJaAvisado = false;
let historicoRespostas = [];

// Obtém o nome do jogador salvo no lobby
nomeJogador = sessionStorage.getItem('meuNome');
if (!nomeJogador) {
  alert('Nome não encontrado. Volte ao lobby.');
  location.href = 'lobby.html?role=jogador';
}

console.log("🚀 Jogador iniciado. Sala:", SALA_ID, "Nome:", nomeJogador);

// Referências do Firebase
const salaRef = ref(db, `salas/${SALA_ID}`);
const jogadorRef = ref(db, `salas/${SALA_ID}/jogadores/${nomeJogador}`);
const sorteioRef = ref(db, `salas/${SALA_ID}/sorteio/atual`);

// ========== LIMPA SELEÇÕES E HISTÓRICO AO INICIAR JOGO ==========
function limparSelecoes() {
  localStorage.removeItem(`selecoes_${SALA_ID}_${nomeJogador}`);
  console.log("🧹 Seleções antigas removidas.");
}

function limparHistoricoRespostas() {
  historicoRespostas = [];
  localStorage.removeItem(`historico_${SALA_ID}_${nomeJogador}`);
  console.log("🧹 Histórico de respostas removido.");
}

// ========== ESCUTA O STATUS DA SALA ==========
onValue(salaRef, async (snap) => {
  console.log("📡 Snapshot da sala:", snap.val());
  if (!snap.exists()) {
    alert("Sala não encontrada. Volte ao lobby.");
    location.href = 'lobby.html?role=jogador';
    return;
  }

  const data = snap.val();
  console.log("Status da sala:", data.status);

  if (data.status === 'finalizado') {
    if (data.vencedor === nomeJogador) {
      mostrarTelaVencedor(data.vencedor);
    } else {
      mostrarTelaJogoEncerrado(data.vencedor);
    }
    return;
  }

  if (data.status === 'jogando') {
    // Se o jogo está em andamento e a cartela ainda não foi carregada
    if (!minhaCartela.length) {
      // RESETA SELEÇÕES E HISTÓRICO AO INICIAR NOVA PARTIDA
      limparSelecoes();
      limparHistoricoRespostas();
      await carregarOuGerarCartela();
      renderizarJogador();
    }
  } else if (data.status === 'aguardando') {
    document.getElementById('jogadorPanel').innerHTML = `
      <div class="card">
        <div class="card-body text-center">
          <h4>Aguardando o mestre iniciar o jogo...</h4>
          <div class="spinner-border text-primary"></div>
        </div>
      </div>`;
  }
});

// ========== ESCUTA SORTEIOS (acumula respostas já sorteadas) ==========
onValue(sorteioRef, (snap) => {
  if (snap.exists()) {
    const resposta = snap.val().resposta;
    if (!historicoRespostas.includes(resposta)) {
      historicoRespostas.push(resposta);
      localStorage.setItem(`historico_${SALA_ID}_${nomeJogador}`, JSON.stringify(historicoRespostas));
      console.log("➕ Resposta adicionada ao histórico:", resposta);
    }
  }
});

// ========== ESCUTA MUDANÇAS NO PRÓPRIO JOGADOR (eliminação/vitória) ==========
onValue(jogadorRef, (snap) => {
  if (snap.exists()) {
    const data = snap.val();
    if (data.presente === false && !bingoJaAvisado) {
      mostrarTelaEliminado();
    }
    if (data.bingoCorreto === true && !bingoJaAvisado) {
      mostrarTelaVencedor(nomeJogador);
    }
  }
});

// ========== CARREGA OU GERA A CARTELA ==========
async function carregarOuGerarCartela() {
  const salva = localStorage.getItem(`cartela_${SALA_ID}_${nomeJogador}`);
  if (salva) {
    minhaCartela = JSON.parse(salva);
    console.log("📦 Cartela carregada do localStorage");
    return;
  }
  console.log("🃏 Gerando nova cartela...");
  minhaCartela = await gerarCartela();
  localStorage.setItem(`cartela_${SALA_ID}_${nomeJogador}`, JSON.stringify(minhaCartela));
  console.log("✅ Cartela gerada e salva");
}

async function gerarCartela() {
  if (typeof window.carregarDadosDoBingo !== 'function') {
    throw new Error("Função carregarDadosDoBingo não disponível. Verifique sheets.js.");
  }
  const dados = await window.carregarDadosDoBingo();
  if (!dados || dados.length === 0) throw new Error("Planilha sem dados");
  const todosAutores = dados.map(item => item.resposta);
  const autoresUnicos = [...new Set(todosAutores)];
  // Embaralha e pega 15 autores
  for (let i = autoresUnicos.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [autoresUnicos[i], autoresUnicos[j]] = [autoresUnicos[j], autoresUnicos[i]];
  }
  const selecionados = autoresUnicos.slice(0, 15);
  const cartela = [];
  for (let i = 0; i < 5; i++) {
    cartela.push(selecionados.slice(i * 3, i * 3 + 3));
  }
  return cartela;
}

// ========== RENDERIZA A CARTELA E OS EVENTOS ==========
function renderizarJogador() {
  console.log("🎨 Renderizando jogador");
  const panel = document.getElementById('jogadorPanel');
  if (!panel) return;
  panel.innerHTML = `
    <div class="card">
      <div class="card-header"><h4>Jogador: ${escapeHtml(nomeJogador)}</h4></div>
      <div class="card-body">
        <div id="cartelaContainer">
          ${minhaCartela.map((linha, idxLinha) => `
            <div class="row mb-2">
              ${linha.map((item, idxCol) => `
                <div class="col-4">
                  <div class="cartela-item text-center p-2"
                       data-linha="${idxLinha}"
                       data-coluna="${idxCol}"
                       data-resposta="${escapeHtml(item)}">
                    ${escapeHtml(item)}
                  </div>
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
        <hr />
        <button id="btnVerificarBingo" class="btn btn-warning">🏆 Verificar Bingo</button>
      </div>
    </div>
  `;

  // Restaura seleções salvas (se houver)
  const selecoesSalvas = JSON.parse(localStorage.getItem(`selecoes_${SALA_ID}_${nomeJogador}`) || '[]');
  selecoesSalvas.forEach(({ linha, coluna }) => {
    const cell = document.querySelector(`.cartela-item[data-linha="${linha}"][data-coluna="${coluna}"]`);
    if (cell) cell.classList.add('selecionado');
  });

  // Evento de clique nas células
  document.querySelectorAll('.cartela-item').forEach(cell => {
    cell.addEventListener('click', () => {
      if (bingoJaAvisado) return;
      const linha = parseInt(cell.dataset.linha);
      const coluna = parseInt(cell.dataset.coluna);
      let selecoes = JSON.parse(localStorage.getItem(`selecoes_${SALA_ID}_${nomeJogador}`) || '[]');
      const index = selecoes.findIndex(s => s.linha === linha && s.coluna === coluna);
      if (index === -1) {
        selecoes.push({ linha, coluna });
        cell.classList.add('selecionado');
      } else {
        selecoes.splice(index, 1);
        cell.classList.remove('selecionado');
      }
      localStorage.setItem(`selecoes_${SALA_ID}_${nomeJogador}`, JSON.stringify(selecoes));
    });
  });

  // Botão verificar bingo
  document.getElementById('btnVerificarBingo').addEventListener('click', () => {
    if (bingoJaAvisado) return;

    const selecoes = JSON.parse(localStorage.getItem(`selecoes_${SALA_ID}_${nomeJogador}`) || '[]');
    console.log("🔍 Seleções atuais:", selecoes.length, "de 15");

    // REGRA 1: Deve ter marcado EXATAMENTE as 15 células
    if (selecoes.length !== 15) {
      console.log("❌ Seleções incompletas. Bingo falso!");
      declararBingo(false);
      return;
    }

    // REGRA 2: Todas as células marcadas devem corresponder a respostas já sorteadas
    let todasCorretas = true;
    for (const { linha, coluna } of selecoes) {
      const respostaCelula = minhaCartela[linha][coluna];
      if (!historicoRespostas.includes(respostaCelula)) {
        console.log(`❌ Célula (${linha},${coluna}) = "${respostaCelula}" NÃO foi sorteada ainda.`);
        todasCorretas = false;
        break;
      }
    }

    if (todasCorretas) {
      console.log("🎉 TODAS as células foram sorteadas! BINGO VERDADEIRO!");
      declararBingo(true);
    } else {
      console.log("❌ Alguma célula não foi sorteada. Bingo falso!");
      declararBingo(false);
    }
  });
}

// ========== LÓGICA DE DECLARAÇÃO DE BINGO ==========
async function declararBingo(verdadeiro) {
  if (bingoJaAvisado) return;
  bingoJaAvisado = true;

  if (verdadeiro) {
    // BINGO VERDADEIRO – finaliza o jogo
    await update(salaRef, { status: 'finalizado', vencedor: nomeJogador });
    await update(jogadorRef, { bingoCorreto: true, bingo: true });
    localStorage.setItem(`jogoFinalizado_${SALA_ID}`, 'true');
    mostrarTelaVencedor(nomeJogador);
  } else {
    // BINGO FALSO – jogador é eliminado
    await update(jogadorRef, { presente: false, bingoCorreto: false });
    mostrarTelaEliminado();
  }
}

// ========== TELAS DE FEEDBACK ==========
function mostrarTelaEliminado() {
  document.body.innerHTML = `
    <div class="eliminado-container">
      <div class="eliminado-card">
        <h3>❌ ELIMINADO</h3>
        <p>Você foi eliminado do jogo por declarar BINGO sem ter a cartela completa ou sem que todas as respostas tenham sido sorteadas.</p>
        <a href="index.html" class="btn">Voltar ao início</a>
      </div>
    </div>`;
}

function mostrarTelaJogoEncerrado(vencedor) {
  document.body.innerHTML = `
    <div class="eliminado-container">
      <div class="eliminado-card">
        <h3>🏆 JOGO ENCERRADO</h3>
        <p>O jogo terminou. O vencedor foi: <strong>${escapeHtml(vencedor)}</strong></p>
        <a href="index.html" class="btn">Voltar ao início</a>
      </div>
    </div>`;
}

function mostrarTelaVencedor(vencedor) {
  document.body.innerHTML = `
    <div class="eliminado-container">
      <div class="eliminado-card" style="border:4px solid gold; background:linear-gradient(135deg,#fff9e6,#fff0c0);">
        <h3 style="color:goldenrod; font-size:2rem;">🏆 VOCÊ VENCEU! 🏆</h3>
        <p>Parabéns, ${escapeHtml(vencedor)}! Você completou a cartela inteira com todas as respostas sorteadas!</p>
        <a href="index.html" class="btn">Voltar ao início</a>
      </div>
    </div>`;
  setTimeout(() => (window.location.href = 'index.html'), 5000);
}

// Carrega histórico salvo localmente (se houver – será limpo ao iniciar o jogo)
const historicoSalvo = localStorage.getItem(`historico_${SALA_ID}_${nomeJogador}`);
if (historicoSalvo) historicoRespostas = JSON.parse(historicoSalvo);

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m]));
}