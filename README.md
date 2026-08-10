# CODM HUB 3.0 — Carreira competitiva

Uma experiência única para transformar a comunidade de COD Mobile em uma plataforma de identidade e evolução competitiva.

## Como abrir

Abra `index.html` diretamente no navegador. Para uma experiência melhor durante alterações, rode o projeto com qualquer servidor local (por exemplo, a extensão Live Server do VS Code).

Não há instalação nem dependências obrigatórias: esta versão funciona somente com HTML, CSS e JavaScript.

## O que foi incluído

- Perfil competitivo completo, com Player Score, DNA de jogo, rank, histórico, armas, mapas, conquistas e currículo para times.
- Card de jogador compartilhável: o botão de compartilhar copia o link direto do perfil.
- Sistema de Player Score explicado por critérios: vitórias, objetivos, eficiência, adversários, torneios, sequência e reputação.
- Arena para desafios 1v1, 2v2 e 5v5, com modal de criação e valor de pontos.
- Ranking global com busca de jogador e categorias preparadas para Global, X1 e Clãs.
- Desafio semanal funcional: o progresso é atualizado e persiste no navegador.
- Coach digital funcional: recebe dados da partida e gera um diagnóstico com mira, decisão, agressividade, posicionamento e recomendação.
- Feed da comunidade com publicação local, curtidas e área de mercado de talentos.
- Visual responsivo para desktop e celular, tema claro/escuro e navegação inferior no celular.

## Dados e persistência

Esta é uma versão demonstrativa pronta para apresentação e validação de produto. Alterações feitas no desafio, perfil, disponibilidade e feed são salvas no `localStorage` do navegador, sem depender de login ou banco de dados.

## Próxima etapa para colocar online

Para transformar o protótipo em uma rede real, conecte as ações a um backend (Firebase, Supabase ou outro):

1. Autenticação e perfis em `players`.
2. Partidas e confirmação dupla em `matches`.
3. Desafios em `challenges` e progresso em `challengeProgress`.
4. Posts, comentários e curtidas em `posts`.
5. Ranking calculado no servidor a partir das partidas validadas.
6. Upload de prints/clipes em Storage, com moderação antes de contabilizar pontos.

> Importante: nunca calcule nem conceda Player Score apenas no navegador em produção. A validação de resultado e o cálculo do ranking devem acontecer no servidor para evitar fraude.

## Estrutura

- `index.html` — interface e seções do HUB.
- `styles.css` — identidade visual, responsividade e temas.
- `app.js` — navegação, interações, persistência local, Coach, desafios, feed e ranking.

