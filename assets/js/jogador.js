// jogador.js
let minhaCartela = [];
let nomeJogador = "";
let bingoJaAvisado = false;
let historicoRespostas = [];
let heartbeatInterval = null;
let pollingHistoricoInterval = null;

window.onload = async () => {
  // Limpeza forçada de seleções antigas ao iniciar a página (mantido do original)
  const nomeTemp = sessionStorage.getItem("meuNome");
  if (nomeTemp) {
    localStorage.removeItem(`selecoes_${nomeTemp}`);
  }

  // Obtém estado e jogadores da planilha (via API)
  const { estado, jogadores } = await obterEstadoCompleto();

  // 🔒 Verificação de segurança: garante que 'estado' seja um objeto válido
  if (!estado || typeof estado !== "object") {
    console.error("Estado inválido recebido da API:", estado);
    alert(
      "Erro ao carregar dados do servidor. Recarregue a página e tente novamente.",
    );
    return;
  }

  if (estado.jogoFinalizado === "true") {
    const vencedor = estado.vencedor || "alguém";
    if (sessionStorage.getItem("meuNome") === vencedor) {
      mostrarTelaVencedor(vencedor);
    } else {
      mostrarTelaJogoEncerrado(vencedor);
    }
    return;
  }

  if (estado.jogoIniciado !== "true") {
    alert("O jogo ainda não começou. Aguarde o mestre iniciar.");
    window.location.href = "lobby.html?role=jogador";
    return;
  }

  nomeJogador = sessionStorage.getItem("meuNome");
  if (!nomeJogador) {
    nomeJogador = prompt("Digite seu nome:");
    if (!nomeJogador) window.location.href = "index.html";
    sessionStorage.setItem("meuNome", nomeJogador);
  }

  const jogadorExistente = jogadores.find((j) => j.nome === nomeJogador);
  if (!jogadorExistente || jogadorExistente.presente === false) {
    mostrarTelaEliminado();
    return;
  }
  if (jogadorExistente.bingoCorreto === true) {
    mostrarTelaVencedor(nomeJogador);
    return;
  }

  // Carrega cartela (se não tiver, gera e salva na planilha)
  if (
    jogadorExistente.cartela &&
    JSON.parse(jogadorExistente.cartela).length === 5
  ) {
    minhaCartela = JSON.parse(jogadorExistente.cartela);
  } else {
    minhaCartela = await gerarCartela();
    await atualizarJogadorRemoto({
      nome: nomeJogador,
      cartela: JSON.stringify(minhaCartela),
    });
  }

  // Recupera seleções do próprio navegador (não compartilhadas)
  const selecoesSalvas = localStorage.getItem(`selecoes_${nomeJogador}`);
  if (selecoesSalvas) {
    // mantém as marcações locais
  }

  renderizarJogador();

  // Carrega histórico de respostas sorteadas a partir do estado remoto
  historicoRespostas = JSON.parse(estado.historico || "[]").map(
    (item) => item.resposta,
  );

  // Heartbeat (envia lastSeen a cada 5s para manter o jogador como "online" na planilha)
  heartbeatInterval = setInterval(() => {
    atualizarJogadorRemoto({
      nome: nomeJogador,
      lastSeen: Date.now(),
      presente: true,
    });
  }, 5000);

  // Polling para atualizar histórico e estado do jogo (a cada 2 segundos)
  pollingHistoricoInterval = setInterval(async () => {
    const { estado: novoEstado } = await obterEstadoCompleto();
    if (novoEstado && novoEstado.historico) {
      const novoHist = JSON.parse(novoEstado.historico).map((i) => i.resposta);
      if (JSON.stringify(novoHist) !== JSON.stringify(historicoRespostas)) {
        historicoRespostas = novoHist;
      }
    }
    if (novoEstado && novoEstado.jogoFinalizado === "true") {
      if (novoEstado.vencedor === nomeJogador) {
        mostrarTelaVencedor(nomeJogador);
      } else {
        mostrarTelaJogoEncerrado(novoEstado.vencedor);
      }
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (pollingHistoricoInterval) clearInterval(pollingHistoricoInterval);
    }
  }, 2000);
};

async function gerarCartela() {
  const dados = await carregarDadosDoBingo();
  const autores = [...new Set(dados.map((item) => item.resposta))];
  for (let i = autores.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [autores[i], autores[j]] = [autores[j], autores[i]];
  }
  const selecionados = autores.slice(0, 15);
  const cartela = [];
  for (let i = 0; i < 5; i++) {
    cartela.push(selecionados.slice(i * 3, i * 3 + 3));
  }
  return cartela;
}

