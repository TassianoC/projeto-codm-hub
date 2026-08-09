# CODM HUB 2.0

Plataforma web para comunidade e competitivo de Call of Duty: Mobile.

## O que foi melhorado

- Redesign premium preto/grafite + dourado.
- Hero inicial com identidade competitiva.
- Player DNA: leitura visual do estilo de jogo.
- Rivalidades e histórico Head-to-Head.
- Player Score e reputação.
- Progressão de carreira: Recruta → Soldado → Veterano → Elite → Lenda.
- Desafios semanais.
- Mercado de Free Agents.
- Coach digital com insights demonstrativos.
- Mapa de domínio por mapa.
- CODM HUB League e Hall da Fama.
- Perfil do jogador ampliado com carreira e DNA.
- Ranking ampliado com Hall da Fama e talentos.
- Tema claro/escuro persistente.
- Animação dos números do início.
- Correção da inicialização duplicada do Firebase no `script.js`.
- Remoção de `node_modules` e `.git` do pacote final para deixar o ZIP mais leve.

## Como abrir

### Versão simples
Abra `index.html` diretamente no navegador.

### Com servidor local
Se usar VS Code, rode com Live Server.

### Firebase
O projeto continua preparado para Firebase Auth, Firestore e Storage. Para os recursos online funcionarem, mantenha a configuração do Firebase e as regras do projeto.

## Estrutura principal

- `index.html` — página inicial e nova experiência CODM HUB 2.0
- `perfil.html` — perfil e carreira do jogador
- `ranking.html` — ranking + Hall da Fama + Free Agents
- `modos.html` — inscrições 1v1, 2v2 e 5v5
- `agenda.html` — agenda de scrims
- `comunidade.html` — feed da comunidade
- `regras.html` — regras
- `style.css` — sistema visual completo
- `script.js` — Firebase + interações

> Os dados de DNA, rivalidade, desafios e algumas áreas de inteligência são demonstrativos nesta versão visual. A próxima etapa pode conectar cada métrica ao Firestore para que tudo seja calculado automaticamente.
