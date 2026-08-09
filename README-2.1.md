# CODM HUB 2.1 — Dados reais + Coach + Agenda

## O que foi implementado
- Coach Digital ligado ao Firestore.
- Partidas concluídas alimentam K/D, vitórias, mortes, MVP e pontos de ranking.
- Ranking lê `users.rankingPoints` em tempo real.
- Agenda com dia, horário, formato (Equipe/Duo/X1), vencedor e print da vitória.
- Print do resultado enviado ao Firebase Storage.
- Perfil com visual mais dinâmico, estilo social/Instagram, e aba Coach.
- Nova página `coach.html`.

## Fluxo de uma partida
1. Entre na conta.
2. Em Modos, agende uma partida informando dia, hora e formato.
3. Depois de jogar, abra a Agenda e clique em `Resultado`.
4. Informe vencedor, abates, mortes, mapa, arma e envie o print da vitória.
5. O resultado é salvo em `matches` e as estatísticas do jogador são atualizadas em `users`.
6. O ranking passa a refletir os pontos registrados.
7. O Coach usa as partidas concluídas para calcular K/D, MVP rate, Coach Score e plano de treino.

## Firebase
O projeto já contém a configuração Firebase usada na versão anterior.

Se o Firestore pedir índice para a consulta do Coach, use `firestore.indexes.json`.

**Importante:** para produção, a contabilização de pontos deve ser validada por Cloud Functions/servidor e as regras do Firestore/Storage devem impedir que qualquer cliente altere `rankingPoints` ou envie resultados fraudulentos. A versão atual é uma implementação funcional de front-end + Firebase para prototipagem.
