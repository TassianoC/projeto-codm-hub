# CODM HUB — versão pronta para GitHub + Vercel

Esta versão foi preparada para publicação pelo GitHub sem depender do **Firebase Blaze** para o Coach IA ou para as imagens.

## Arquitetura

- **Firebase Authentication + Firestore:** contas e dados do perfil.
- **Cloudinary:** fotos e vídeos do perfil/feed.
- **Vercel Function:** endpoint seguro do Coach IA.
- **Gemini API:** análise dos 4 prints, com a chave mantida somente na Vercel.
- **Firebase Storage:** não utilizado.

## Antes do primeiro deploy

### 1. Cloudinary

Crie um **unsigned upload preset** no Cloudinary e coloque os dois valores públicos em `firebase-config.js`:

```js
cloudinaryCloudName: "SEU_CLOUD_NAME",
cloudinaryUploadPreset: "SEU_UPLOAD_PRESET",
```

Configure o preset com limites de formato e tamanho adequados. O nome do preset é público no navegador, portanto ele deve ser protegido por restrições do próprio preset.

### 2. Gemini na Vercel

No projeto da Vercel, em **Settings → Environment Variables**, adicione:

```text
GEMINI_API_KEY=sua_chave_nova
GEMINI_MODEL=gemini-2.5-flash
```

Não coloque a chave no código.

### 3. Firebase Authentication

No Firebase Console, habilite os provedores desejados, por exemplo:

- E-mail/senha
- Google

### 4. Firestore

Publique `firestore.rules` no seu projeto Firebase. O acesso ao documento `users/{UID}` é restrito ao usuário autenticado correspondente.

## Publicação pelo GitHub

1. Crie um repositório novo no GitHub.
2. Envie **todo o conteúdo desta pasta** para a raiz do repositório.
3. Importe o repositório na Vercel.
4. Na Vercel, configure `GEMINI_API_KEY` e `GEMINI_MODEL`.
5. Faça o deploy.
6. Abra o endereço da Vercel e teste login, upload de foto e Coach IA.

Não abra `index.html` diretamente pelo computador. A rota `/api/analyze-coach.js` é uma Serverless Function e precisa de um servidor/deploy compatível.

## Segurança

Se uma chave Gemini real já esteve em um arquivo público ou no `.env.example` de uma versão anterior, **revogue essa chave e gere outra**.

O arquivo `.gitignore` já bloqueia arquivos `.env` reais.
