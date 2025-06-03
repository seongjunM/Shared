import { initializeApp } from
  'https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js';
import { getAuth }       from
  'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';
import { getFirestore }  from
  'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';
import { getStorage }    from 
'https://www.gstatic.com/firebasejs/11.8.1/firebase-storage.js';

    // 🔑 프로젝트 고유 정보
const firebaseConfig = {
    apiKey: "AIzaSyCpvXrMGfTBpXC5zghwzwQSNYAIAfme1sQ",
    authDomain: "dietbet-buddy.firebaseapp.com",
    projectId: "dietbet-buddy",
    storageBucket: "dietbet-buddy.firebasestorage.app",
    messagingSenderId: "129985804862",
    appId: "1:129985804862:web:bb00dbc0458c0ee11f2f6f"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