function renderizarJogador() {
  const panel = document.getElementById("jogadorPanel");
  panel.innerHTML = `
    <div class="card">
      <div class="card-header"><h4>Jogador: ${nomeJogador}</h4></div>
      <div class="card-body">
        <div id="cartelaContainer" class="container">
          ${minhaCartela
            .map(
              (linha, idxLinha) => `
            <div class="row mb-2">
              ${linha
                .map(
                  (item, idxCol) => `
                <div class="col-4">
                  <div class="cartela-item text-center p-2" data-linha="${idxLinha}" data-coluna="${idxCol}" data-resposta="${item}">${item}</div>
                </div>
              `,
                )
                .join("")}
            </div>
          `,
            )
            .join("")}
        </div>
        <hr />
        <div class="d-flex justify-content-between mt-3">
          <button id="btnVerificarBingo" class="btn btn-warning">🏆 Verificar Bingo</button>
        </div>
      </div>
    </div>
  `;

  // Restaura as marcações salvas no localStorage do navegador
  const selecoes = JSON.parse(
    localStorage.getItem(`selecoes_${nomeJogador}`) || "[]",
  );
  selecoes.forEach((pos) => {
    const cell = document.querySelector(
      `.cartela-item[data-linha="${pos.linha}"][data-coluna="${pos.coluna}"]`,
    );
    if (cell) cell.classList.add("selecionado");
  });

  // Adiciona evento de clique nas células da cartela
  document.querySelectorAll(".cartela-item").forEach((cell) => {
    cell.addEventListener("click", () => {
      if (bingoJaAvisado) return;
      const linha = parseInt(cell.dataset.linha);
      const coluna = parseInt(cell.dataset.coluna);
      let selecoes = JSON.parse(
        localStorage.getItem(`selecoes_${nomeJogador}`) || "[]",
      );
      const index = selecoes.findIndex(
        (s) => s.linha === linha && s.coluna === coluna,
      );
      if (index === -1) {
        selecoes.push({ linha, coluna });
        cell.classList.add("selecionado");
      } else {
        selecoes.splice(index, 1);
        cell.classList.remove("selecionado");
      }
      localStorage.setItem(`selecoes_${nomeJogador}`, JSON.stringify(selecoes));
    });
  });

  // Botão de verificar BINGO
  document
    .getElementById("btnVerificarBingo")
    .addEventListener("click", async () => {
      if (bingoJaAvisado) return;
      const selecoes = JSON.parse(
        localStorage.getItem(`selecoes_${nomeJogador}`) || "[]",
      );

      // Verifica se selecionou exatamente 15 células (cartela completa)
      if (selecoes.length !== 15) {
        declararBingo(false);
        return;
      }

      // Verifica se todas as células selecionadas estão no histórico de respostas sorteadas
      let todasCorretas = true;
      for (const { linha, coluna } of selecoes) {
        const respostaCelula = minhaCartela[linha][coluna];
        if (!historicoRespostas.includes(respostaCelula)) {
          todasCorretas = false;
          break;
        }
      }
      declararBingo(todasCorretas);
    });
}

async function declararBingo(verdadeiro) {
  if (bingoJaAvisado) return;
  bingoJaAvisado = true;

  if (verdadeiro) {
    // BINGO verdadeiro: finaliza o jogo na planilha e declara vencedor
    await atualizarEstadoRemoto({
      jogoFinalizado: "true",
      vencedor: nomeJogador,
    });
    mostrarTelaVencedor(nomeJogador);
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (pollingHistoricoInterval) clearInterval(pollingHistoricoInterval);
  } else {
    // BINGO falso: elimina o jogador na planilha
    await atualizarJogadorRemoto({
      nome: nomeJogador,
      presente: false,
      bingoCorreto: false,
    });
    mostrarTelaEliminado();
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (pollingHistoricoInterval) clearInterval(pollingHistoricoInterval);
  }
}

function mostrarTelaEliminado() {
  document.body.innerHTML = `
    <div class="eliminado-container">
      <div class="eliminado-card">
        <h3>❌ ELIMINADO</h3>
        <p>Você foi eliminado do jogo por declarar BINGO sem ter a cartela completa.</p>
        <a href="index.html" class="btn">Voltar ao início</a>
      </div>
    </div>
  `;
}

function mostrarTelaJogoEncerrado(vencedor) {
  document.body.innerHTML = `
    <div class="eliminado-container">
      <div class="eliminado-card">
        <h3>🏆 JOGO ENCERRADO</h3>
        <p>O jogo terminou. O vencedor foi: <strong>${vencedor}</strong></p>
        <a href="index.html" class="btn">Voltar ao início</a>
      </div>
    </div>
  `;
}

function mostrarTelaVencedor(vencedor) {
  document.body.innerHTML = `
    <div class="eliminado-container">
      <div class="eliminado-card" style="border: 4px solid gold; background: linear-gradient(135deg, #fff9e6, #fff0c0);">
        <h3 style="color: goldenrod; font-size: 2rem;">🏆 VOCÊ É O VENCEDOR! 🏆</h3>
        <p>Parabéns, ${vencedor}! Você venceu o Bingo Literário.</p>
        <a href="index.html" class="btn">Voltar ao início</a>
      </div>
    </div>
  `;
}
