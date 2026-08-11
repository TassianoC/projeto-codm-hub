/**
 * Configuração pública do Firebase.
 * A configuração Web do Firebase pode ficar no frontend; as regras de segurança
 * do Firebase são o que protegem os dados.
 *
 * Cloudinary é usado SOMENTE para arquivos de mídia, evitando Firebase Storage
 * e, consequentemente, a necessidade de habilitar o plano Blaze para uploads.
 */
export const firebaseConfig = {
  apiKey: "AIzaSyBnysGMTtMQo0RbmEMjFPhBjZVLzovbgaA",
  authDomain: "projeto-codm-hub.firebaseapp.com",
  projectId: "projeto-codm-hub",
  messagingSenderId: "1038952355133",
  appId: "1:1038952355133:web:18f011328d2e111316a154",

  // Preencha com os dados públicos do seu Cloudinary.
  cloudinaryCloudName: "rhpsry3a",
  cloudinaryUploadPreset: "codm_hub_uploads",

  // Deixe vazio se o frontend e a API estiverem no mesmo projeto Vercel.
  // Se o frontend estiver em outro domínio, coloque aqui a URL completa da Function.
  coachApiUrl: ""
};
