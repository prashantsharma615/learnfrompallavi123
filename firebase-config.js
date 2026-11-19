// ============================================================
//  STEP 1 (one-time): Paste your Firebase web config here.
//  Firebase console → Project settings → Your apps → Web app → "Config"
//  Leave FIREBASE_CONFIG = null to run in DEMO MODE (data saved only on this device).
// ============================================================
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyAjswIHku5prt6j2YoJ0-7krMgm-GLPjpE",
  authDomain: "learn-from-pallavi.firebaseapp.com",
  projectId: "learn-from-pallavi",
  storageBucket: "learn-from-pallavi.firebasestorage.app",
  messagingSenderId: "817848068807",
  appId: "1:817848068807:web:acdc3630ab3f955e3cace2"
};
/* Example:
window.FIREBASE_CONFIG = {
  apiKey: "AIza....",
  authDomain: "learn-from-pallavi.firebaseapp.com",
  projectId: "learn-from-pallavi",
  storageBucket: "learn-from-pallavi.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef"
};
*/

// STEP 2: The email you create for the admin (Pallavi ma'am) in Firebase → Authentication → Users.
// Use the SAME email in firestore.rules.
window.ADMIN_EMAIL = "admin@learnfrompallavi.app";

// Student IDs are turned into hidden login emails using this domain (no real email is needed).
window.STUDENT_EMAIL_DOMAIN = "students.learnfrompallavi.app";

// Teacher's WhatsApp number (used for "Forgot password?" and "Contact Ma'am" buttons).
// Can be changed later from Admin → Settings.
window.TEACHER_PHONE = "7006181540";
