# Configuração rápida — CODM HUB

## A) GitHub

Envie os arquivos do projeto para um repositório novo. Não envie `.env` com chaves reais.

## B) Vercel

Importe o repositório e faça o deploy.

Environment Variables:

- `GEMINI_API_KEY`
- `GEMINI_MODEL` = `gemini-2.5-flash`

Depois de alterar variáveis, faça um novo deploy.

## C) Cloudinary

Crie um unsigned upload preset e preencha `firebase-config.js`:

```js
cloudinaryCloudName: "...",
cloudinaryUploadPreset: "...",
```

Não coloque API Secret do Cloudinary no frontend.

## D) Firebase

Habilite Authentication e Firestore. Publique as regras de `firestore.rules`.

## E) Teste

1. Criar conta.
2. Entrar.
3. Alterar foto de perfil.
4. Publicar uma mídia.
5. Atualizar/recarregar a página e confirmar que a URL da mídia continua no perfil.
6. Enviar os 4 prints ao Coach.
7. Confirmar que a análise retorna sem expor a chave Gemini no navegador.
