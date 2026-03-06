# Game Design Document: Stack Slicer

## 1. Visão Geral
**Título do Jogo:** Stack Slicer
**Gênero:** Arcade / Ação (Estilo Fruit Ninja)
**Plataforma:** Browser Web (HTML5 Canvas) optimizado para GitHub Pages.
**Público-Alvo:** Desenvolvedores e estudantes de tecnologia.
**Resumo:** O jogador precisa provar que domina diversas linguagens de programação "cortando" suas logos (ou emojis representativos) que saltam na tela. O grande desafio é evitar a todo custo cortar o "Python", que atua como a bomba do jogo. A partida é controlada por um limite de tempo, buscando a maior pontuação possível.

## 2. Mecânicas de Jogo (Gameplay)

### 2.1 Visão Geral da Partida
- **Objetivo Principal:** Fazer a maior pontuação possível dentro do tempo limite cortando as linguagens de programação virtuais.
- **Condições de Fim de Jogo:** 
  1. O tempo se esgota (ex: 60 segundos). O jogador registra sua pontuação final.
  2. Cortar o "Python" (Bomba) = Game Over instantâneo independente do tempo restante.
- **Controles:** Mouse (clicar e arrastar) ou Touch (tocar e arrastar) na tela para realizar o "Slash" (corte).

### 2.2 Entidades e Regras
- **Alvos Positivos (Stacks/Linguagens):**
  - Todas concedem +10 pontos.
  - Exemplos: JavaScript (JS), Java, C#, Assembly, C++, Go, Rust, Ruby.
- **Alvo Negativo / Bomba (Avoid!):**
  - 🐍 Python: A linguagem proibida. Cortar resulta em Game Over e tela de explosão.
  - O Python aparece com menos frequência, mas mistura-se entre os alvos normais para confundir o jogador.
- **Sistema de Spawner (Gerador):**
  - Os itens surgem da parte inferior da tela, arremessados com uma força (velocidade Y negativa) e espalhamento (velocidade X aleatória).
  - A gravidade puxa todos os itens para baixo constantemente.
  - A dificuldade pode escalar um pouco com o tempo (mais itens gerados simutaneamente).

## 3. Arte e Estética (Art & Aesthetics)
- **Tema Visual:** Emula uma interface de código moderna (Dark Theme) ou um terminal (fundo cinza muito escuro/preto).
- **Paleta de Cores:** Fundo escuro (`#121212`), linha de corte brilhante (Neon Blue ou White).
- **Assets de Jogo:** Imagens (logos) das linguagens de programação, ou SVG estilizados. O Python será representado pela sua logo típica dupla (cobra azul e amarela).
- **HUD:** 
  - Cronômetro no topo indicando o tempo restante.
  - Placar atual.
- **Partículas (Feedback Visual):** Quando uma linguagem é cortada, há um efeito de "slash" (corte ao meio do ícone) e o texto da linguagem pode flutuar e desaparecer.

## 4. Tecnologias
- **Stack:** Vanilla HTML5, CSS3, e JavaScript.
- **Motor:** HTML5 `<canvas>` manipulado via JS com `requestAnimationFrame`. Sem engines externas.
- **Deploy:** O projeto será puramente estático (client-side) para fácil integração e hospedagem direta no **GitHub Pages**.

## 5. Próximos Passos (Roadmap de Desenvolvimento)
1. Setup inicial (HTML/CSS/JS e assets de imagens das linguagens).
2. Implementar Loop de Jogo e Renderização do Canvas.
3. Desenvolver sistema de rastro do mouse (Blade/Slash).
4. Lógica das Entidades, Física e Spawner.
5. Sistema de intersecção/colisão e Timer.
6. HUD (Score, Time Limit, e Highscore salvo em LocalStorage).
7. Efeitos visuais (corte dos ícones).
