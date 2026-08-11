import { firebaseConfig } from './firebase-config.js';

async function bootFirebase() {
  try {
    const version = '10.12.0';
    const [appSdk, authSdk, firestoreSdk] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${version}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${version}/firebase-firestore.js`),
    ]);

    const app = appSdk.initializeApp(firebaseConfig);
    const service = {
      available: true,
      auth: authSdk.getAuth(app),
      db: firestoreSdk.getFirestore(app),
      config: firebaseConfig,
      sdk: { ...authSdk, ...firestoreSdk }
    };
    window.codmFirebase = service;
    window.dispatchEvent(new CustomEvent('codmFirebaseReady', { detail: service }));
  } catch (error) {
    console.error('Firebase indisponível:', error);
    const service = { available: false, error, config: firebaseConfig };
    window.codmFirebase = service;
    window.dispatchEvent(new CustomEvent('codmFirebaseReady', { detail: service }));
  }
}

bootFirebase();
