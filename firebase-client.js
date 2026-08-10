import { firebaseConfig } from './firebase-config.js';

/**
 * Carrega Firebase sem impedir que a interface demonstrativa abra caso a rede
 * esteja indisponível. O app principal recebe o serviço pelo evento abaixo.
 */
async function bootFirebase() {
  try {
    const version = '12.17.1';
    const [appSdk, authSdk, firestoreSdk, storageSdk, functionsSdk] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${version}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${version}/firebase-firestore.js`),
      import(`https://www.gstatic.com/firebasejs/${version}/firebase-storage.js`),
      import(`https://www.gstatic.com/firebasejs/${version}/firebase-functions.js`)
    ]);

    const app = appSdk.initializeApp(firebaseConfig);
    const service = {
      available: true,
      auth: authSdk.getAuth(app),
      db: firestoreSdk.getFirestore(app),
      storage: storageSdk.getStorage(app),
      functions: functionsSdk.getFunctions(app, 'southamerica-east1'),
      sdk: { ...authSdk, ...firestoreSdk, ...storageSdk, ...functionsSdk }
    };
    window.codmFirebase = service;
    window.dispatchEvent(new CustomEvent('codmFirebaseReady', { detail: service }));
  } catch (error) {
    console.warn('Firebase indisponível; usando modo demonstrativo local.', error);
    const service = { available: false, error };
    window.codmFirebase = service;
    window.dispatchEvent(new CustomEvent('codmFirebaseReady', { detail: service }));
  }
}

bootFirebase();
