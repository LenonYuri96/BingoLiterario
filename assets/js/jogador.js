// jogador.js
let minhaCartela = [];
let nomeJogador = "";
let bingoJaAvisado = false;
let historicoRespostas = [];

window.onload = async () => {
  // Limpeza forçada de seleções antigas ao iniciar a página
  const nomeTemp = sessionStorage.getItem("meuNome");
  if (nomeTemp) {
    localStorage.removeItem(`selecoes_${nomeTemp}`);
  }

  if (localStorage.getItem("jogoFinalizado") === "true") {
    const vencedor = localStorage.getItem("vencedor") || "alguém";
    if (sessionStorage.getItem("meuNome") === vencedor) {
      mostrarTelaVencedor(vencedor);
    } else {
      mostrarTelaJogoEncerrado(vencedor);
    }
    return;
  }

  if (localStorage.getItem("jogoIniciado") !== "true") {
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

  let jogadoresAtuais = JSON.parse(localStorage.getItem("jogadores") || "[]");
  if (!jogadoresAtuais.some((j) => j.nome === nomeJogador)) {
    jogadoresAtuais.push({
      nome: nomeJogador,
      cartela: null,
      pontuacao: 0,
      bingo: false,
      presente: true,
      bingoCorreto: false,
      horario: new Date().toISOString(),
    });
    localStorage.setItem("jogadores", JSON.stringify(jogadoresAtuais));
  } else {
    const idx = jogadoresAtuais.findIndex((j) => j.nome === nomeJogador);
    if (idx !== -1 && jogadoresAtuais[idx].presente === false) {
      mostrarTelaEliminado();
      return;
    }
    if (jogadoresAtuais[idx].bingoCorreto === true) {
      mostrarTelaVencedor(nomeJogador);
      return;
    }
  }

  const cartelasSalvas = JSON.parse(localStorage.getItem("cartelas") || "{}");
  if (
    cartelasSalvas[nomeJogador] &&
    cartelasSalvas[nomeJogador].length === 5 &&
    cartelasSalvas[nomeJogador][0].length === 3
  ) {
    minhaCartela = cartelasSalvas[nomeJogador];
  } else {
    minhaCartela = await gerarCartela();
    cartelasSalvas[nomeJogador] = minhaCartela;
    localStorage.setItem("cartelas", JSON.stringify(cartelasSalvas));
    let jogadores = JSON.parse(localStorage.getItem("jogadores") || "[]");
    const idx = jogadores.findIndex((j) => j.nome === nomeJogador);
    if (idx !== -1) {
      jogadores[idx].cartela = minhaCartela;
      localStorage.setItem("jogadores", JSON.stringify(jogadores));
    }
  }
  renderizarJogador();

  const historicoSalvo = localStorage.getItem("historico");
  if (historicoSalvo) {
    historicoRespostas = JSON.parse(historicoSalvo).map(
      (item) => item.resposta,
    );
  }

  window.addEventListener("storage", (e) => {
    if (e.key === "historico") {
      const novoHistorico = JSON.parse(e.newValue);
      if (novoHistorico) {
        historicoRespostas = novoHistorico.map((item) => item.resposta);
      }
    }
    if (e.key === "jogoFinalizado") {
      const vencedor = localStorage.getItem("vencedor") || "alguém";
      if (nomeJogador === vencedor) {
        mostrarTelaVencedor(vencedor);
      } else {
        mostrarTelaJogoEncerrado(vencedor);
      }
    }
  });
};

async function gerarCartela() {
  const dados = await carregarDadosDoBingo();
  const todosAutores = dados.map((item) => item.resposta);
  const autoresUnicos = [...new Set(todosAutores)];
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

  const selecoes = JSON.parse(
    localStorage.getItem(`selecoes_${nomeJogador}`) || "[]",
  );
  selecoes.forEach((pos) => {
    const cell = document.querySelector(
      `.cartela-item[data-linha="${pos.linha}"][data-coluna="${pos.coluna}"]`,
    );
    if (cell) cell.classList.add("selecionado");
  });

  document.querySelectorAll(".cartela-item").forEach((cell) => {
    cell.addEventListener("click", () => {
      if (bingoJaAvisado || localStorage.getItem("jogoFinalizado") === "true")
        return;
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

  document.getElementById("btnVerificarBingo").addEventListener("click", () => {
    if (bingoJaAvisado || localStorage.getItem("jogoFinalizado") === "true")
      return;

    const selecoes = JSON.parse(
      localStorage.getItem(`selecoes_${nomeJogador}`) || "[]",
    );

    // Verifica se o jogador selecionou EXATAMENTE todas as 15 células
    if (selecoes.length !== 15) {
      // Não completou a cartela inteira → bingo falso
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

    // Se todas as 15 células foram marcadas e estão no histórico → bingo verdadeiro
    declararBingo(todasCorretas);
  });
}

function declararBingo(verdadeiro) {
  if (bingoJaAvisado || localStorage.getItem("jogoFinalizado") === "true")
    return;
  bingoJaAvisado = true;

  if (verdadeiro) {
    localStorage.setItem(
      "bingoAviso",
      JSON.stringify({ jogador: nomeJogador, timestamp: Date.now() }),
    );
    localStorage.setItem("jogoFinalizado", "true");
    localStorage.setItem("vencedor", nomeJogador);

    let jogadores = JSON.parse(localStorage.getItem("jogadores") || "[]");
    const idx = jogadores.findIndex((j) => j.nome === nomeJogador);
    if (idx !== -1) {
      jogadores[idx].bingo = true;
      jogadores[idx].bingoCorreto = true;
      jogadores[idx].pontuacao += 1;
      localStorage.setItem("jogadores", JSON.stringify(jogadores));
    }

    // Tela de vencedor comemorativa
    document.body.innerHTML = `
      <div class="eliminado-container">
        <div class="eliminado-card" style="border: 4px solid gold; background: linear-gradient(135deg, #fff9e6, #fff0c0);">
          <h3 style="color: goldenrod; font-size: 2.5rem;">🏆 VOCÊ VENCEU! 🏆</h3>
          <p style="font-size: 1.2rem;">Parabéns, ${nomeJogador}! Você completou a cartela inteira!</p>
          <a href="index.html" class="btn" style="background-color: #5d3a1a;">Voltar ao início</a>
        </div>
      </div>
    `;
    setTimeout(() => (window.location.href = "index.html"), 6000);
  } else {
    localStorage.setItem(
      "bingoFalso",
      JSON.stringify({ jogador: nomeJogador, timestamp: Date.now() }),
    );
    let jogadores = JSON.parse(localStorage.getItem("jogadores") || "[]");
    const idx = jogadores.findIndex((j) => j.nome === nomeJogador);
    if (idx !== -1) {
      jogadores[idx].presente = false;
      jogadores[idx].bingoCorreto = false;
      localStorage.setItem("jogadores", JSON.stringify(jogadores));
    }
    mostrarTelaEliminado();
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
