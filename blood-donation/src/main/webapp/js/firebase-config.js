// Firebase project: bloodcare-5a516 (configured via Firebase CLI)
// Redirect 127.0.0.1 → localhost (Firebase authorizes localhost by default)
if (location.hostname === '127.0.0.1') {
  location.replace(`http://localhost:${location.port || '5500'}${location.pathname}${location.search}${location.hash}`);
}

const firebaseConfig = {
  apiKey:            "AIzaSyBMNkoovZcsUWR6lJmOBQS-DNUc1g7ZOG0",
  authDomain:        "bloodcare-5a516.firebaseapp.com",
  projectId:         "bloodcare-5a516",
  storageBucket:     "bloodcare-5a516.firebasestorage.app",
  messagingSenderId: "903309908627",
  appId:             "1:903309908627:web:f2a20203b3d3a03023cb66",
};

firebase.initializeApp(firebaseConfig);
window.auth = firebase.auth();
window.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
window.db = firebase.firestore();
// Do not force long-polling — Safari blocks those XHR Listen channels with CORS errors.
