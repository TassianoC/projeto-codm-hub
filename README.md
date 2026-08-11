# CODM HUB

## Coach IA sem Firebase Blaze

O Coach IA deste projeto usa uma **Vercel Serverless Function** em `api/analyze-coach.js`.
Isso permite manter o Firebase no plano atual e continuar usando Firebase para autenticação, Firestore e Storage.

### Configuração da IA na Vercel

No projeto da Vercel, abra:

`Settings` → `Environment Variables`

Adicione:

`GEMINI_API_KEY` = sua chave da API Gemini

Opcionalmente:

`GEMINI_MODEL` = `gemini-2.5-flash`

Depois faça um novo deploy.

**Não coloque a chave em `app.js`, `index.html` ou em qualquer arquivo público.**

### Coach

O Coach exige exatamente 4 prints e envia somente as imagens para a função `/api/analyze-coach` junto do modo/mapa para contexto. A IA deve usar exclusivamente as informações visíveis nos prints para as métricas e marcar como `não identificado` aquilo que não estiver legível.

### Firebase

O Firebase continua sendo usado pelo frontend para os recursos já existentes. Não há Cloud Function do Firebase neste projeto, portanto o Coach não exige o plano Blaze.
