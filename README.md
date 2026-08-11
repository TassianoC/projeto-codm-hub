# CODM HUB — plataforma com dados reais

O CODM HUB foi preparado para começar sem perfis, placares, posts ou scrims de demonstração. Depois da configuração, tudo exibido na comunidade é salvo por uma conta real.

## Recursos

- Cadastro e login por e-mail/senha ou Google com Firebase Authentication.
- Perfil editável, cartão público e ranking formado pelos usuários cadastrados.
- Fotos e vídeos armazenados permanentemente no Cloudinary.
- Feed da comunidade com publicações, mídia, curtidas e comentários persistidos no Firestore.
- Scrims e desafios com data/hora, modalidade, formato, mapa, regras, contato, solicitação de vaga, aceite/cancelamento pelo anfitrião e exportação para calendário (`.ics`).
- Notificações no HUB para solicitações e confirmações. O usuário pode autorizar lembretes no navegador enquanto o site estiver aberto.
- Coach IA: exige login e quatro prints, analisa somente o que está visível nas imagens e salva o relatório privado do jogador.

> O COD Mobile não disponibiliza uma API pública para validar partidas ou distribuir pontos automaticamente. Por isso o HUB não inventa estatísticas nem altera score por dados simulados. O score inicia em zero e uma futura rotina de moderação deve ser usada para validar resultados competitivos.

## Configuração antes do primeiro deploy

### 1. Cloudinary

Crie um **unsigned upload preset** e preencha os valores públicos em `firebase-config.js`:

```js
cloudinaryCloudName: "SEU_CLOUD_NAME",
cloudinaryUploadPreset: "SEU_UPLOAD_PRESET",
```

Proteja o preset com limites de origem, formatos e tamanho dentro do Cloudinary.

### 2. Vercel / Coach IA

Em **Settings → Environment Variables**, adicione:

```text
GEMINI_API_KEY=sua_chave_nova
GEMINI_MODEL=gemini-2.5-flash
FIREBASE_WEB_API_KEY=a-mesma-apiKey-publica-de-firebase-config.js
```

`FIREBASE_WEB_API_KEY` permite que a Function confirme que o Coach foi chamado por uma sessão Firebase válida. A chave Gemini nunca deve ficar no frontend.

### 3. Firebase

No Firebase Console, habilite os provedores usados (E-mail/senha e, se desejar, Google). Em seguida, publique o arquivo `firestore.rules`; ele separa perfil privado, cartão público, posts, agendas, solicitações e notificações.

### 4. Publicação

1. Envie o conteúdo desta pasta para um repositório GitHub.
2. Importe o repositório na Vercel.
3. Configure as três variáveis do Coach.
4. Faça o deploy e teste a criação de conta, perfil, post, scrim e análise.

Não abra `index.html` diretamente no computador: o Coach IA depende da Function `/api/analyze-coach` em um servidor compatível com Vercel.
