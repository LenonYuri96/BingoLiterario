# Bingo Literário

Jogo de bingo baseado em perguntas de obras e autores literários. Os dados são carregados de uma planilha pública do Google Sheets.

## Como jogar

1. Abra `index.html`.
2. O **Mestre** clica em "Sou Mestre" e aguarda os jogadores no lobby.
3. Os **Jogadores** entram com seus nomes no lobby.
4. O Mestre inicia o jogo. Cada jogador recebe uma cartela 5x3 com autores aleatórios.
5. O Mestre sorteia uma obra (pergunta) e lê em voz alta. Ele vê a resposta.
6. Os jogadores marcam em suas cartelas se o autor corresponder a alguma célula.
7. Quando alguém completa uma linha ou coluna, faz BINGO! O mestre é notificado.
8. O mestre pode finalizar o jogo a qualquer momento.

## Configuração da Planilha

A planilha usada deve ter duas colunas: `Obra` e `Autor`. O link CSV está em `sheets.js`. Para trocar, basta alterar a constante `CSV_URL`.

## Tecnologias

- HTML5, CSS3, Bootstrap 5
- JavaScript puro (ES6)
- LocalStorage para comunicação entre abas

## Hospedagem

Este projeto pode ser hospedado no GitHub Pages sem necessidade de backend.