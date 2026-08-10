# Coach IA — configuração

O front-end agora exige exatamente 4 prints e envia as imagens para a Cloud Function `analyzeCoachScreenshots`.
A Function usa o Gemini no servidor, então a chave da IA **não fica exposta no navegador**.

## 1. Instalar dependências

Na pasta `functions/`:

```bash
npm install
```

## 2. Configurar a chave do Gemini

Crie uma chave da API do Google AI Studio e configure o segredo/variável `GEMINI_API_KEY` no ambiente das Functions.

Para desenvolvimento local, você pode usar um arquivo `.env` compatível com seu fluxo de Functions ou exportar a variável antes de iniciar o emulador.

Exemplo de variável:

```text
GEMINI_API_KEY=SUA_CHAVE_AQUI
```

Nunca coloque essa chave em `firebase-config.js` ou em `app.js`.

Opcionalmente, altere o modelo com:

```text
GEMINI_MODEL=gemini-2.5-flash
```

## 3. Publicar

Na raiz do projeto:

```bash
firebase login
firebase use projeto-codm-hub
firebase deploy --only functions
```

Depois de publicada, a função fica na região `southamerica-east1`, a mesma região carregada pelo front-end.

## 4. Comportamento do Coach

- Exige exatamente 4 imagens.
- Redimensiona os prints no navegador antes da análise para evitar payload excessivo.
- A IA recebe somente os quatro prints como fonte de métricas.
- Modo e mapa são enviados apenas como contexto.
- O modelo é instruído a não inventar números ausentes ou ilegíveis.
- Se algo não estiver visível, o relatório marca como não identificado.
