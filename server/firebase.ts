import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeApp as initializeAdminApp, cert } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

// Configuration (Consider moving sensitive parts like apiKey to env vars too)
const firebaseConfig = {
  apiKey: "AIzaSyDIXPNOzt5M5VgLKZLsQR-F35GKjIGEdrA",
  authDomain: "cotizaciones-8627a.firebaseapp.com",
  projectId: "cotizaciones-8627a",
  storageBucket: "cotizaciones-8627a.appspot.com",
  messagingSenderId: "472096497490",
  appId: "1:472096497490:web:f5f6854cb084bd9aad648b",
  measurementId: "G-VMGK9EKDWG"
};

// Initialize client Firebase
console.log('Inicializando Firebase Client...');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Apply specific Firestore settings like long polling if needed (as in original code)
// const firestoreSettings = {
//   cacheSizeBytes: 1048576 * 100, // 100MB cache
//   experimentalForceLongPolling: true,
//   experimentalAutoDetectLongPolling: false
// };
// try {
//   // @ts-ignore
//   db.settings(firestoreSettings);
//   console.log('Configurações otimizadas do Firestore aplicadas com sucesso ao cliente.');
// } catch (error) {
//   console.warn('Não foi possível aplicar configurações otimizadas ao Firestore do cliente:', error);
// }


// Initialize Firebase Admin asynchronously
let adminDb;
const projectId = firebaseConfig.projectId;

try {
  if (process.env.NODE_ENV === 'production') {
    console.log('Ambiente de produção detectado. Inicializando Firebase Admin com Secret Manager.');
    const client = new SecretManagerServiceClient();
    // Using the discovered secret name "Segredo" for project cotizaciones-8627a
    const secretName = `projects/${projectId}/secrets/Segredo/versions/latest`;

    try {
      // Use await here as top-level await is generally supported in Node ESM modules
      const [version] = await client.accessSecretVersion({ name: secretName });
      const payload = version.payload?.data?.toString();

      if (!payload) {
        throw new Error('Payload do segredo do Secret Manager está vazio ou indefinido.');
      }

      const credentials = JSON.parse(payload);
      const adminApp = initializeAdminApp({
        credential: cert(credentials),
        projectId: projectId
      });
      adminDb = getAdminFirestore(adminApp);
      console.log('Firebase Admin inicializado com sucesso usando Secret Manager.');

    } catch (secretError) {
      console.error('ERRO CRÍTICO: Falha ao buscar/usar credenciais do Secret Manager!', secretError);
      // Exit in production if credentials are vital and retrieval fails.
      // This prevents the app starting in a broken state.
      process.exit(1);
    }
  } else {
    // Development environment
    console.log('Ambiente de desenvolvimento. Inicializando Firebase Admin com Application Default Credentials (ADC).');
    console.warn('--> Certifique-se de ter executado "gcloud auth application-default login" localmente <--');
    console.warn('--> NUNCA inclua o arquivo "firebase-admin-credentials.json" no controle de versão! <--');
    try {
      // Initialize using ADC found in the environment (e.g., from gcloud login)
      const adminApp = initializeAdminApp({ projectId: projectId });
      adminDb = getAdminFirestore(adminApp);
      console.log('Firebase Admin inicializado com sucesso usando ADC.');
    } catch (adcError) {
       console.error('Erro ao inicializar Firebase Admin com ADC:', adcError);
       console.warn('Fallback: Usando instância do Firestore do cliente para adminDb em desenvolvimento.');
       // Fallback to client Firestore ONLY in dev if ADC fails.
       adminDb = db;
    }
  }
} catch (error) { // Catch potential errors during environment check itself
  console.error('Erro inesperado durante a configuração da inicialização do Firebase Admin:', error);
  console.warn('Fallback final: Usando instância do Firestore do cliente para adminDb.');
  // Final fallback if something goes wrong even before ADC/SecretManager attempts
  adminDb = db;
}

// Export client and admin Firestore instances
// Consumers of adminDb should be aware it might be the client db instance in dev fallback scenarios.
export { db, adminDb };

