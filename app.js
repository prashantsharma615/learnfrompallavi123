/* Learn from Pallavi Gupta — main app */
const LESSONS = window.LESSONS || [];
const CLASSES = [1, 2, 3, 4, 5];
const DEFAULT_PHOTO = "icons/pallavi.jpg"; // App producer — Pallavi Gupta
const APP_VERSION = "2.0";
const waLink = (phone, text) => `https://wa.me/${phone ? "91" + String(phone).replace(/\D/g, "").slice(-10) : ""}?text=${encodeURIComponent(text || "")}`;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = (s) => String(s ?? "").toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, " ").replace(/[.!]+$/, "").trim();
const cleanId = (s) => String(s || "").toLowerCase().trim().replace(/[^a-z0-9._-]/g, "");
const ordinal = (n) => ({ 1: "1st", 2: "2nd", 3: "3rd" }[n] || n + "th");
const fmtDate = (t) => { try { return new Date(t).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };
const genPassword = window.genPw = () => { const w = ["sun", "star", "moon", "rose", "kite", "lion", "tiger", "mango", "apple", "river"]; return w[Math.floor(Math.random() * w.length)] + Math.floor(100 + Math.random() * 900); };

function friendly(e) {
  const m = String(e && (e.code || e.message) || e || "");
  if (/permission-denied|insufficient permissions/i.test(m)) return "Permission denied — publish firestore.rules in Firebase and check the admin email matches firebase-config.js.";
  if (/unavailable|offline|network|failed to fetch/i.test(m)) return "No internet connection. Please check and try again.";
  if (/not-found|NOT_FOUND|database.*does not exist/i.test(m)) return "Firestore database not found — create it in Firebase console (Build → Firestore Database).";
  if (/operation-not-allowed/i.test(m)) return "Email/Password sign-in is not enabled in Firebase → Authentication.";
  if (/api-key|invalid-api-key/i.test(m)) return "Firebase config is wrong — copy it again into firebase-config.js.";
  if (/unauthorized-domain/i.test(m)) return "Add this website's domain in Firebase → Authentication → Settings → Authorized domains.";
  return (e && e.message) || m || "Something went wrong";
}
function toast(msg, type = "") {
  if (type === "bad") msg = friendly(msg);
  const t = document.createElement("div");
  t.className = "toast " + type; t.textContent = String(msg);
  document.body.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 2800);
}

function resizeImage(file, maxW, quality = 0.75) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL("image/jpeg", quality));
      };
      img.onerror = rej; img.src = r.result;
    };
    r.onerror = rej; r.readAsDataURL(file);
  });
}

/* ===================== DATA LAYER ===================== */
// Demo mode: everything in localStorage (one device only)
class LocalDB {
  constructor() { this.mode = "demo"; }
  _get(k, d) { try { return JSON.parse(localStorage.getItem("lpg_" + k)) ?? d; } catch { return d; } }
  _set(k, v) { localStorage.setItem("lpg_" + k, JSON.stringify(v)); }
  async init() { if (!this._get("settings")) this._set("settings", { adminPassword: "admin123", welcome: "" }); }
  async restoreSession() {
    const ses = this._get("session", null); if (!ses || ses.role !== "student") return ses;
    const st = this._get("students", {})[ses.id];
    if (!st || st.disabled) { localStorage.removeItem("lpg_session"); return null; }
    const fresh = { ...ses, name: st.name, cls: st.cls }; this._set("session", fresh); return fresh;
  }
  async studentLogin(id, pw) {
    const s = this._get("students", {})[cleanId(id)];
    if (!s || s.password !== pw) throw new Error("Wrong Login ID or password");
    if (s.disabled) throw new Error("This account is paused. Please contact your teacher.");
    const session = { role: "student", id: s.id, name: s.name, cls: s.cls }; this._set("session", session); return session;
  }
  async adminLogin(_email, pw) {
    if (pw !== this._get("settings", {}).adminPassword) throw new Error("Wrong admin password");
    const session = { role: "admin", name: "Admin" }; this._set("session", session); return session;
  }
  async logout() { localStorage.removeItem("lpg_session"); }
  async listStudents() { return Object.values(this._get("students", {})).sort((a, b) => a.cls - b.cls || a.name.localeCompare(b.name)); }
  async addStudent(s) {
    const all = this._get("students", {}); const id = cleanId(s.id);
    if (all[id]) throw new Error("This Login ID is already taken");
    all[id] = { ...s, id, disabled: false, createdAt: Date.now() }; this._set("students", all);
  }
  async updateStudent(id, patch) { const all = this._get("students", {}); all[id] = { ...all[id], ...patch }; this._set("students", all); }
  async changeStudentPassword(id, pw) { await this.updateStudent(id, { password: pw }); }
  async deleteStudent(id) { const all = this._get("students", {}); delete all[id]; this._set("students", all); }
  async listWorksheets() { return this._get("worksheets", []); }
  async addWorksheet(w) { const all = this._get("worksheets", []); all.unshift({ ...w, id: "w" + Date.now(), createdAt: Date.now() }); this._set("worksheets", all); }
  async deleteWorksheet(id) { this._set("worksheets", this._get("worksheets", []).filter(w => w.id !== id)); }
  async saveResult(r) { const all = this._get("results", []); all.unshift({ ...r, id: "r" + Date.now(), at: Date.now() }); this._set("results", all.slice(0, 2000)); }
  async myResults(studentId) { return this._get("results", []).filter(r => r.studentId === studentId); }
  async allResults() { return this._get("results", []); }
  async listLessons() { return this._get("lessons", []); }
  async saveLesson(l) { const all = this._get("lessons", []).filter(x => x.id !== l.id); all.push(l); this._set("lessons", all); }
  async deleteLesson(id) { this._set("lessons", this._get("lessons", []).filter(x => x.id !== id)); }
  async listDoubts(studentId) { const all = this._get("doubts", []); return studentId ? all.filter(d => d.studentId === studentId) : all; }
  async addDoubt(d) { const all = this._get("doubts", []); all.unshift({ ...d, id: "d" + Date.now(), at: Date.now() }); this._set("doubts", all); }
  async answerDoubt(id, answer) { this._set("doubts", this._get("doubts", []).map(d => d.id === id ? { ...d, answer, answeredAt: Date.now() } : d)); }
  async deleteDoubt(id) { this._set("doubts", this._get("doubts", []).filter(d => d.id !== id)); }
  exportAll() { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith("lpg_") && k !== "lpg_session") o[k] = localStorage.getItem(k); } return o; }
  importAll(o) { Object.keys(o).forEach(k => { if (k.startsWith("lpg_") && k !== "lpg_session") localStorage.setItem(k, o[k]); }); }
  async listNotices() { return this._get("notices", []); }
  async addNotice(n) { const all = this._get("notices", []); all.unshift({ ...n, id: "n" + Date.now(), createdAt: Date.now() }); this._set("notices", all); }
  async deleteNotice(id) { this._set("notices", this._get("notices", []).filter(n => n.id !== id)); }
  async getSettings() { return this._get("settings", {}); }
  async saveSettings(p) { this._set("settings", { ...this._get("settings", {}), ...p }); }
}

// Cloud mode: Firebase Auth + Firestore (data syncs on every phone)
class FireDB {
  constructor(cfg) { this.cfg = cfg; this.mode = "cloud"; }
  async init() {
    const V = "10.12.2", B = `https://www.gstatic.com/firebasejs/${V}/`;
    const [app, auth, fs] = await Promise.all([import(B + "firebase-app.js"), import(B + "firebase-auth.js"), import(B + "firebase-firestore.js")]);
    this.A = auth; this.F = fs;
    this.app = app.initializeApp(this.cfg);
    this.app2 = app.initializeApp(this.cfg, "secondary"); // used by admin to create student accounts without logging out
    this.auth = auth.getAuth(this.app); this.auth2 = auth.getAuth(this.app2);
    await auth.setPersistence(this.auth2, auth.inMemoryPersistence);
    this.db = fs.getFirestore(this.app);
    this.ready = new Promise(r => { const u = auth.onAuthStateChanged(this.auth, () => { u(); r(); }); });
  }
  email(id) { return cleanId(id) + "@" + (window.STUDENT_EMAIL_DOMAIN || "students.app"); }
  isAdminUser(u) { return u && u.email && u.email.toLowerCase() === String(window.ADMIN_EMAIL).toLowerCase(); }
  async _studentSession(u) {
    const { collection, query, where, getDocs, limit } = this.F;
    const snap = await getDocs(query(collection(this.db, "students"), where("uid", "==", u.uid), limit(1)));
    if (snap.empty) { await this.A.signOut(this.auth); throw new Error("Account not found. Please contact your teacher."); }
    const s = snap.docs[0].data();
    if (s.disabled) { await this.A.signOut(this.auth); throw new Error("This account is paused. Please contact your teacher."); }
    return { role: "student", id: s.id, name: s.name, cls: s.cls, uid: u.uid };
  }
  async restoreSession() {
    await this.ready; const u = this.auth.currentUser; if (!u) return null;
    if (this.isAdminUser(u)) return { role: "admin", name: "Admin", uid: u.uid };
    try { return await this._studentSession(u); } catch { return null; }
  }
  _err(e) {
    const c = e && e.code || "";
    if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(c)) return new Error("Wrong Login ID or password");
    if (/too-many-requests/.test(c)) return new Error("Too many tries. Please wait a few minutes.");
    if (/network/.test(c)) return new Error("No internet connection");
    if (/email-already-in-use/.test(c)) return new Error("This Login ID is already taken");
    if (/weak-password/.test(c)) return new Error("Password must be at least 6 characters");
    return new Error(friendly(e));
  }
  async studentLogin(id, pw) {
    try { const c = await this.A.signInWithEmailAndPassword(this.auth, this.email(id), pw); return await this._studentSession(c.user); }
    catch (e) { throw e.code ? this._err(e) : e; }
  }
  async adminLogin(email, pw) {
    try {
      const c = await this.A.signInWithEmailAndPassword(this.auth, email.trim(), pw);
      if (!this.isAdminUser(c.user)) { await this.A.signOut(this.auth); throw new Error("This email is not the admin account"); }
      return { role: "admin", name: "Admin", uid: c.user.uid };
    } catch (e) { throw e.code ? this._err(e) : e; }
  }
  async logout() { await this.A.signOut(this.auth); }
  async listStudents() {
    const { collection, getDocs } = this.F;
    const snap = await getDocs(collection(this.db, "students"));
    return snap.docs.map(d => d.data()).sort((a, b) => a.cls - b.cls || a.name.localeCompare(b.name));
  }
  async addStudent(s) {
    const { doc, setDoc, getDoc } = this.F; const id = cleanId(s.id);
    if ((await getDoc(doc(this.db, "students", id))).exists()) throw new Error("This Login ID is already taken");
    try {
      const c = await this.A.createUserWithEmailAndPassword(this.auth2, this.email(id), s.password);
      await setDoc(doc(this.db, "students", id), { ...s, id, uid: c.user.uid, disabled: false, createdAt: Date.now() });
      await this.A.signOut(this.auth2);
    } catch (e) {
      if (e.code === "auth/email-already-in-use") throw new Error("This Login ID was used before. Please choose a different Login ID (e.g. add a number).");
      throw e.code ? this._err(e) : e;
    }
  }
  async updateStudent(id, patch) { const { doc, updateDoc } = this.F; await updateDoc(doc(this.db, "students", id), patch); }
  async changeStudentPassword(id, pw) {
    const { doc, getDoc } = this.F;
    const s = (await getDoc(doc(this.db, "students", id))).data();
    try {
      const c = await this.A.signInWithEmailAndPassword(this.auth2, this.email(id), s.password);
      await this.A.updatePassword(c.user, pw); await this.A.signOut(this.auth2);
      await this.updateStudent(id, { password: pw });
    } catch (e) { throw e.code ? this._err(e) : e; }
  }
  async deleteStudent(id) {
    const { doc, getDoc, deleteDoc } = this.F;
    const snap = await getDoc(doc(this.db, "students", id)); const s = snap.data();
    if (s && s.password) {
      try { const c = await this.A.signInWithEmailAndPassword(this.auth2, this.email(id), s.password); await this.A.deleteUser(c.user); }
      catch (e) { /* account may already be gone — still remove the record */ }
      try { await this.A.signOut(this.auth2); } catch { }
    }
    await deleteDoc(doc(this.db, "students", id));
  }
  async listWorksheets() {
    const { collection, getDocs } = this.F;
    const snap = await getDocs(collection(this.db, "worksheets"));
    return snap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) => b.createdAt - a.createdAt);
  }
  async addWorksheet(w) { const { collection, addDoc } = this.F; await addDoc(collection(this.db, "worksheets"), { ...w, createdAt: Date.now() }); }
  async deleteWorksheet(id) { const { doc, deleteDoc } = this.F; await deleteDoc(doc(this.db, "worksheets", id)); }
  async saveResult(r) { const { collection, addDoc } = this.F; await addDoc(collection(this.db, "results"), { ...r, uid: this.auth.currentUser.uid, at: Date.now() }); }
  async myResults() {
    const { collection, query, where, getDocs } = this.F;
    const snap = await getDocs(query(collection(this.db, "results"), where("uid", "==", this.auth.currentUser.uid)));
    return snap.docs.map(d => d.data());
  }
  async allResults() {
    const { collection, query, orderBy, limit, getDocs } = this.F;
    const snap = await getDocs(query(collection(this.db, "results"), orderBy("at", "desc"), limit(500)));
    return snap.docs.map(d => ({ ...d.data(), id: d.id }));
  }
  async listLessons() { const { collection, getDocs } = this.F; const snap = await getDocs(collection(this.db, "lessons")); return snap.docs.map(d => ({ ...d.data(), id: d.id })); }
  async saveLesson(l) { const { doc, setDoc } = this.F; await setDoc(doc(this.db, "lessons", l.id), l); }
  async deleteLesson(id) { const { doc, deleteDoc } = this.F; await deleteDoc(doc(this.db, "lessons", id)); }
  async listDoubts(studentId) {
    const { collection, query, where, getDocs } = this.F;
    const q = studentId ? query(collection(this.db, "doubts"), where("uid", "==", this.auth.currentUser.uid)) : collection(this.db, "doubts");
    const snap = await getDocs(q); return snap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) => b.at - a.at);
  }
  async addDoubt(d) { const { collection, addDoc } = this.F; await addDoc(collection(this.db, "doubts"), { ...d, uid: this.auth.currentUser.uid, at: Date.now() }); }
  async answerDoubt(id, answer) { const { doc, updateDoc } = this.F; await updateDoc(doc(this.db, "doubts", id), { answer, answeredAt: Date.now() }); }
  async deleteDoubt(id) { const { doc, deleteDoc } = this.F; await deleteDoc(doc(this.db, "doubts", id)); }
  async listNotices() {
    const { collection, getDocs } = this.F;
    const snap = await getDocs(collection(this.db, "notices"));
    return snap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) => b.createdAt - a.createdAt);
  }
  async addNotice(n) { const { collection, addDoc } = this.F; await addDoc(collection(this.db, "notices"), { ...n, createdAt: Date.now() }); }
  async deleteNotice(id) { const { doc, deleteDoc } = this.F; await deleteDoc(doc(this.db, "notices", id)); }
  async getSettings() { const { doc, getDoc } = this.F; try { return (await getDoc(doc(this.db, "settings", "app"))).data() || {}; } catch { return {}; } }
  async saveSettings(p) { const { doc, setDoc } = this.F; await setDoc(doc(this.db, "settings", "app"), p, { merge: true }); }
}

/* ===================== CUSTOM LESSONS (added by teacher) ===================== */
const BUILTIN_IDS = new Set(LESSONS.map(l => l.id));
function mergeLessons(list) {
  for (let i = LESSONS.length - 1; i >= 0; i--) if (!BUILTIN_IDS.has(LESSONS[i].id)) LESSONS.splice(i, 1);
  (list || []).forEach(l => { if (l && l.id && l.title) LESSONS.push({ points: [], examples: [], ws: [], tip: { en: "", hi: "" }, intro: { en: "", hi: "" }, icon: "📘", ...l, custom: true }); });
  LESSONS.sort((a, b) => a.cls - b.cls);
}

/* ===================== PERSONAL PREFERENCES (this device) ===================== */
const PREF = {
  get(k, d) { try { return localStorage.getItem("lpg_pref_" + k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem("lpg_pref_" + k, v); } catch { } },
};
const TEXT_SIZES = { s: "15px", m: "17px", l: "19px", xl: "21px" };
function applyTextSize() { document.documentElement.style.fontSize = TEXT_SIZES[PREF.get("size", "m")] || "17px"; }
const AVATARS = ["🦁", "🐯", "🐼", "🦊", "🐨", "🐰", "🦄", "🐸", "🐵", "🐧", "🦋", "🌟", "🚀", "⚽", "🎨", "🌸"];
const myAvatar = () => PREF.get("avatar_" + (S.session && S.session.id), "🙂");

/* ===================== STATE ===================== */
const S = {
  db: null, session: null, settings: {},
  lang: localStorage.getItem("lpg_lang") || "both",
  viewCls: null, worksheets: [], results: [], notices: [], search: "",
};
const app = () => $("#app");

/* ===================== SPEECH ===================== */
function speak(text, lang) {
  if (!("speechSynthesis" in window)) { toast("Read-aloud is not supported on this phone"); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === "hi" ? "hi-IN" : "en-IN"; u.rate = 0.9;
  const v = speechSynthesis.getVoices().find(v => v.lang.replace("_", "-").toLowerCase().startsWith(u.lang.toLowerCase()));
  if (v) u.voice = v;
  else if (lang === "hi" && speechSynthesis.getVoices().length) toast("Hindi voice not installed on this phone — install it in phone Settings → Text-to-speech");
  speechSynthesis.speak(u);
}
if ("speechSynthesis" in window) { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices(); }
window.speakBtn = (btn) => speak(btn.dataset.say, btn.dataset.lang);

/* ===================== COMMON UI ===================== */
function teacherAvatar(size = 84) {
  const p = S.settings.photo || DEFAULT_PHOTO;
  return p ? `<img class="avatar" style="width:${size}px;height:${size}px" src="${p}" alt="Pallavi Gupta">`
    : `<div class="avatar avatar-ph" style="width:${size}px;height:${size}px;font-size:${size * .38}px">PG</div>`;
}
function bottomNav(active) {
  const it = (k, icon, l, h) => `<button class="${k === active ? "on" : ""}" onclick="go('${h}')"><span>${icon}</span>${l}</button>`;
  const unread = (S.doubts || []).filter(d => d.answer && !PREF.get("seen_" + d.id)).length;
  return `<nav class="bottom-nav">${it("home", "🏠", "Learn", "")}${it("games", "🎮", "Games", "games")}${it("ask", "💬", "Ask Ma'am" + (unread ? ` <em class="dot">${unread}</em>` : ""), "ask")}${it("badges", "🏅", "Badges", "badges")}${it("progress", myAvatar(), "Me", "progress")}</nav>`;
}
function header(title, back) {
  const s = S.session;
  return `<header class="topbar">
    ${back ? `<button class="icon-btn" onclick="${back}" aria-label="Back">←</button>` : `<div class="brand-mini">${teacherAvatar(36)}</div>`}
    <div class="topbar-title">${title}</div>
    ${s ? `<button class="logout-btn" onclick="doLogout()" aria-label="Log out">Log out</button>` : ""}
  </header>${S.db && S.db.mode === "demo" ? `<div class="demo-bar">Demo mode · saved on this device only</div>` : ""}`;
}
function langToggle() {
  const b = (v, l) => `<button class="seg ${S.lang === v ? "on" : ""}" onclick="setLang('${v}')">${l}</button>`;
  return `<div class="segwrap">${b("en", "English")}${b("hi", "हिंदी")}${b("both", "Both / दोनों")}</div>`;
}
window.setLang = (v) => { S.lang = v; localStorage.setItem("lpg_lang", v); route(); };
function bi(obj, cls = "") {
  const en = S.lang !== "hi", hi = S.lang !== "en";
  const sp = (t, l) => `<button class="say" data-say="${esc(t)}" data-lang="${l}" onclick="speakBtn(this)" aria-label="Read aloud">🔊</button>`;
  return `<div class="bi ${cls} ${S.lang === "both" ? "both" : ""}">
    ${en && obj.en ? `<div class="en">${esc(obj.en)} ${sp(obj.en, "en")}</div>` : ""}
    ${hi && obj.hi ? `<div class="hi" lang="hi">${esc(obj.hi)} ${sp(obj.hi, "hi")}</div>` : ""}
  </div>`;
}

/* ===================== ROUTER ===================== */
function go(h) { location.hash = h; }
window.go = go;
window.addEventListener("hashchange", () => route());
async function route() {
  window.scrollTo(0, 0);
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  const h = location.hash.slice(1) || "";
  const [page, a, b] = h.split("/");
  if (page === "install") return renderInstall();
  if (page === "privacy") return renderPrivacy();
  if (!S.session) return renderLogin();
  if (S.session.role === "admin") {
    if (page === "lesson") return renderLesson(a, true);
    if (page === "ws") return renderWorksheet(a, b, true);
    if (page === "admin" && a === "report") return renderReport(b);
    return renderAdmin(page === "admin" ? a || "dashboard" : "dashboard");
  }
  if (page === "lesson") return renderLesson(a);
  if (page === "ws") return renderWorksheet(a, b);
  if (page === "progress") return renderProgress();
  if (page === "ask") return renderAsk(a);
  if (page === "games") return renderGames();
  if (page === "quiz") return renderQuickQuiz(+a || null);
  if (page === "match") return renderMatch(a);
  if (page === "sentence") return renderSentence();
  if (page === "spell") return renderSpell();
  if (page === "speak") return renderSpeak();
  if (page === "badges") return renderBadges();
  if (page === "certificate") return renderCertificate(+a);
  return renderHome();
}

/* ===================== LOGIN ===================== */
function renderLogin(tab = "student") {
  const demo = S.db.mode === "demo";
  app().innerHTML = `
  <div class="login">
    <div class="login-hero">
      ${teacherAvatar(130)}
      <h1>Learn from<br><span>Pallavi Gupta</span></h1>
      <p class="producer">Created &amp; taught by <b>Pallavi Gupta</b> · <span lang="hi">पल्लवी गुप्ता द्वारा</span></p>
      <p class="sub">English Grammar · Class 1 to 5<br><span lang="hi">अंग्रेज़ी व्याकरण — हिंदी और अंग्रेज़ी में</span></p>
      ${S.settings.welcome ? `<p class="welcome">${esc(S.settings.welcome)}</p>` : ""}
    </div>
    ${isInstalled() ? "" : `<button class="install-cta" onclick="doInstall()"><img src="icons/icon-192.png" alt=""><span><b>Install App</b><small>${DEV.ios ? "iPhone / iPad" : DEV.android ? "Android · one tap" : "Android & iPhone"} · ऐप इंस्टॉल करें</small></span><i>📲</i></button>`}
    <div class="card login-card">
      <div class="tabs">
        <button class="tab ${tab === "student" ? "on" : ""}" onclick="renderLogin('student')">🎒 Student</button>
        <button class="tab ${tab === "admin" ? "on" : ""}" onclick="renderLogin('admin')">🔐 Admin</button>
      </div>
      <form id="loginForm" autocomplete="on">
        ${tab === "student" ? `
          <label>Login ID <span lang="hi">/ लॉगिन आईडी</span><input name="id" required autocapitalize="none" autocomplete="username" placeholder="e.g. riya4"></label>
          <label>Password <span lang="hi">/ पासवर्ड</span><input name="pw" type="password" required autocomplete="current-password"></label>`
      : `${demo ? "" : `<label>Admin email<input name="email" type="email" required autocomplete="username" value="${esc(window.ADMIN_EMAIL || "")}"></label>`}
          <label>Admin password<input name="pw" type="password" required autocomplete="current-password"></label>
          ${demo && S.settings.adminPassword === "admin123" ? `<p class="hint">Demo admin password: <b>admin123</b> (change it in Settings)</p>` : ""}`}
        <div class="err" id="loginErr"></div>
        <button class="btn primary big" type="submit">Log in <span lang="hi">/ लॉगिन करें</span></button>
      </form>
      ${tab === "student" ? `<p class="hint center">Don't have an ID or forgot your password? <span lang="hi">आईडी नहीं है या पासवर्ड भूल गए?</span><br>${S.settings.phone ? `<a class="btn ghost sm" target="_blank" rel="noopener" href="${waLink(S.settings.phone, "Namaste Ma'am, I need help with my Learn from Pallavi Gupta login.")}">💬 Message Pallavi Ma'am on WhatsApp</a>` : "Ask your teacher."}</p>` : ""}
    </div>
    <p class="credit">© ${new Date().getFullYear()} Learn from Pallavi Gupta · Produced by Pallavi Gupta<br><a href="#privacy">Privacy Policy</a> · <a href="#install">Install App</a> · v${APP_VERSION}</p>
  </div>`;
  $("#loginForm").onsubmit = async (e) => {
    e.preventDefault(); const f = new FormData(e.target); const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true; $("#loginErr").textContent = "";
    try {
      S.session = tab === "student" ? await S.db.studentLogin(f.get("id"), f.get("pw")) : await S.db.adminLogin(f.get("email") || "", f.get("pw"));
      await loadData(); go(S.session.role === "admin" ? "admin/dashboard" : ""); route();
    } catch (err) { $("#loginErr").textContent = friendly(err); btn.disabled = false; }
  };
}
window.renderLogin = renderLogin;
window.doLogout = async () => { if (!confirm("Log out?")) return; await S.db.logout(); S.session = null; S.viewCls = null; S.results = []; S.doubts = []; go(""); route(); };

async function loadData() {
  try { S.worksheets = await S.db.listWorksheets(); } catch { S.worksheets = []; }
  try { S.notices = await S.db.listNotices(); } catch { S.notices = []; }
  if (S.session && S.session.role === "student") { try { S.doubts = await S.db.listDoubts(S.session.id); } catch { S.doubts = []; } }
  try { mergeLessons(await S.db.listLessons()); } catch { }
  if (S.session && S.session.role === "student") { try { S.results = await S.db.myResults(S.session.id); } catch { S.results = []; } }
}

/* ===================== STUDENT HOME ===================== */
function bestScore(topicId) {
  const rs = S.results.filter(r => r.topicId === topicId && r.total);
  if (!rs.length) return null;
  return Math.max(...rs.map(r => Math.round(r.score / r.total * 100)));
}
function stars(p) { if (p == null) return ""; const n = p >= 90 ? 3 : p >= 60 ? 2 : p > 0 ? 1 : 0; return `<span class="stars">${"★".repeat(n)}${"☆".repeat(3 - n)}</span>`; }

function homeTopicArea() {
  const s = S.session; const cls = S.viewCls || s.cls || 1;
  const q = S.search.trim().toLowerCase();
  const topics = q ? LESSONS.filter(l => (l.title.en + " " + l.title.hi).toLowerCase().includes(q)) : LESSONS.filter(l => l.cls == cls);
  const classTopics = LESSONS.filter(l => l.cls == cls);
  const done = classTopics.filter(t => bestScore(t.id) != null).length;
  const extra = S.worksheets.filter(w => w.cls == cls).length;
  return `${q ? `<p class="hint">Results in all classes for “${esc(S.search)}”</p>` : `
    <div class="class-row">${CLASSES.map(c => `<button class="cls-chip ${c == cls ? "on" : ""}" onclick="S.viewCls=${c};renderHome()">Class ${ordinal(c)}${c == s.cls ? " ⭐" : ""}</button>`).join("")}</div>
    <div class="progress-strip"><div class="bar"><i style="width:${classTopics.length ? done / classTopics.length * 100 : 0}%"></i></div><span>${done}/${classTopics.length} topics practised${extra ? ` · ${extra} teacher worksheet${extra > 1 ? "s" : ""}` : ""}</span></div>`}
    <div class="grid">${topics.map((t, i) => {
      const b = bestScore(t.id); const n = S.worksheets.filter(w => w.topicId === t.id).length;
      return `<button class="topic" onclick="go('lesson/${t.id}')" style="--h:${(i * 47 + t.cls * 60) % 360}">
        <div class="t-icon">${t.icon}</div>
        <div class="t-body"><b>${esc(t.title.en)}</b><span lang="hi">${esc(t.title.hi)}</span>
        <small>${q ? `Class ${t.cls} · ` : ""}${b != null ? stars(b) + " " + b + "%" : "Not started"}${n ? ` · +${n} worksheet${n > 1 ? "s" : ""}` : ""}</small></div>
      </button>`;
    }).join("") || `<p class="hint">No topic found.</p>`}</div>`;
}
function renderHome() {
  const s = S.session; const cls = S.viewCls || s.cls || 1;
  const q = S.search.trim().toLowerCase();
  const topics = q ? LESSONS.filter(l => (l.title.en + " " + l.title.hi).toLowerCase().includes(q)) : LESSONS.filter(l => l.cls == cls);
  const classTopics = LESSONS.filter(l => l.cls == cls);
  const done = classTopics.filter(t => bestScore(t.id) != null).length;
  const extra = S.worksheets.filter(w => w.cls == cls).length;
  const notices = S.notices.filter(n => !n.cls || n.cls == s.cls).slice(0, 5);
  const streak = calcStreak(); const wd = wordOfDay();
  app().innerHTML = header("Learn from Pallavi Gupta") + `
  <main class="wrap has-nav">
    ${installBar()}
    <section class="hello">
      <div><h2>Hello, ${esc(s.name.split(" ")[0])}! 👋</h2>
      <p lang="hi">नमस्ते! आज क्या सीखें?</p></div>
      <div class="streak ${streak ? "hot" : ""}" title="Days in a row">🔥 ${streak}<small>day${streak === 1 ? "" : "s"}</small></div>
    </section>
    ${notices.length ? `<section class="notices">${notices.map(n => { const t = LESSONS.find(l => l.id === n.topicId); return `<div class="notice ${n.kind === "homework" ? "hw" : ""}">
      <div class="n-tag">${n.kind === "homework" ? "📚 Homework" : "📢 Notice"}${n.due ? ` · Due ${esc(new Date(n.due).toLocaleDateString("en-IN", { day: "numeric", month: "short" }))}` : ""}</div>
      <div>${esc(n.text)}</div>${t ? `<button class="btn sm primary" onclick="go('lesson/${t.id}')">Open: ${esc(t.title.en)} →</button>` : ""}</div>`; }).join("")}</section>` : ""}
    <section class="card word">
      <div class="w-tag">✨ Word of the Day <span lang="hi">आज का शब्द</span></div>
      <div class="w-main"><b>${esc(wd.w)}</b> <span lang="hi">${esc(wd.hi)}</span>
        <button class="say-inline" data-say="${esc(wd.w + ". " + wd.m + ". " + wd.ex)}" data-lang="en" onclick="speakBtn(this)">🔊</button></div>
      <div class="w-m">${esc(wd.m)}</div><div class="w-ex">“${esc(wd.ex)}”</div>
    </section>
    <input class="search" type="search" placeholder="🔍 Search a topic… (e.g. noun, tense, संज्ञा)" value="${esc(S.search)}" oninput="S.search=this.value;updateSearch()">
    <div id="topicArea">${homeTopicArea()}</div>
    ${q ? "" : `<button class="card game-cta" onclick="go('quiz/${cls}')"><span>⚡</span><div><b>Quick Quiz — Class ${ordinal(cls)}</b><small>10 mixed questions from all topics · बिजली क्विज़</small></div><span>→</span></button>`}
    ${producerCard()}
  </main>` + bottomNav("home");
}
window.updateSearch = () => { const el = $("#topicArea"); if (el) el.innerHTML = homeTopicArea(); };
window.renderHome = renderHome;
function producerCard() {
  const p = S.settings.photo || DEFAULT_PHOTO;
  return `<section class="card producer-card">
    <img src="${p}" alt="Pallavi Gupta">
    <div><small>App producer &amp; teacher</small><h3>Pallavi Gupta</h3>
    <p>Every lesson in this app is explained by me in simple English and Hindi. Practise daily and collect your stars! ⭐</p>
    <p lang="hi">इस ऐप का हर पाठ आसान अंग्रेज़ी और हिंदी में समझाया गया है। रोज़ अभ्यास करो और स्टार जीतो!</p></div>
  </section>`;
}
window.S = S;

/* ===================== LESSON ===================== */
function renderLesson(id, adminView = false) {
  const t = LESSONS.find(l => l.id === id); if (!t) return go("");
  const teacherWs = S.worksheets.filter(w => w.topicId === id);
  const back = adminView ? "go('admin/content')" : "go('')";
  app().innerHTML = header(`Class ${ordinal(t.cls)}`, back) + `
  <main class="wrap lesson">
    <div class="lesson-head"><div class="big-icon">${t.icon}</div>
      <div><h2>${esc(t.title.en)}</h2><p class="hi-title" lang="hi">${esc(t.title.hi)}</p></div></div>
    ${langToggle()}
    <section class="card"><h3>📖 What is it? <span lang="hi">यह क्या है?</span></h3>${bi(t.intro)}</section>
    ${t.points.length ? `<section class="card"><h3>📌 Rules & Points <span lang="hi">नियम</span></h3>
      <ol class="points">${t.points.map(p => `<li>${bi(p)}</li>`).join("")}</ol></section>` : ""}
    ${t.examples.length ? `<section class="card examples"><h3>✏️ Examples <span lang="hi">उदाहरण</span></h3>
      ${t.examples.map(e => `<div class="ex">${bi(e)}</div>`).join("")}</section>` : ""}
    ${t.tip && (t.tip.en || t.tip.hi) ? `<section class="card tip"><h3>💡 Pallavi Ma'am's Tip <span lang="hi">टिप</span></h3>${bi(t.tip)}</section>` : ""}
    <section class="card"><h3>📝 Worksheets <span lang="hi">अभ्यास पत्र</span></h3>
      <div class="ws-list">
        ${t.ws.length ? `<button class="ws-item" onclick="go('ws/${t.id}/builtin')"><span>🧩</span><div><b>Practice Worksheet</b><small>${t.ws.length} questions · auto-checked</small></div>${stars(bestScoreFor(t.id, "builtin"))}</button>` : ""}
        ${teacherWs.map(w => `<button class="ws-item teacher" onclick="go('ws/${t.id}/${w.id}')"><span>👩‍🏫</span><div><b>${esc(w.title)}</b><small>By Pallavi Ma'am${w.questions && w.questions.length ? ` · ${w.questions.length} questions` : ""}${w.link ? " · 📎 file" : ""}${w.image ? " · 🖼 sheet" : ""}</small></div>${stars(bestScoreFor(t.id, w.id))}</button>`).join("")}
      </div>
    </section>
    ${adminView ? "" : `<button class="card ask-cta" onclick="go('ask/${t.id}')"><span>💬</span><div><b>Have a doubt about this topic?</b><small>Ask Pallavi Ma'am — <span lang="hi">मैम से पूछें</span></small></div><span>→</span></button>`}
    ${(() => { const list = LESSONS.filter(l => l.cls === t.cls); const i = list.findIndex(l => l.id === t.id); const pv = list[i - 1], nx = list[i + 1];
      return `<div class="lesson-nav">${pv ? `<button class="btn ghost" onclick="go('lesson/${pv.id}')">← ${esc(pv.title.en)}</button>` : "<span></span>"}${nx ? `<button class="btn primary" onclick="go('lesson/${nx.id}')">${esc(nx.title.en)} →</button>` : ""}</div>`; })()}
  </main>`;
}
function bestScoreFor(topicId, wsId) {
  const rs = S.results.filter(r => r.topicId === topicId && r.wsId === wsId && r.total);
  return rs.length ? Math.max(...rs.map(r => Math.round(r.score / r.total * 100))) : null;
}

/* ===================== WORKSHEET ===================== */
function qHtml(q, i) {
  return `<div class="card q" data-i="${i}">
    <div class="qn">Q${i + 1}. ${esc(q.q)}</div>
    ${q.t === "mcq" ? `<div class="opts">${q.o.map((o, j) => `<label class="opt"><input type="radio" name="q${i}" value="${j}"><span>${esc(o)}</span></label>`).join("")}</div>`
      : q.t === "tf" ? `<div class="opts two"><label class="opt"><input type="radio" name="q${i}" value="true"><span>True ✔</span></label><label class="opt"><input type="radio" name="q${i}" value="false"><span>False ✘</span></label></div>`
        : `<input class="fill" name="q${i}" autocomplete="off" autocapitalize="none" placeholder="Type your answer / उत्तर लिखें">`}
    <div class="fb"></div></div>`;
}
function gradeQs(f, qs) {
  let score = 0; const fd = new FormData(f);
  qs.forEach((q, i) => {
    const v = fd.get("q" + i); const box = $(`.q[data-i="${i}"]`, f); let ok = false, right = "";
    if (q.t === "mcq") { ok = v !== null && +v === q.a; right = q.o[q.a]; }
    else if (q.t === "tf") { ok = v !== null && (v === "true") === q.a; right = q.a ? "True" : "False"; }
    else { const ans = [].concat(q.a); ok = ans.some(a => norm(a) === norm(v)); right = ans[0]; }
    if (ok) score++;
    box.classList.remove("right", "wrong"); box.classList.add(ok ? "right" : "wrong");
    $(".fb", box).innerHTML = ok ? "✅ Correct! <span lang='hi'>सही!</span>" : `❌ Correct answer: <b>${esc(right)}</b>`;
  });
  return score;
}
function scoreCard(score, total, buttons, extra = "") {
  const pct = Math.round(score / total * 100);
  const msg = pct === 100 ? ["Excellent! Perfect score!", "शाबाश! सारे उत्तर सही!"] : pct >= 60 ? ["Well done! Keep practising.", "बहुत अच्छे! अभ्यास जारी रखो।"] : ["Good try! Read the lesson again and retry.", "अच्छी कोशिश! पाठ दोबारा पढ़कर फिर से करो।"];
  if (pct === 100) confetti();
  return `<div class="card score ${pct >= 60 ? "good" : "low"}"><div class="big">${score} / ${total}</div>${stars(pct)}<p>${msg[0]}<br><span lang="hi">${msg[1]}</span></p>${extra}<div class="row">${buttons}</div></div>`;
}
async function saveRes(r) {
  const before = earnedBadges().map(b => b.id);
  try { await S.db.saveResult(r); S.results.unshift({ ...r, at: Date.now() }); }
  catch (err) { toast("Score not saved: " + err.message, "bad"); return; }
  const fresh = earnedBadges().filter(b => !before.includes(b.id));
  if (fresh.length) setTimeout(() => { confetti(); modal(`<div class="center"><div style="font-size:3.5rem">${fresh[0].icon}</div><h3>New badge: ${esc(fresh[0].name)}!</h3><p>${esc(fresh[0].desc)}</p><p lang="hi">${esc(fresh[0].hi)}</p></div>`); }, 900);
}
function renderWorksheet(topicId, wsId, preview = false) {
  const t = LESSONS.find(l => l.id === topicId); if (!t) return go("");
  const w = wsId === "builtin" ? { title: "Practice Worksheet", questions: t.ws, instructions: "Choose or write the correct answer. / सही उत्तर चुनें या लिखें।" } : S.worksheets.find(x => x.id === wsId);
  if (!w) return go("lesson/" + topicId);
  const qs = w.questions || [];
  app().innerHTML = header(preview ? "Worksheet preview" : "Worksheet", preview ? (wsId === "builtin" ? `go('lesson/${topicId}')` : "go('admin/worksheets')") : `go('lesson/${topicId}')`) + `
  <main class="wrap ws">
    <div class="ws-head card">
      <div class="ws-brand">${teacherAvatar(44)}<div><b>Learn from Pallavi Gupta</b><small>Class ${ordinal(t.cls)} · ${esc(t.title.en)}</small></div></div>
      <h2>${esc(w.title)}</h2>
      ${w.instructions ? `<p class="instr">${esc(w.instructions)}</p>` : ""}
      <div class="print-only namebox">Name: ____________________ &nbsp; Date: __________ &nbsp; Score: ____ / ${qs.length}</div>
      <div class="ws-actions no-print">
        <button class="btn ghost" onclick="window.print()">🖨 Print</button>
        ${w.link ? `<a class="btn ghost" href="${esc(w.link)}" target="_blank" rel="noopener">📎 Open file</a>` : ""}
      </div>
    </div>
    ${w.image ? `<div class="card"><img class="ws-img" src="${w.image}" alt="Worksheet"></div>` : ""}
    ${qs.length ? `<form id="wsForm">
      ${qs.map(qHtml).join("")}
      <button class="btn primary big no-print" type="submit">Check my answers ✅ <span lang="hi">/ जाँचें</span></button>
    </form>
    <div id="scoreBox"></div>` : `<p class="hint center">Do this worksheet on paper and show it to your teacher. <span lang="hi">यह अभ्यास कॉपी में करें।</span></p>`}
  </main>`;
  const f = $("#wsForm"); if (!f) return;
  f.onsubmit = async (e) => {
    e.preventDefault(); const score = gradeQs(f, qs); const pct = Math.round(score / qs.length * 100);
    $("#scoreBox").innerHTML = scoreCard(score, qs.length, `<button class="btn ghost" onclick="renderWorksheet('${topicId}','${wsId}',${preview})">🔁 Try again</button><button class="btn primary" onclick="go('lesson/${topicId}')">Back to lesson</button>`);
    $("#scoreBox").scrollIntoView({ behavior: "smooth" });
    f.querySelector("button[type=submit]").style.display = "none";
    if (preview) return;
    const r = { studentId: S.session.id, studentName: S.session.name, cls: t.cls, topicId, topicTitle: t.title.en, wsId, wsTitle: w.title, score, total: qs.length };
    await saveRes(r);
  };
}
window.renderWorksheet = renderWorksheet;

function renderProgress() {
  const st = S.session; const rs = [...S.results].sort((a, b) => b.at - a.at);
  const avg = rs.length ? Math.round(rs.reduce((s, r) => s + r.score / r.total, 0) / rs.length * 100) : 0;
  const size = PREF.get("size", "m");
  const cls = st.cls; const ts = LESSONS.filter(l => l.cls == cls); const passed = ts.filter(t => (bestScore(t.id) ?? 0) >= 60).length;
  app().innerHTML = header("Me") + `<main class="wrap has-nav">
    <section class="card me-card">
      <button class="me-av" onclick="pickAvatar()" title="Change picture">${myAvatar()}<i>✏️</i></button>
      <div><h2>${esc(st.name)}</h2><p>Class ${ordinal(cls)} · ID <code>${esc(st.id)}</code></p>
      <div class="progress-strip"><div class="bar"><i style="width:${ts.length ? passed / ts.length * 100 : 0}%"></i></div><span>${passed}/${ts.length} passed</span></div></div>
    </section>
    <div class="stats">
      <div class="stat"><b>${rs.length}</b><span>Worksheets & games</span></div>
      <div class="stat"><b>${avg}%</b><span>Average score</span></div>
      <div class="stat"><b>🔥 ${calcStreak()}</b><span>Day streak</span></div>
    </div>
    <div class="card"><h3>🔤 Text size <span lang="hi">अक्षरों का आकार</span></h3>
      <div class="segwrap">${[["s", "A", ".85rem"], ["m", "A", "1rem"], ["l", "A", "1.2rem"], ["xl", "A", "1.4rem"]].map(([k, l, f]) => `<button class="seg ${size === k ? "on" : ""}" style="font-size:${f}" onclick="setSize('${k}')">${l}</button>`).join("")}</div></div>
    <div class="card"><h3>📈 Recent work <span lang="hi">हाल का काम</span></h3>
    ${rs.length ? `<div class="tbl-wrap"><table class="tbl"><tr><th>Topic</th><th>Score</th><th>When</th></tr>${rs.slice(0, 30).map(r => `<tr><td>${esc(r.topicTitle)}<small>${esc(r.wsTitle)}</small></td><td class="${pctOf(r) >= .6 ? "ok" : "lo"}">${r.score}/${r.total}</td><td>${fmtDate(r.at)}</td></tr>`).join("")}</table></div>` : `<p class="hint">No worksheets yet. Open a topic and try its worksheet!</p>`}
    </div>
    <div class="card menu-list">
      <button onclick="go('badges')">🏅 My badges & certificate<span>→</span></button>
      <button onclick="go('ask')">💬 My questions to Ma'am<span>→</span></button>
      ${S.settings.phone ? `<a target="_blank" rel="noopener" href="${waLink(S.settings.phone, `Namaste Ma'am, this is ${st.name} (Class ${cls}).`)}">📞 Contact Pallavi Ma'am (WhatsApp)<span>→</span></a>` : ""}
      ${isInstalled() ? "" : `<button onclick="go('install')">📲 Install the app<span>→</span></button>`}
      <button onclick="shareApp()">📤 Share app with friends<span>→</span></button>
      <button onclick="go('privacy')">🔒 Privacy Policy<span>→</span></button>
      <button class="danger-t" onclick="doLogout()">⎋ Log out<span></span></button>
    </div>
    <p class="credit">Learn from Pallavi Gupta · v${APP_VERSION}</p>
  </main>` + bottomNav("progress");
}
window.setSize = (k) => { PREF.set("size", k); applyTextSize(); renderProgress(); };
window.pickAvatar = () => {
  modal(`<h3>Choose your picture <span lang="hi">अपनी तस्वीर चुनो</span></h3><div class="av-grid">${AVATARS.map(a => `<button onclick="setAvatar('${a}')">${a}</button>`).join("")}</div>`);
};
window.setAvatar = (a) => { PREF.set("avatar_" + S.session.id, a); $$(".modal").forEach(m => m.remove()); renderProgress(); };

/* ===================== ASK MA'AM (doubts) ===================== */
async function renderAsk(topicId) {
  const st = S.session;
  try { S.doubts = await S.db.listDoubts(st.id); } catch { }
  const mine = [...(S.doubts || [])].sort((a, b) => b.at - a.at);
  mine.forEach(d => { if (d.answer) PREF.set("seen_" + d.id, "1"); });
  const opts = LESSONS.filter(l => l.cls == st.cls).map(l => `<option value="${l.id}" ${l.id === topicId ? "selected" : ""}>${esc(l.title.en)}</option>`).join("");
  app().innerHTML = header("Ask Pallavi Ma'am") + `<main class="wrap has-nav">
    <div class="card ask-head">${teacherAvatar(56)}<div><b>Ask your doubt</b><small>Write in English or Hindi. Ma'am will reply here. <span lang="hi">अपना सवाल लिखो, मैम यहीं जवाब देंगी।</span></small></div></div>
    <form id="askF" class="card">
      <label>Topic<select name="topicId"><option value="">— General question —</option>${opts}</select></label>
      <label>Your question <span lang="hi">/ आपका सवाल</span><textarea name="text" rows="3" required maxlength="600" placeholder="e.g. When do we use 'an' before 'h'?"></textarea></label>
      <button class="btn primary big" type="submit">Send to Ma'am 📨</button>
    </form>
    <h3>My questions (${mine.length})</h3>
    ${mine.length ? mine.map(d => `<div class="card doubt ${d.answer ? "answered" : ""}">
      <div class="d-meta">${d.topicTitle ? esc(d.topicTitle) + " · " : ""}${fmtDate(d.at)}</div>
      <div class="d-q">❓ ${esc(d.text)}</div>
      ${d.answer ? `<div class="d-a"><div class="d-who">${teacherAvatar(28)}<b>Pallavi Ma'am</b><small>${fmtDate(d.answeredAt)}</small></div>${esc(d.answer)}</div>` : `<div class="d-wait">⏳ Waiting for Ma'am's reply</div>`}
    </div>`).join("") : `<p class="hint">No questions yet. Don't be shy — ask anything! <span lang="hi">कोई भी सवाल पूछो!</span></p>`}
  </main>` + bottomNav("ask");
  $("#askF").onsubmit = async (e) => {
    e.preventDefault(); const f = new FormData(e.target); const btn = e.target.querySelector("[type=submit]"); btn.disabled = true;
    const t = LESSONS.find(l => l.id === f.get("topicId"));
    try {
      await S.db.addDoubt({ studentId: st.id, studentName: st.name, cls: st.cls, topicId: t ? t.id : "", topicTitle: t ? t.title.en : "", text: f.get("text").trim(), answer: "" });
      toast("Sent! Ma'am will reply soon 😊", "good"); renderAsk();
    } catch (err) { toast(err, "bad"); btn.disabled = false; }
  };
}

/* ===================== PRIVACY ===================== */
function renderPrivacy() {
  app().innerHTML = header("Privacy Policy", S.session ? "history.back()" : "go('')") + `<main class="wrap"><div class="card legal">
    <h2>Privacy Policy</h2><p class="hint">Learn from Pallavi Gupta · Last updated: ${new Date(2026, 10, 19).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
    <p>This app is an English grammar learning app for students of Class 1 to 5, run by Pallavi Gupta (the teacher). We care about children's privacy and collect only what is needed for learning.</p>
    <h3>What we collect</h3><ul>
      <li><b>Student account:</b> name, class, login ID and password. These are created by the teacher. Students cannot sign up themselves.</li>
      <li><b>Learning activity:</b> worksheet and game scores, with the date and time, so students and the teacher can see progress.</li>
      <li><b>Questions to the teacher:</b> doubts that students send in the app, and the teacher's replies.</li>
      <li><b>Parent phone number (optional):</b> added by the teacher only to share login details or report cards on WhatsApp.</li></ul>
    <h3>What we do NOT collect</h3><ul><li>No location, contacts, photos or files from the phone.</li><li>No advertising and no tracking for ads.</li><li>We do not sell or share data with anyone.</li></ul>
    <h3>Microphone</h3><p>The optional "Speak English" game uses the phone's built-in speech recognition only while the 🎤 button is pressed. Nothing is recorded or stored by the app.</p>
    <h3>Where data is stored</h3><p>Data is stored securely in Google Firebase (or only on the device in demo mode). Only the teacher can see all students' data. Each student can see only their own.</p>
    <h3>Deleting data</h3><p>Parents can ask the teacher at any time to delete a student's account and data.</p>
    <h3>Contact</h3><p>Pallavi Gupta${S.settings.phone ? ` · WhatsApp: <a target="_blank" rel="noopener" href="${waLink(S.settings.phone, "Privacy question about Learn from Pallavi Gupta app")}">message the teacher</a>` : ""}</p>
    <p lang="hi" class="hint">यह ऐप बच्चों की निजता का ध्यान रखता है। हम केवल पढ़ाई के लिए ज़रूरी जानकारी रखते हैं, कोई विज्ञापन नहीं दिखाते और किसी के साथ डेटा साझा नहीं करते।</p>
  </div></main>`;
}

/* ===================== STREAK, WORD, BADGES ===================== */
const dayKey = (t) => { const d = new Date(t); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); };
function calcStreak() {
  const days = new Set(S.results.map(r => dayKey(r.at))); let n = 0; const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function wordOfDay() { const W = window.WORDS || [{ w: "Learn", hi: "सीखना", m: "To get knowledge", ex: "We learn every day." }]; return W[Math.floor(Date.now() / 864e5) % W.length]; }
function classComplete(cls) { const ts = LESSONS.filter(l => l.cls == cls); return ts.length && ts.every(t => (bestScore(t.id) ?? 0) >= 60); }
function earnedBadges() { return BADGES.filter(b => b.test()); }
const pctOf = (r) => r.total ? r.score / r.total : 0;
const BADGES = [
  { id: "first", icon: "🌱", name: "First Step", desc: "Finished your first worksheet", hi: "पहला अभ्यास पूरा किया", test: () => S.results.length >= 1 },
  { id: "perfect", icon: "💯", name: "Perfect Score", desc: "Got 100% in a worksheet", hi: "किसी अभ्यास में 100% अंक", test: () => S.results.some(r => pctOf(r) === 1) },
  { id: "perfect5", icon: "🎯", name: "Sharp Shooter", desc: "5 perfect scores", hi: "5 बार 100% अंक", test: () => S.results.filter(r => pctOf(r) === 1).length >= 5 },
  { id: "ws10", icon: "📘", name: "Hard Worker", desc: "Completed 10 worksheets", hi: "10 अभ्यास पूरे किए", test: () => S.results.length >= 10 },
  { id: "ws25", icon: "📚", name: "Grammar Star", desc: "Completed 25 worksheets", hi: "25 अभ्यास पूरे किए", test: () => S.results.length >= 25 },
  { id: "streak3", icon: "🔥", name: "On Fire", desc: "Practised 3 days in a row", hi: "लगातार 3 दिन अभ्यास", test: () => calcStreak() >= 3 },
  { id: "streak7", icon: "🏆", name: "Week Champion", desc: "Practised 7 days in a row", hi: "लगातार 7 दिन अभ्यास", test: () => calcStreak() >= 7 },
  { id: "quiz", icon: "⚡", name: "Quiz Master", desc: "Scored 80%+ in a Quick Quiz", hi: "क्विक क्विज़ में 80%+", test: () => S.results.some(r => r.topicId === "quick-quiz" && pctOf(r) >= .8) },
  { id: "match", icon: "🧩", name: "Matchmaker", desc: "Finished a matching game", hi: "जोड़ी मिलाओ खेल पूरा किया", test: () => S.results.some(r => r.topicId === "match-game") },
  { id: "allgames", icon: "🎮", name: "Game Hero", desc: "Played every matching game", hi: "सारे खेल खेले", test: () => (window.MATCH_SETS || []).every(m => S.results.some(r => r.wsId === "match-" + m.id)) },
  { id: "builder", icon: "🧱", name: "Sentence Builder", desc: "Built 4+ sentences right in one game", hi: "एक खेल में 4+ वाक्य सही बनाए", test: () => S.results.some(r => r.topicId === "sentence-game" && r.score >= 4) },
  { id: "speller", icon: "🐝", name: "Spelling Champ", desc: "6+ correct spellings in Spelling Bee", hi: "स्पेलिंग बी में 6+ सही", test: () => S.results.some(r => r.topicId === "spelling-game" && r.score >= 6) },
  { id: "speaker", icon: "🎤", name: "Confident Speaker", desc: "Finished a Speak English game", hi: "बोलकर अभ्यास पूरा किया", test: () => S.results.some(r => r.topicId === "speak-game") },
  { id: "class", icon: "🎓", name: "Class Champion", desc: "60%+ in every topic of your class — certificate unlocked!", hi: "अपनी कक्षा के हर पाठ में 60%+ — प्रमाणपत्र!", test: () => classComplete(S.session.cls) },
];
function renderBadges() {
  const got = earnedBadges().map(b => b.id); const cls = S.session.cls;
  const ts = LESSONS.filter(l => l.cls == cls); const passed = ts.filter(t => (bestScore(t.id) ?? 0) >= 60).length;
  app().innerHTML = header("My Badges") + `<main class="wrap has-nav">
    <div class="stats"><div class="stat"><b>${got.length}/${BADGES.length}</b><span>Badges</span></div><div class="stat"><b>🔥 ${calcStreak()}</b><span>Day streak</span></div><div class="stat"><b>${S.results.length}</b><span>Worksheets</span></div></div>
    <div class="badge-grid">${BADGES.map(b => `<div class="badge ${got.includes(b.id) ? "got" : ""}"><div class="b-icon">${got.includes(b.id) ? b.icon : "🔒"}</div><b>${esc(b.name)}</b><small>${esc(b.desc)}</small><small lang="hi">${esc(b.hi)}</small></div>`).join("")}</div>
    <div class="card cert-cta"><h3>🎓 Class ${ordinal(cls)} Certificate</h3>
      <p>Score 60% or more in every topic of your class to unlock your certificate from Pallavi Ma'am.</p>
      <div class="progress-strip"><div class="bar"><i style="width:${ts.length ? passed / ts.length * 100 : 0}%"></i></div><span>${passed}/${ts.length}</span></div>
      ${passed === ts.length && ts.length ? `<button class="btn primary big" onclick="go('certificate/${cls}')">View & print certificate 🎉</button>` : `<p class="hint">Topics still to pass: ${ts.filter(t => (bestScore(t.id) ?? 0) < 60).map(t => esc(t.title.en)).join(", ")}</p>`}
    </div></main>` + bottomNav("badges");
}
function renderCertificate(cls) {
  if (!classComplete(cls)) return go("badges");
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const ts = LESSONS.filter(l => l.cls == cls);
  const avg = Math.round(ts.reduce((a, t) => a + (bestScore(t.id) || 0), 0) / ts.length);
  app().innerHTML = header("Certificate", "go('badges')") + `<main class="wrap">
    <div class="cert">
      <div class="cert-in">
        <div class="cert-top">${teacherAvatar(80)}<div><b>Learn from Pallavi Gupta</b><small>English Grammar Academy</small></div></div>
        <h1>Certificate of Achievement</h1><p class="hi-c" lang="hi">उपलब्धि प्रमाणपत्र</p>
        <p>This is proudly presented to</p>
        <div class="cert-name">${esc(S.session.name)}</div>
        <p>for successfully completing <b>English Grammar – Class ${ordinal(cls)}</b><br>(${ts.length} topics, average best score ${avg}%)</p>
        <div class="cert-foot"><div><span class="sig">Pallavi Gupta</span><small>Pallavi Gupta · Teacher</small></div><div class="seal">🏅</div><div><span class="sig2">${today}</span><small>Date</small></div></div>
      </div>
    </div>
    <div class="row no-print" style="justify-content:center"><button class="btn primary" onclick="window.print()">🖨 Print / Save as PDF</button></div>
  </main>`;
  confetti();
}

/* ===================== GAMES ===================== */
function renderGames() {
  const cls = S.viewCls || S.session.cls;
  const best = (wsId) => { const r = S.results.filter(x => x.wsId === wsId); return r.length ? Math.max(...r.map(x => Math.round(pctOf(x) * 100))) : null; };
  app().innerHTML = header("Games Zone") + `<main class="wrap has-nav">
    <h2>🎮 Play & Learn <span class="muted-h" lang="hi">खेल-खेल में सीखो</span></h2>
    <button class="card game-cta big-cta" onclick="go('quiz/${cls}')"><span>⚡</span><div><b>Quick Quiz</b><small>10 random questions from Class ${ordinal(cls)} · against the clock</small></div>${stars(best("quiz-" + cls))}</button>
    <div class="class-row">${CLASSES.map(c => `<button class="cls-chip ${c == cls ? "on" : ""}" onclick="S.viewCls=${c};renderGames()">Quiz: Class ${ordinal(c)}</button>`).join("")}</div>
    <div class="grid">
      <button class="topic" style="--h:200" onclick="go('sentence')"><div class="t-icon">🧱</div><div class="t-body"><b>Sentence Builder</b><span lang="hi">वाक्य बनाओ</span><small>${best("sentence") != null ? stars(best("sentence")) + " " + best("sentence") + "%" : "Put words in order"}</small></div></button>
      <button class="topic" style="--h:120" onclick="go('spell')"><div class="t-icon">🐝</div><div class="t-body"><b>Spelling Bee</b><span lang="hi">सुनो और लिखो</span><small>${best("spell") != null ? stars(best("spell")) + " " + best("spell") + "%" : "Listen & type the word"}</small></div></button>
      <button class="topic" style="--h:330" onclick="go('speak')"><div class="t-icon">🎤</div><div class="t-body"><b>Speak English</b><span lang="hi">बोलकर अभ्यास</span><small>${best("speak") != null ? stars(best("speak")) + " " + best("speak") + "%" : "Say it, the app checks"}</small></div></button>
    </div>
    <h3>🧩 Match the Pairs <span lang="hi">जोड़ी मिलाओ</span></h3>
    <div class="grid">${(window.MATCH_SETS || []).map((m, i) => `<button class="topic" style="--h:${i * 70 + 20}" onclick="go('match/${m.id}')"><div class="t-icon">${m.icon}</div><div class="t-body"><b>${esc(m.title)}</b><span lang="hi">${esc(m.hi)}</span><small>${best("match-" + m.id) != null ? stars(best("match-" + m.id)) + " " + best("match-" + m.id) + "%" : "Play now"}</small></div></button>`).join("")}</div>
  </main>` + bottomNav("games");
}
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
let quizTimer = null;
function renderQuickQuiz(cls) {
  cls = cls || S.session.cls; clearInterval(quizTimer);
  const pool = LESSONS.filter(l => l.cls == cls).flatMap(l => l.ws.map(q => ({ ...q, from: l.title.en })));
  const qs = shuffle(pool).slice(0, 10); const t0 = Date.now();
  app().innerHTML = header(`Quick Quiz · Class ${ordinal(cls)}`, "go('games')") + `<main class="wrap ws">
    <div class="card quiz-head"><b>⚡ Quick Quiz</b><span class="timer" id="timer">⏱ 0:00</span></div>
    <form id="wsForm">${qs.map(qHtml).join("")}<button class="btn primary big" type="submit">Finish quiz ✅</button></form><div id="scoreBox"></div></main>`;
  quizTimer = setInterval(() => { const el = $("#timer"); if (!el) return clearInterval(quizTimer); const s = Math.floor((Date.now() - t0) / 1000); el.textContent = `⏱ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }, 1000);
  $("#wsForm").onsubmit = async (e) => {
    e.preventDefault(); clearInterval(quizTimer);
    const score = gradeQs(e.target, qs); const secs = Math.round((Date.now() - t0) / 1000);
    $("#scoreBox").innerHTML = scoreCard(score, qs.length, `<button class="btn ghost" onclick="renderQuickQuiz(${cls})">🔁 New quiz</button><button class="btn primary" onclick="go('games')">Games</button>`, `<p>Time: ${Math.floor(secs / 60)} min ${secs % 60} sec</p>`);
    e.target.querySelector("button[type=submit]").style.display = "none"; $("#scoreBox").scrollIntoView({ behavior: "smooth" });
    await saveRes({ studentId: S.session.id, studentName: S.session.name, cls, topicId: "quick-quiz", topicTitle: "Quick Quiz", wsId: "quiz-" + cls, wsTitle: `Class ${cls} · ${secs}s`, score, total: qs.length });
  };
}
window.renderQuickQuiz = renderQuickQuiz;
function renderMatch(id) {
  const m = (window.MATCH_SETS || []).find(x => x.id === id); if (!m) return go("games");
  const pairs = shuffle(m.pairs).slice(0, 6); const left = shuffle(pairs.map((p, i) => ({ t: p[0], i }))); const right = shuffle(pairs.map((p, i) => ({ t: p[1], i })));
  let sel = null, matched = 0, mistakes = 0;
  app().innerHTML = header(m.title, "go('games')") + `<main class="wrap">
    <div class="card quiz-head"><b>${m.icon} ${esc(m.title)} <span lang="hi">${esc(m.hi)}</span></b><span id="mstat">✔ 0/6 · ✘ 0</span></div>
    <p class="hint center">Tap a word on the left, then its pair on the right. <span lang="hi">बाएँ शब्द पर टैप करो, फिर दाईं ओर उसकी जोड़ी पर।</span></p>
    <div class="match"><div class="mcol"><div class="mh">${esc(m.left)}</div>${left.map(x => `<button class="mcard L" data-i="${x.i}">${esc(x.t)}</button>`).join("")}</div>
    <div class="mcol"><div class="mh">${esc(m.right)}</div>${right.map(x => `<button class="mcard R" data-i="${x.i}">${esc(x.t)}</button>`).join("")}</div></div>
    <div id="scoreBox"></div></main>`;
  const upd = () => $("#mstat").textContent = `✔ ${matched}/6 · ✘ ${mistakes}`;
  $$(".mcard.L").forEach(b => b.onclick = () => { if (b.classList.contains("done")) return; $$(".mcard.L").forEach(x => x.classList.remove("sel")); b.classList.add("sel"); sel = b; speak(b.textContent, "en"); });
  $$(".mcard.R").forEach(b => b.onclick = async () => {
    if (!sel || b.classList.contains("done")) { if (!sel) toast("First tap a word on the left"); return; }
    if (sel.dataset.i === b.dataset.i) {
      sel.classList.remove("sel"); sel.classList.add("done"); b.classList.add("done"); sel = null; matched++; upd();
      if (matched === 6) {
        const score = Math.max(0, 6 - mistakes);
        $("#scoreBox").innerHTML = scoreCard(score, 6, `<button class="btn ghost" onclick="renderMatch('${id}')">🔁 Play again</button><button class="btn primary" onclick="go('games')">More games</button>`, `<p>Mistakes: ${mistakes}</p>`);
        $("#scoreBox").scrollIntoView({ behavior: "smooth" });
        await saveRes({ studentId: S.session.id, studentName: S.session.name, cls: S.session.cls, topicId: "match-game", topicTitle: "Match: " + m.title, wsId: "match-" + id, wsTitle: "Matching game", score, total: 6 });
      }
    } else { mistakes++; upd(); b.classList.add("bad"); setTimeout(() => b.classList.remove("bad"), 500); if (navigator.vibrate) navigator.vibrate(80); }
  });
}
window.renderMatch = renderMatch;

function gameLevelSentences() { const c = S.session.cls || 1; const pool = (window.SENTENCES || []).filter(x => x.lvl <= c); return pool.length >= 5 ? pool : (window.SENTENCES || []); }
function finishGame(score, total, topicId, wsId, title, again) {
  $("#scoreBox").innerHTML = scoreCard(score, total, `<button class="btn ghost" onclick="${again}">🔁 Play again</button><button class="btn primary" onclick="go('games')">More games</button>`);
  $("#scoreBox").scrollIntoView({ behavior: "smooth" });
  return saveRes({ studentId: S.session.id, studentName: S.session.name, cls: S.session.cls, topicId, topicTitle: title, wsId, wsTitle: title, score, total });
}
function renderSentence() {
  const rounds = shuffle(gameLevelSentences()).slice(0, 5); let r = 0, score = 0;
  app().innerHTML = header("Sentence Builder", "go('games')") + `<main class="wrap"><div class="card quiz-head"><b>🧱 Sentence Builder <span lang="hi">वाक्य बनाओ</span></b><span id="gstat"></span></div><div id="gbox"></div><div id="scoreBox"></div></main>`;
  const words = (t) => t.replace(/[.?!]$/, "").split(" ");
  const show = () => {
    if (r >= rounds.length) { $("#gbox").innerHTML = ""; return finishGame(score, rounds.length, "sentence-game", "sentence", "Sentence Builder", "renderSentence()"); }
    const sen = rounds[r]; const correct = words(sen.en); let picked = [];
    let chips = shuffle(correct.map((w, i) => ({ w, i }))); if (chips.map(c => c.w).join(" ") === correct.join(" ")) chips = chips.reverse();
    $("#gstat").textContent = `${r + 1} / ${rounds.length} · ⭐ ${score}`;
    const draw = (state = "") => {
      $("#gbox").innerHTML = `<div class="card"><p class="hint">Make this sentence in English: <span lang="hi">इस वाक्य को अंग्रेज़ी में बनाओ:</span></p><div class="hi-big" lang="hi">${esc(sen.hi)}</div>
        <div class="answer-line ${state}">${picked.map((c, k) => `<button class="chip-w on" data-k="${k}">${esc(c.w)}</button>`).join("") || `<span class="hint">Tap the words below in the right order</span>`}</div>
        <div class="chips">${chips.map((c, k) => picked.includes(c) ? "" : `<button class="chip-w" data-c="${k}">${esc(c.w)}</button>`).join("")}</div>
        ${state === "wrong" ? `<p class="fb">❌ Correct: <b>${esc(sen.en)}</b></p>` : state === "right" ? `<p class="fb">✅ Correct! शाबाश!</p>` : ""}
        <div class="row">${state ? `<button class="btn primary big" id="nextB">Next →</button>` : `<button class="btn ghost" id="clrB">↺ Clear</button><button class="btn primary" id="chkB" ${picked.length === correct.length ? "" : "disabled"}>Check ✅</button>`}</div></div>`;
      if (state) { $("#nextB").onclick = () => { r++; show(); }; return; }
      $$(".chips .chip-w").forEach(b => b.onclick = () => { picked.push(chips[+b.dataset.c]); draw(); });
      $$(".answer-line .chip-w").forEach(b => b.onclick = () => { picked.splice(+b.dataset.k, 1); draw(); });
      $("#clrB").onclick = () => { picked = []; draw(); };
      $("#chkB").onclick = () => { const ok = picked.map(c => c.w).join(" ") === correct.join(" "); if (ok) score++; speak(sen.en, "en"); draw(ok ? "right" : "wrong"); $("#gstat").textContent = `${r + 1} / ${rounds.length} · ⭐ ${score}`; };
    };
    draw();
  };
  show();
}
window.renderSentence = renderSentence;
function renderSpell() {
  const rounds = shuffle(window.SPELL_WORDS || []).slice(0, 8); let r = 0, score = 0;
  const canSpeak = "speechSynthesis" in window;
  app().innerHTML = header("Spelling Bee", "go('games')") + `<main class="wrap"><div class="card quiz-head"><b>🐝 Spelling Bee <span lang="hi">सुनो और लिखो</span></b><span id="gstat"></span></div><div id="gbox"></div><div id="scoreBox"></div></main>`;
  const show = () => {
    if (r >= rounds.length) { $("#gbox").innerHTML = ""; return finishGame(score, rounds.length, "spelling-game", "spell", "Spelling Bee", "renderSpell()"); }
    const w = rounds[r]; $("#gstat").textContent = `${r + 1} / ${rounds.length} · ⭐ ${score}`;
    $("#gbox").innerHTML = `<div class="card center"><button class="big-speaker" id="playB">🔊</button><p class="hint">${canSpeak ? "Tap to hear the word, then type its spelling." : "Type the word:"} <span lang="hi">शब्द सुनो और उसकी स्पेलिंग लिखो।</span></p>
      <p class="hint-word">${w[0]} ${"_ ".repeat(w.length - 1)} <small>(${w.length} letters)</small></p>
      <form id="spF"><input id="spIn" class="fill big-in" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="Type here"><button class="btn primary big" type="submit">Check ✅</button></form><div id="spFb"></div></div>`;
    const say = () => speak(w, "en"); $("#playB").onclick = say; if (canSpeak) setTimeout(say, 300);
    $("#spF").onsubmit = (e) => {
      e.preventDefault(); const ok = norm($("#spIn").value) === w; if (ok) score++;
      $("#spFb").innerHTML = `<p class="fb">${ok ? "✅ Correct! शाबाश!" : `❌ Correct spelling: <b>${esc(w)}</b>`}</p><button class="btn primary big" id="nextB">Next →</button>`;
      $("#spF button").remove(); $("#spIn").disabled = true; $("#nextB").onclick = () => { r++; show(); }; $("#gstat").textContent = `${r + 1} / ${rounds.length} · ⭐ ${score}`;
    };
  };
  show();
}
window.renderSpell = renderSpell;
function similarity(a, b) {
  const A = norm(a).replace(/[^a-z' ]/g, "").split(" ").filter(Boolean), B = norm(b).replace(/[^a-z' ]/g, "").split(" ").filter(Boolean);
  const dp = Array.from({ length: A.length + 1 }, () => Array(B.length + 1).fill(0));
  for (let i = 1; i <= A.length; i++) for (let j = 1; j <= B.length; j++) dp[i][j] = A[i - 1] === B[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return A.length ? dp[A.length][B.length] / A.length : 0;
}
function renderSpeak() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rounds = shuffle(gameLevelSentences()).slice(0, 5); let r = 0, score = 0;
  app().innerHTML = header("Speak English", "go('games')") + `<main class="wrap"><div class="card quiz-head"><b>🎤 Speak English <span lang="hi">बोलकर अभ्यास</span></b><span id="gstat"></span></div><div id="gbox"></div><div id="scoreBox"></div></main>`;
  if (!SR) { $("#gbox").innerHTML = `<div class="card center"><p>🎤 Speaking practice needs <b>Chrome</b> (Android/computer) or <b>Safari</b> on iPhone (iOS 14.5+).</p><p lang="hi">यह खेल Chrome या iPhone Safari में चलता है।</p><button class="btn primary" onclick="go('games')">Back to games</button></div>`; return; }
  const show = () => {
    if (r >= rounds.length) { $("#gbox").innerHTML = ""; return finishGame(score, rounds.length, "speak-game", "speak", "Speak English", "renderSpeak()"); }
    const sen = rounds[r]; $("#gstat").textContent = `${r + 1} / ${rounds.length} · ⭐ ${score}`;
    $("#gbox").innerHTML = `<div class="card center"><p class="hint">Read this sentence aloud: <span lang="hi">यह वाक्य बोलो:</span></p>
      <div class="say-big">${esc(sen.en)}</div><div class="hint" lang="hi">${esc(sen.hi)}</div>
      <div class="row" style="justify-content:center"><button class="btn ghost" id="hearB">🔊 Listen first</button><button class="mic" id="micB">🎤</button></div>
      <div id="heard"></div></div>`;
    $("#hearB").onclick = () => speak(sen.en, "en");
    $("#micB").onclick = () => {
      const rec = new SR(); rec.lang = "en-IN"; rec.interimResults = false; rec.maxAlternatives = 3;
      const mic = $("#micB"); mic.classList.add("on"); $("#heard").innerHTML = `<p class="hint">Listening… speak now 🎙</p>`;
      rec.onresult = (ev) => {
        const alts = [...ev.results[0]].map(x => x.transcript); const best = alts.reduce((m, t) => Math.max(m, similarity(sen.en, t)), 0);
        const pct = Math.round(best * 100); const ok = pct >= 70; if (ok) score++;
        $("#heard").innerHTML = `<p>You said: “<b>${esc(alts[0])}</b>”</p><p class="fb">${ok ? `✅ Great speaking! (${pct}%) शाबाश!` : `🔁 ${pct}% match — try once more or tap Next`}</p>
          <div class="row" style="justify-content:center">${ok ? "" : `<button class="btn ghost" id="retryB">🎤 Try again</button>`}<button class="btn primary" id="nextB">Next →</button></div>`;
        $("#nextB").onclick = () => { r++; show(); }; const rb = $("#retryB"); if (rb) rb.onclick = () => $("#micB").click();
        $("#gstat").textContent = `${r + 1} / ${rounds.length} · ⭐ ${score}`;
      };
      rec.onerror = (ev) => { $("#heard").innerHTML = `<p class="err">${ev.error === "not-allowed" ? "Please allow microphone access and try again." : "Could not hear clearly — tap 🎤 and try again."}</p><button class="btn ghost" id="skipB">Skip →</button>`; $("#skipB").onclick = () => { r++; show(); }; };
      rec.onend = () => mic.classList.remove("on");
      try { rec.start(); } catch { mic.classList.remove("on"); }
    };
  };
  show();
}
window.renderSpeak = renderSpeak;
function confetti() {
  const c = document.createElement("div"); c.className = "confetti";
  c.innerHTML = Array.from({ length: 40 }, () => `<i style="left:${Math.random() * 100}%;background:hsl(${Math.random() * 360} 90% 60%);animation-delay:${Math.random() * .5}s;animation-duration:${1.5 + Math.random()}s"></i>`).join("");
  document.body.appendChild(c); setTimeout(() => c.remove(), 3000);
}
window.speak = speak;

/* ===================== ADMIN ===================== */
async function renderAdmin(tab) {
  let pending = 0; try { pending = (await S.db.listDoubts()).filter(d => !d.answer).length; } catch { }
  const tabs = [["dashboard", "🏠 Dashboard"], ["doubts", "💬 Doubts" + (pending ? ` <em class="dot">${pending}</em>` : "")], ["students", "👥 Students"], ["worksheets", "📝 Worksheets"], ["notices", "📢 Notices"], ["results", "📊 Results"], ["content", "📚 Lessons"], ["settings", "⚙️ Settings"]];
  app().innerHTML = header("Admin Panel") + `<main class="wrap admin">
    <nav class="admin-tabs">${tabs.map(([k, l]) => `<button class="${k === tab ? "on" : ""}" onclick="go('admin/${k}')">${l}</button>`).join("")}</nav>
    <div id="adminBody"><p class="hint center">Loading…</p></div></main>`;
  const body = $("#adminBody");
  try {
    if (tab === "dashboard") await adminDashboard(body);
    else if (tab === "doubts") await adminDoubts(body);
    else if (tab === "students") await adminStudents(body);
    else if (tab === "worksheets") await adminWorksheets(body);
    else if (tab === "results") await adminResults(body);
    else if (tab === "notices") await adminNotices(body);
    else if (tab === "content") adminContent(body);
    else adminSettings(body);
  } catch (e) { body.innerHTML = `<div class="card err">⚠️ ${esc(friendly(e))}</div>`; }
}

async function adminDashboard(body) {
  const [stu, rs, doubts] = await Promise.all([S.db.listStudents(), S.db.allResults(), S.db.listDoubts().catch(() => [])]);
  const today = dayKey(Date.now()); const weekAgo = Date.now() - 7 * 864e5;
  const todayRs = rs.filter(r => dayKey(r.at) === today); const weekRs = rs.filter(r => r.at >= weekAgo);
  const activeToday = new Set(todayRs.map(r => r.studentId)).size;
  const weekAvg = weekRs.length ? Math.round(weekRs.reduce((a, r) => a + pctOf(r), 0) / weekRs.length * 100) : 0;
  const pend = doubts.filter(d => !d.answer);
  const per = {}; rs.forEach(r => (per[r.studentId] ||= []).push(r));
  const rows = stu.filter(s => !s.disabled).map(s => { const r = per[s.id] || []; const w = r.filter(x => x.at >= weekAgo);
    return { s, last: r.length ? Math.max(...r.map(x => x.at)) : 0, avg: r.length ? Math.round(r.reduce((a, x) => a + pctOf(x), 0) / r.length * 100) : null, week: w.length, stars: w.filter(x => pctOf(x) >= .9).length }; });
  const top = [...rows].filter(r => r.week).sort((a, b) => b.week + b.stars - (a.week + a.stars)).slice(0, 5);
  const attention = rows.filter(r => !r.last || r.last < weekAgo || (r.avg != null && r.avg < 50)).slice(0, 8);
  const hour = new Date().getHours();
  body.innerHTML = `
  <div class="card dash-hello">${teacherAvatar(56)}<div><h2>Good ${hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"}, Pallavi Ma'am! 👋</h2><p>${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p></div></div>
  ${S.db.mode === "demo" ? `<div class="card warn-box"><b>⚠️ Demo mode:</b> logins and scores are saved only on this device, so students cannot log in from their own phones yet. Connect Firebase to go live (see README, Step 2).</div>` : ""}
  <div class="stats four">
    <div class="stat"><b>${stu.length}</b><span>Students</span></div>
    <div class="stat"><b>${activeToday}</b><span>Active today</span></div>
    <div class="stat"><b>${weekRs.length}</b><span>Done this week</span></div>
    <div class="stat"><b>${weekAvg}%</b><span>Avg this week</span></div>
  </div>
  ${pend.length ? `<button class="card ask-cta" onclick="go('admin/doubts')"><span>💬</span><div><b>${pend.length} student question${pend.length > 1 ? "s" : ""} waiting</b><small>Tap to reply</small></div><span>→</span></button>` : ""}
  <div class="card"><h3>⚡ Quick actions</h3><div class="quick">
    <button onclick="go('admin/students')">👤<span>Add student</span></button><button onclick="go('admin/worksheets')">📝<span>Add worksheet</span></button>
    <button onclick="go('admin/notices')">📢<span>Post homework</span></button><button onclick="go('admin/content')">📚<span>Add lesson</span></button>
    <button onclick="copyLink(location.origin + location.pathname + '#install')">📲<span>Copy app link</span></button><button onclick="go('admin/results')">📄<span>Report cards</span></button></div></div>
  <div class="dash-grid">
    <div class="card"><h3>🏆 Top this week</h3>${top.length ? top.map((r, i) => `<div class="lb-row" onclick="go('admin/report/${r.s.id}')"><span class="rank">${["🥇", "🥈", "🥉", "4", "5"][i]}</span><b>${esc(r.s.name)}</b><small>Class ${r.s.cls} · ${r.week} done · ${r.stars} ⭐</small></div>`).join("") : `<p class="hint">No activity this week yet.</p>`}</div>
    <div class="card"><h3>🔔 Needs attention</h3>${attention.length ? attention.map(r => `<div class="lb-row" onclick="go('admin/report/${r.s.id}')"><span class="rank">${!r.last ? "💤" : r.last < weekAgo ? "⏰" : "📉"}</span><b>${esc(r.s.name)}</b><small>${!r.last ? "Not started yet" : r.last < weekAgo ? "Inactive since " + fmtDate(r.last) : "Average " + r.avg + "%"}</small></div>`).join("") : `<p class="hint">Everyone is doing well 🎉</p>`}</div>
  </div>
  <div class="card"><h3>🕒 Recent activity</h3>${rs.length ? [...rs].sort((a, b) => b.at - a.at).slice(0, 10).map(r => `<div class="act"><b>${esc(r.studentName)}</b> — ${esc(r.topicTitle)} <span class="${pctOf(r) >= .6 ? "ok" : "lo"}">${r.score}/${r.total}</span><small>${fmtDate(r.at)}</small></div>`).join("") : `<p class="hint">No activity yet. Share the app link with your students!</p>`}</div>`;
}
async function adminDoubts(body) {
  const all = (await S.db.listDoubts()).sort((a, b) => (!!a.answer - !!b.answer) || b.at - a.at);
  body.innerHTML = `<div class="card"><h3>💬 Student questions (${all.filter(d => !d.answer).length} waiting)</h3><p class="hint">Students ask from the "Ask Ma'am" tab or from any lesson. Your reply appears in their app.</p></div>
  ${all.length ? all.map(d => `<div class="card doubt ${d.answer ? "answered" : ""}">
    <div class="d-meta"><b>${esc(d.studentName)}</b> · Class ${d.cls}${d.topicTitle ? " · " + esc(d.topicTitle) : ""} · ${fmtDate(d.at)}</div>
    <div class="d-q">❓ ${esc(d.text)}</div>
    ${d.answer ? `<div class="d-a">${esc(d.answer)}</div>` : ""}
    <div class="reply"><textarea rows="2" placeholder="${d.answer ? "Edit your reply…" : "Type your reply (English / Hindi)…"}" id="r-${d.id}">${esc(d.answer || "")}</textarea>
    <div class="row"><button class="btn primary sm" onclick="replyDoubt('${d.id}')">${d.answer ? "Update reply" : "Send reply"}</button>${d.topicId ? `<button class="btn ghost sm" onclick="go('lesson/${d.topicId}')">Open lesson</button>` : ""}<button class="btn danger sm" onclick="delDoubt('${d.id}')">🗑</button></div></div>
  </div>`).join("") : `<p class="hint center">No questions yet.</p>`}`;
}
window.replyDoubt = async (id) => { const v = $("#r-" + id).value.trim(); if (!v) return toast("Write a reply first", "bad"); try { await S.db.answerDoubt(id, v); toast("Reply sent ✅", "good"); route(); } catch (e) { toast(e, "bad"); } };
window.delDoubt = async (id) => { if (!confirm("Delete this question?")) return; try { await S.db.deleteDoubt(id); route(); } catch (e) { toast(e, "bad"); } };

async function adminStudents(body) {
  const list = await S.db.listStudents();
  body.innerHTML = `
  <div class="card"><h3>➕ Create student login</h3>
    <form id="addStu" class="form-grid">
      <label>Student name<input name="name" required placeholder="Riya Sharma"></label>
      <label>Class<select name="cls">${CLASSES.map(c => `<option value="${c}">Class ${ordinal(c)}</option>`).join("")}</select></label>
      <label>Login ID<input name="id" required autocapitalize="none" placeholder="riya4" pattern="[A-Za-z0-9._\\-]{3,30}" title="3–30 letters/numbers, no spaces"></label>
      <label>Password<div class="inrow"><input name="pw" required minlength="6" value="${genPassword()}"><button type="button" class="btn ghost sm" onclick="this.previousElementSibling.value=genPw()">🎲</button></div></label>
      <label class="full">Parent phone (optional, for WhatsApp)<input name="phone" inputmode="tel" placeholder="9876543210"></label>
      <button class="btn primary full" type="submit">Create login</button>
    </form>
  </div>
  <details class="card"><summary><b>📋 Add many students at once</b> <small class="hint">(paste a list)</small></summary>
    <p class="hint">One student per line: <code>Name, Class, LoginID, Password</code>. Password is optional — it will be made automatically.</p>
    <textarea id="bulkIn" rows="5" placeholder="Riya Sharma, 4, riya4, star123&#10;Aman Gupta, 3, aman3&#10;Kavya, 5, kavya5"></textarea>
    <button class="btn primary" id="bulkBtn">Create all logins</button><div id="bulkOut"></div>
  </details>
  <div class="card"><h3>👥 Students (${list.length})</h3>
    <input class="search" placeholder="Search name or ID…" oninput="filterRows(this,'#stuTbl')">
    ${list.length ? `<div class="tbl-wrap"><table class="tbl" id="stuTbl"><tr><th>Name</th><th>Class</th><th>Login ID</th><th>Password</th><th></th></tr>
    ${list.map(s => `<tr class="${s.disabled ? "muted" : ""}"><td>${esc(s.name)}${s.disabled ? " <small>(paused)</small>" : ""}</td><td>${s.cls}</td><td><code>${esc(s.id)}</code></td>
      <td><code class="pw" onclick="this.classList.toggle('show')">${esc(s.password || "")}</code></td>
      <td class="acts">
        <button class="btn sm ghost" title="Share login on WhatsApp" onclick="shareLogin(${esc(JSON.stringify({ n: s.name, i: s.id, p: s.password, ph: s.phone || "" }))})">📤</button>
        <button class="btn sm ghost" title="Report card" onclick="go('admin/report/${s.id}')">📄</button>
        <button class="btn sm ghost" title="Change password" onclick="changePw('${s.id}')">🔑</button>
        <button class="btn sm ghost" title="Change class" onclick="changeCls('${s.id}',${s.cls})">🏫</button>
        <button class="btn sm ghost" title="${s.disabled ? "Enable" : "Pause"} login" onclick="toggleStu('${s.id}',${!s.disabled})">${s.disabled ? "▶️" : "⏸"}</button>
        <button class="btn sm danger" title="Delete" onclick="delStu('${s.id}')">🗑</button>
      </td></tr>`).join("")}</table></div>` : `<p class="hint">No students yet. Create the first login above.</p>`}
  </div>`;
  $("#bulkBtn").onclick = async () => {
    const lines = $("#bulkIn").value.split(/\n/).map(l => l.trim()).filter(Boolean); if (!lines.length) return toast("Paste at least one line", "bad");
    const btn = $("#bulkBtn"); btn.disabled = true; const ok = [], bad = [];
    for (const [n, line] of lines.entries()) {
      btn.textContent = `Creating ${n + 1}/${lines.length}…`;
      const [name, cls, id, pw] = line.split(/[,\t]/).map(x => (x || "").trim());
      const st = { name, cls: +cls, id: cleanId(id), password: pw && pw.length >= 6 ? pw : genPassword(), phone: "" };
      try {
        if (!name || !CLASSES.includes(st.cls) || st.id.length < 3) throw new Error("check Name, Class (1-5) and LoginID (3+ letters)");
        await S.db.addStudent(st); ok.push(st);
      } catch (e) { bad.push(`Line ${n + 1} (${line}): ${e.message}`); }
    }
    btn.disabled = false; btn.textContent = "Create all logins";
    const text = ok.map(s => `${s.name} (Class ${s.cls}) — ID: ${s.id} — Password: ${s.password}`).join("\n");
    $("#bulkOut").innerHTML = `${ok.length ? `<p class="ok-t">✅ ${ok.length} logins created</p><pre class="cred">${esc(text)}</pre><button class="btn ghost sm" id="bulkCopy">📋 Copy all</button>` : ""}${bad.length ? `<p class="err">${bad.map(esc).join("<br>")}</p>` : ""}`;
    const bc = $("#bulkCopy"); if (bc) bc.onclick = () => { navigator.clipboard?.writeText(text); toast("Copied"); };
    if (ok.length) setTimeout(() => adminStudents(body).then(() => { $("details.card").open = true; $("#bulkOut").innerHTML = `<p class="ok-t">✅ ${ok.length} logins created</p><pre class="cred">${esc(text)}</pre>${bad.length ? `<p class="err">${bad.map(esc).join("<br>")}</p>` : ""}`; }), 50);
  };
  $("#addStu").onsubmit = async (e) => {
    e.preventDefault(); const f = new FormData(e.target); const btn = e.target.querySelector("[type=submit]"); btn.disabled = true;
    const s = { name: f.get("name").trim(), cls: +f.get("cls"), id: cleanId(f.get("id")), password: f.get("pw").trim(), phone: f.get("phone").trim() };
    try {
      if (s.id.length < 3) throw new Error("Login ID must be at least 3 letters/numbers");
      if (s.password.length < 6) throw new Error("Password must be at least 6 characters");
      await S.db.addStudent(s); toast("Login created for " + s.name, "good"); await adminStudents(body);
      shareLogin({ n: s.name, i: s.id, p: s.password, ph: s.phone }, true);
    } catch (err) { toast(err.message, "bad"); btn.disabled = false; }
  };
}
window.filterRows = (inp, sel) => { const q = inp.value.toLowerCase(); $$(sel + " tr").slice(1).forEach(r => r.style.display = r.textContent.toLowerCase().includes(q) ? "" : "none"); };
window.shareLogin = (d, justCreated) => {
  const url = location.origin + location.pathname;
  const text = `Learn from Pallavi Gupta 📚\nStudent: ${d.n}\nLogin ID: ${d.i}\nPassword: ${d.p}\nInstall the app: ${url}#install`;
  modal(`<h3>${justCreated ? "✅ Login created" : "Login details"}</h3><pre class="cred">${esc(text)}</pre>
    <div class="row"><button class="btn ghost" id="cpy">📋 Copy</button>
    <a class="btn primary" target="_blank" rel="noopener" href="https://wa.me/${d.ph ? "91" + d.ph.replace(/\D/g, "").slice(-10) : ""}?text=${encodeURIComponent(text)}">WhatsApp</a></div>`);
  $("#cpy").onclick = () => { navigator.clipboard?.writeText(text); toast("Copied"); };
};
window.changePw = async (id) => {
  const pw = prompt("New password for " + id + " (min 6 characters):", genPassword()); if (!pw) return;
  if (pw.length < 6) return toast("Password must be at least 6 characters", "bad");
  try { await S.db.changeStudentPassword(id, pw); toast("Password changed", "good"); route(); } catch (e) { toast(e.message, "bad"); }
};
window.changeCls = async (id, cur) => {
  const c = prompt("New class for " + id + " (1-5):", cur); if (!c) return;
  if (!CLASSES.includes(+c)) return toast("Class must be 1 to 5", "bad");
  try { await S.db.updateStudent(id, { cls: +c }); toast("Class updated", "good"); route(); } catch (e) { toast(e.message, "bad"); }
};
window.toggleStu = async (id, disabled) => { try { await S.db.updateStudent(id, { disabled }); toast(disabled ? "Login paused" : "Login enabled"); route(); } catch (e) { toast(e.message, "bad"); } };
window.delStu = async (id) => { try { if (!confirm("Delete student " + id + "? They will not be able to log in.")) return; await S.db.deleteStudent(id); toast("Deleted"); route(); } catch (e) { toast(e.message, "bad"); } };

async function adminWorksheets(body) {
  S.worksheets = await S.db.listWorksheets();
  const topicOpts = (cls) => LESSONS.filter(l => l.cls == cls).map(l => `<option value="${l.id}">${esc(l.title.en)}</option>`).join("");
  body.innerHTML = `
  <div class="card"><h3>➕ Add a worksheet</h3>
  <form id="addWs">
    <div class="form-grid">
      <label>Class<select name="cls" id="wsCls">${CLASSES.map(c => `<option value="${c}">Class ${ordinal(c)}</option>`).join("")}</select></label>
      <label>Topic<select name="topicId" id="wsTopic">${topicOpts(1)}</select></label>
      <label class="full">Worksheet title<input name="title" required placeholder="Nouns – Worksheet 2"></label>
      <label class="full">Instructions (English / Hindi)<textarea name="instructions" rows="2" placeholder="Fill in the blanks. / रिक्त स्थान भरें।"></textarea></label>
      <label>Photo / scan of worksheet (optional)<input type="file" name="image" accept="image/*"></label>
      <label>File link (optional — Google Drive PDF etc.)<input name="link" type="url" placeholder="https://drive.google.com/..."></label>
    </div>
    <h4>Questions (auto-checked) — optional</h4>
    <div id="qRows"></div>
    <div class="row wrapr"><button type="button" class="btn ghost sm" onclick="addQ('mcq')">+ Multiple choice</button><button type="button" class="btn ghost sm" onclick="addQ('fill')">+ Fill in the blank</button><button type="button" class="btn ghost sm" onclick="addQ('tf')">+ True / False</button></div>
    <button class="btn primary big" type="submit">Save worksheet</button>
  </form></div>
  <div class="card"><h3>📝 Your worksheets (${S.worksheets.length})</h3>
    ${S.worksheets.length ? S.worksheets.map(w => { const t = LESSONS.find(l => l.id === w.topicId); return `<div class="ws-admin"><div><b>${esc(w.title)}</b><small>Class ${w.cls} · ${esc(t ? t.title.en : w.topicId)} · ${(w.questions || []).length} Qs${w.image ? " · 🖼" : ""}${w.link ? " · 📎" : ""} · ${fmtDate(w.createdAt)}</small></div>
    <div class="acts"><button class="btn sm ghost" onclick="previewWs('${w.topicId}','${w.id}')">👁</button><button class="btn sm danger" onclick="delWs('${w.id}')">🗑</button></div></div>`; }).join("") : `<p class="hint">No worksheets added yet. Every topic already has a built-in practice worksheet.</p>`}
  </div>`;
  $("#wsCls").onchange = (e) => { $("#wsTopic").innerHTML = topicOpts(e.target.value); };
  $("#addWs").onsubmit = async (e) => {
    e.preventDefault(); const f = new FormData(e.target); const btn = e.target.querySelector("[type=submit]");
    const { questions, bad } = readQRows("#qRows");
    if (bad) return toast(bad, "bad");
    const file = f.get("image"); const link = f.get("link").trim();
    if (!questions.length && !(file && file.size) && !link) return toast("Add questions, a photo, or a file link", "bad");
    btn.disabled = true; btn.textContent = "Saving…";
    try {
      const image = file && file.size ? await resizeImage(file, 1400, 0.7) : "";
      if (image.length > 900000) throw new Error("Image too large — please use a smaller photo");
      await S.db.addWorksheet({ cls: +f.get("cls"), topicId: f.get("topicId"), title: f.get("title").trim(), instructions: f.get("instructions").trim(), link, image, questions });
      toast("Worksheet saved — students can see it now", "good"); adminWorksheets(body);
    } catch (err) { toast(err.message, "bad"); btn.disabled = false; btn.textContent = "Save worksheet"; }
  };
}
function readQRows(sel) {
  const questions = []; let bad = "";
  $$(sel + " .qrow").forEach((r, i) => {
    const t = r.dataset.t, q = $(".qq", r).value.trim(); if (!q) return;
    if (t === "mcq") {
      const o = $(".qo", r).value.split("|").map(s => s.trim()).filter(Boolean); const a = +$(".qa", r).value - 1;
      if (o.length < 2) bad = `Q${i + 1}: give at least 2 options separated by |`; else if (!(a >= 0 && a < o.length)) bad = `Q${i + 1}: correct option number is wrong`;
      questions.push({ t, q, o, a });
    } else if (t === "fill") {
      const a = $(".qa", r).value.split("/").map(s => s.trim()).filter(Boolean); if (!a.length) bad = `Q${i + 1}: write the answer`;
      questions.push({ t, q, a });
    } else questions.push({ t, q, a: $(".qa", r).value === "true" });
  });
  return { questions, bad };
}
window.addQ = (t, target = "#qRows") => {
  const d = document.createElement("div"); d.className = "qrow"; d.dataset.t = t;
  const label = { mcq: "Multiple choice", fill: "Fill in the blank", tf: "True / False" }[t];
  d.innerHTML = `<div class="qrow-h"><b>${label}</b><button type="button" class="icon-btn sm" onclick="this.closest('.qrow').remove()">✕</button></div>
    <input class="qq" placeholder="Question, e.g. ${t === "fill" ? "Plural of 'box' is ___." : t === "tf" ? "'cat' is a noun." : "Which is a noun?"}">
    ${t === "mcq" ? `<div class="inrow"><input class="qo" placeholder="Options separated by |  e.g.  run | table | happy"><input class="qa" type="number" min="1" max="6" placeholder="Correct #" style="max-width:110px"></div>`
      : t === "fill" ? `<input class="qa" placeholder="Correct answer (more than one? separate with / )">`
        : `<select class="qa"><option value="true">Answer: True</option><option value="false">Answer: False</option></select>`}`;
  $(target).appendChild(d); $(".qq", d).focus();
};
window.previewWs = (topicId, id) => go(`ws/${topicId}/${id}`);
window.delWs = async (id) => { try { if (!confirm("Delete this worksheet?")) return; await S.db.deleteWorksheet(id); toast("Deleted"); route(); } catch (e) { toast(e.message, "bad"); } };

async function adminResults(body) {
  const [rs, stu] = await Promise.all([S.db.allResults(), S.db.listStudents()]);
  rs.sort((a, b) => b.at - a.at);
  const per = {}; rs.forEach(r => { (per[r.studentId] ||= []).push(r); });
  body.innerHTML = `
  <div class="stats">
    <div class="stat"><b>${stu.length}</b><span>Students</span></div>
    <div class="stat"><b>${rs.length}</b><span>Worksheets submitted</span></div>
    <div class="stat"><b>${rs.length ? Math.round(rs.reduce((s, r) => s + r.score / r.total, 0) / rs.length * 100) : 0}%</b><span>Average score</span></div>
  </div>
  <div class="card"><h3>By student 📄</h3><div class="tbl-wrap"><table class="tbl"><tr><th>Student</th><th>Class</th><th>Done</th><th>Avg</th><th>Last active</th></tr>
  ${stu.map(s => { const r = per[s.id] || []; const avg = r.length ? Math.round(r.reduce((a, x) => a + x.score / x.total, 0) / r.length * 100) : null;
    return `<tr class="click" onclick="go('admin/report/${s.id}')"><td>${esc(s.name)} <small>📄 Report card</small></td><td>${s.cls}</td><td>${r.length}</td><td>${avg == null ? "—" : avg + "%"}</td><td>${r[0] ? fmtDate(r[0].at) : "—"}</td></tr>`; }).join("")}</table></div><p class="hint">Tap a student to open their printable report card.</p></div>
  <div class="card"><h3>All submissions</h3><div class="row"><input class="search" style="flex:1;margin:0" placeholder="Search student or topic…" oninput="filterRows(this,'#resTbl')"><button class="btn ghost" id="csvBtn">⬇️ Download (Excel)</button></div>
  ${rs.length ? `<div class="tbl-wrap"><table class="tbl" id="resTbl"><tr><th>Student</th><th>Topic / Worksheet</th><th>Score</th><th>When</th></tr>
  ${rs.map(r => `<tr><td>${esc(r.studentName)}<small>${esc(r.studentId)}</small></td><td>${esc(r.topicTitle)}<small>${esc(r.wsTitle)}</small></td><td class="${r.score / r.total >= .6 ? "ok" : "lo"}">${r.score}/${r.total}</td><td>${fmtDate(r.at)}</td></tr>`).join("")}</table></div>` : `<p class="hint">No submissions yet.</p>`}</div>`;
  $("#csvBtn").onclick = () => {
    const rows = [["Student", "Login ID", "Class", "Topic", "Worksheet", "Score", "Total", "Percent", "Date"]].concat(rs.map(r => [r.studentName, r.studentId, r.cls, r.topicTitle, r.wsTitle, r.score, r.total, Math.round(pctOf(r) * 100) + "%", new Date(r.at).toLocaleString("en-IN")]));
    const csv = "\ufeff" + rows.map(r => r.map(x => `"${String(x ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `results-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };
}
async function adminNotices(body) {
  S.notices = await S.db.listNotices();
  const topicOpts = LESSONS.map(l => `<option value="${l.id}">Class ${l.cls} · ${esc(l.title.en)}</option>`).join("");
  body.innerHTML = `<div class="card"><h3>📢 Post a notice or homework</h3>
    <form id="addNo" class="form-grid">
      <label>Type<select name="kind"><option value="notice">📢 Notice</option><option value="homework">📚 Homework</option></select></label>
      <label>For<select name="cls"><option value="0">All classes</option>${CLASSES.map(c => `<option value="${c}">Class ${ordinal(c)} only</option>`).join("")}</select></label>
      <label class="full">Message (English / Hindi)<textarea name="text" rows="3" required placeholder="Complete the Pronouns worksheet by Friday. / शुक्रवार तक सर्वनाम अभ्यास पूरा करें।"></textarea></label>
      <label>Link a topic (optional)<select name="topicId"><option value="">— none —</option>${topicOpts}</select></label>
      <label>Due date (optional)<input type="date" name="due"></label>
      <button class="btn primary full" type="submit">Post to students</button>
    </form></div>
    <div class="card"><h3>Posted (${S.notices.length})</h3>${S.notices.length ? S.notices.map(n => `<div class="ws-admin"><div><b>${n.kind === "homework" ? "📚" : "📢"} ${esc(n.text)}</b><small>${n.cls ? "Class " + n.cls : "All classes"}${n.due ? " · due " + esc(n.due) : ""} · ${fmtDate(n.createdAt)}</small></div><div class="acts"><button class="btn sm danger" onclick="delNotice('${n.id}')">🗑</button></div></div>`).join("") : `<p class="hint">Nothing posted yet. Students see notices at the top of their home screen.</p>`}</div>`;
  $("#addNo").onsubmit = async (e) => {
    e.preventDefault(); const f = new FormData(e.target);
    try { await S.db.addNotice({ kind: f.get("kind"), cls: +f.get("cls"), text: f.get("text").trim(), topicId: f.get("topicId"), due: f.get("due") }); toast("Posted", "good"); adminNotices(body); }
    catch (err) { toast(err.message, "bad"); }
  };
}
window.delNotice = async (id) => { if (!confirm("Delete this notice?")) return; try { await S.db.deleteNotice(id); toast("Deleted"); route(); } catch (e) { toast(e.message, "bad"); } };

function adminContent(body) {
  const pairs = (txt) => txt.split(/\n/).map(l => l.trim()).filter(Boolean).map(l => { const [en, hi] = l.split("|").map(x => (x || "").trim()); return { en, hi: hi || "" }; });
  body.innerHTML = `<details class="card" id="newLesson"><summary><b>➕ Add your own lesson</b> <small class="hint">(new topic, English + Hindi)</small></summary>
    <form id="addLes">
      <div class="form-grid">
        <label>Class<select name="cls">${CLASSES.map(c => `<option value="${c}">Class ${ordinal(c)}</option>`).join("")}</select></label>
        <label>Icon (emoji)<input name="icon" value="📘" maxlength="4"></label>
        <label>Title (English)<input name="ten" required placeholder="Homophones"></label>
        <label>Title (Hindi)<input name="thi" placeholder="समान ध्वनि वाले शब्द"></label>
        <label class="full">What is it? (English)<textarea name="ien" rows="2" required></textarea></label>
        <label class="full">What is it? (Hindi)<textarea name="ihi" rows="2"></textarea></label>
        <label class="full">Rules / points — one per line: <code>English | Hindi</code><textarea name="pts" rows="3" placeholder="sea – the ocean | sea – समुद्र&#10;see – to look | see – देखना"></textarea></label>
        <label class="full">Examples — one per line: <code>English | Hindi</code><textarea name="exs" rows="3" placeholder="I can see the sea. | मैं समुद्र देख सकता हूँ।"></textarea></label>
        <label>Tip (English)<input name="tipen"></label><label>Tip (Hindi)<input name="tiphi"></label>
      </div>
      <h4>Practice questions (auto-checked)</h4><div id="lesQ"></div>
      <div class="row wrapr"><button type="button" class="btn ghost sm" onclick="addQ('mcq','#lesQ')">+ Multiple choice</button><button type="button" class="btn ghost sm" onclick="addQ('fill','#lesQ')">+ Fill in the blank</button><button type="button" class="btn ghost sm" onclick="addQ('tf','#lesQ')">+ True / False</button></div>
      <button class="btn primary big" type="submit">Publish lesson</button>
    </form></details>
  ` + CLASSES.map(c => `<div class="card"><h3>Class ${ordinal(c)}</h3>
    ${LESSONS.filter(l => l.cls === c).map(l => `<div class="les-row"><button class="ws-item" onclick="go('lesson/${l.id}')"><span>${l.icon}</span><div><b>${esc(l.title.en)}${l.custom ? ' <span class="new-tag">Your lesson</span>' : ""}</b><small lang="hi">${esc(l.title.hi)} · ${l.ws.length} practice Qs</small></div></button>${l.custom ? `<button class="btn sm danger" onclick="delLesson('${l.id}')">🗑</button>` : ""}</div>`).join("")}
  </div>`).join("");
  $("#addLes").onsubmit = async (e) => {
    e.preventDefault(); const f = new FormData(e.target); const { questions, bad } = readQRows("#lesQ"); if (bad) return toast(bad, "bad");
    const l = { id: "custom-" + Date.now(), cls: +f.get("cls"), icon: f.get("icon").trim() || "📘", title: { en: f.get("ten").trim(), hi: f.get("thi").trim() }, intro: { en: f.get("ien").trim(), hi: f.get("ihi").trim() },
      points: pairs(f.get("pts")), examples: pairs(f.get("exs")), tip: { en: f.get("tipen").trim(), hi: f.get("tiphi").trim() }, ws: questions, createdAt: Date.now() };
    try { await S.db.saveLesson(l); mergeLessons(await S.db.listLessons()); toast("Lesson published — students can see it now", "good"); adminContent(body); }
    catch (err) { toast(err, "bad"); }
  };
}
window.delLesson = async (id) => { if (!confirm("Delete this lesson?")) return; try { await S.db.deleteLesson(id); mergeLessons(await S.db.listLessons()); toast("Deleted"); route(); } catch (e) { toast(e, "bad"); } };

/* ===================== REPORT CARD ===================== */
async function renderReport(id) {
  app().innerHTML = header("Report Card", "go('admin/results')") + `<main class="wrap"><p class="hint center">Loading…</p></main>`;
  try {
    const [stu, rs] = await Promise.all([S.db.listStudents(), S.db.allResults()]);
    const st = stu.find(x => x.id === id); if (!st) return go("admin/results");
    const mine = rs.filter(r => r.studentId === id);
    const best = (tid) => { const r = mine.filter(x => x.topicId === tid && x.total); return r.length ? Math.max(...r.map(x => Math.round(pctOf(x) * 100))) : null; };
    const topics = LESSONS.filter(l => l.cls === st.cls);
    const done = topics.filter(t => best(t.id) != null); const avg = done.length ? Math.round(done.reduce((a, t) => a + best(t.id), 0) / done.length) : 0;
    const grade = avg >= 90 ? "A+" : avg >= 75 ? "A" : avg >= 60 ? "B" : avg >= 40 ? "C" : done.length ? "D" : "—";
    const games = mine.filter(r => /quick-quiz|match-game|sentence-game|spelling-game|speak-game/.test(r.topicId));
    const days = new Set(mine.map(r => dayKey(r.at))).size;
    app().innerHTML = header("Report Card", "go('admin/results')") + `<main class="wrap">
    <div class="report card">
      <div class="cert-top">${teacherAvatar(64)}<div><b>Learn from Pallavi Gupta</b><small>English Grammar — Progress Report</small></div></div>
      <div class="rep-info"><div><small>Student</small><b>${esc(st.name)}</b></div><div><small>Class</small><b>${ordinal(st.cls)}</b></div><div><small>Login ID</small><b>${esc(st.id)}</b></div><div><small>Date</small><b>${new Date().toLocaleDateString("en-IN")}</b></div></div>
      <div class="stats"><div class="stat"><b>${done.length}/${topics.length}</b><span>Topics practised</span></div><div class="stat"><b>${avg}%</b><span>Average best score</span></div><div class="stat"><b>${grade}</b><span>Grade</span></div></div>
      <table class="tbl"><tr><th>Topic</th><th>Best score</th><th>Status</th></tr>
      ${topics.map(t => { const b = best(t.id); return `<tr><td>${t.icon} ${esc(t.title.en)}<small lang="hi">${esc(t.title.hi)}</small></td><td>${b == null ? "—" : b + "%"}</td><td class="${b == null ? "" : b >= 60 ? "ok" : "lo"}">${b == null ? "Not started" : b >= 60 ? "Good ✔" : "Needs practice"}</td></tr>`; }).join("")}</table>
      <p><b>Activity:</b> ${mine.length} worksheets · ${games.length} games played · active on ${days} day${days === 1 ? "" : "s"}</p>
      <label>Teacher's remarks<textarea id="remarks" rows="3" placeholder="Riya is improving well in tenses. Needs more practice in prepositions.">${esc(st.remarks || "")}</textarea></label>
      <div class="print-only remarks-print">${esc(st.remarks || "")}</div>
      <div class="cert-foot"><div></div><div><span class="sig">Pallavi Gupta</span><small>Teacher's signature</small></div></div>
    </div>
    <div class="row no-print" style="justify-content:center"><button class="btn ghost" id="saveRem">💾 Save remarks</button><button class="btn primary" onclick="window.print()">🖨 Print / Save as PDF</button>
    ${st.phone ? `<a class="btn ghost" target="_blank" rel="noopener" href="https://wa.me/91${st.phone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(`Progress report — ${st.name} (Class ${st.cls})\nTopics practised: ${done.length}/${topics.length}\nAverage score: ${avg}% (Grade ${grade})\n${st.remarks ? "Remarks: " + st.remarks + "\n" : ""}— Pallavi Gupta`)}">📤 WhatsApp parent</a>` : ""}</div>
    </main>`;
    $("#saveRem").onclick = async () => { try { const v = $("#remarks").value.trim(); await S.db.updateStudent(id, { remarks: v }); $(".remarks-print").textContent = v; toast("Remarks saved", "good"); } catch (e) { toast(e, "bad"); } };
  } catch (e) { toast(e, "bad"); }
}

function adminSettings(body) {
  const demo = S.db.mode === "demo";
  body.innerHTML = `
  <div class="card"><h3>👩‍🏫 Teacher photo & welcome note</h3>
    <div class="row">${teacherAvatar(90)}<label class="btn ghost">Upload photo<input type="file" accept="image/*" id="photoIn" hidden></label>${S.settings.photo ? `<button class="btn ghost" id="rmPhoto">Use default photo</button>` : ""}</div>
    <label>Welcome note on login screen<textarea id="welcome" rows="2" placeholder="Welcome to my grammar class!">${esc(S.settings.welcome || "")}</textarea></label>
    <label>Your WhatsApp number (for "Forgot password" & parent contact)<input id="tPhone" inputmode="tel" placeholder="9876543210" value="${esc(S.settings.phone || "")}"></label>
    <button class="btn primary" id="saveWel">Save</button>
  </div>
  ${demo ? `<div class="card"><h3>🔐 Admin password (demo mode)</h3><label>New password<input id="newAdm" type="password" minlength="4"></label><button class="btn primary" id="saveAdm">Change password</button></div>` : `<div class="card"><h3>🔐 Admin account</h3><p class="hint">Change the admin password in Firebase console → Authentication → Users.</p></div>`}
  <div class="card"><h3>📲 Install / share</h3><p>Send this link to parents. They open it on the phone and tap <b>Install</b> (Android) or <b>Share → Add to Home Screen</b> (iPhone).</p>
    <pre class="cred">${esc(location.origin + location.pathname)}</pre><div class="row"><button class="btn ghost" onclick="go('install')">📲 Install page</button><button class="btn ghost" onclick="copyLink(location.origin + location.pathname + '#install')">📋 Copy install link</button><button class="btn primary" onclick="shareApp()">Share on WhatsApp</button></div>
    <p class="hint">Tip: send the <b>install link</b> (ends with #install). It opens straight on the install steps for that phone.</p></div>
  ${demo ? `<div class="card"><h3>💾 Backup & restore</h3><p class="hint">In demo mode all data lives in this browser. Download a backup regularly, or before changing phone/computer.</p>
    <div class="row"><button class="btn ghost" id="bkExport">⬇️ Download backup</button><label class="btn ghost">⬆️ Restore backup<input type="file" id="bkImport" accept="application/json,.json" hidden></label></div></div>`
    : `<div class="card"><h3>💾 Backup</h3><p class="hint">Your data is stored safely in Firebase. Use Results → "Download (Excel)" for a copy of all scores.</p></div>`}
  <div class="card"><h3>ℹ️ Status</h3><p>Mode: <b>${demo ? "Demo (this device only)" : "Cloud (Firebase) — syncs on all devices"}</b></p><p>Lessons: ${LESSONS.length} topics · Classes 1–5 · App v${APP_VERSION}</p><p><a href="#privacy">Privacy Policy</a> (link this in the Play Store listing)</p></div>`;
  $("#photoIn").onchange = async (e) => { const f = e.target.files[0]; if (!f) return; try { const p = await resizeImage(f, 300, 0.8); await S.db.saveSettings({ photo: p }); S.settings.photo = p; toast("Photo saved", "good"); route(); } catch (err) { toast(err, "bad"); } };
  const rm = $("#rmPhoto"); if (rm) rm.onclick = async () => { try { await S.db.saveSettings({ photo: "" }); S.settings.photo = ""; route(); } catch (err) { toast(err, "bad"); } };
  $("#saveWel").onclick = async () => { try { const w = $("#welcome").value.trim(); const ph = $("#tPhone").value.replace(/\D/g, "").slice(-10); await S.db.saveSettings({ welcome: w, phone: ph }); S.settings.welcome = w; S.settings.phone = ph; toast("Saved", "good"); } catch (err) { toast(err, "bad"); } };
  const ex = $("#bkExport"); if (ex) ex.onclick = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(S.db.exportAll(), null, 1)], { type: "application/json" })); a.download = `pallavi-app-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); toast("Backup downloaded", "good"); };
  const im = $("#bkImport"); if (im) im.onchange = async (e) => { const f = e.target.files[0]; if (!f) return; try { const o = JSON.parse(await f.text()); if (!confirm("Restore this backup? Current data on this device will be replaced.")) return; S.db.importAll(o); toast("Backup restored", "good"); setTimeout(() => location.reload(), 600); } catch { toast("This is not a valid backup file", "bad"); } };
  const sa = $("#saveAdm"); if (sa) sa.onclick = async () => { const p = $("#newAdm").value; if (p.length < 4) return toast("At least 4 characters", "bad"); await S.db.saveSettings({ adminPassword: p }); S.settings.adminPassword = p; toast("Admin password changed", "good"); };
}

/* ===================== MODAL & INSTALL ===================== */
function modal(html) {
  const m = document.createElement("div"); m.className = "modal";
  m.innerHTML = `<div class="modal-box">${html}<button class="btn ghost close" onclick="this.closest('.modal').remove()">Close</button></div>`;
  m.onclick = (e) => { if (e.target === m) m.remove(); };
  document.body.appendChild(m);
}
/* ---------- INSTALL (Android + iPhone + computer) ---------- */
let deferredPrompt = null;
const UA = navigator.userAgent;
const DEV = {
  ios: /iphone|ipad|ipod/i.test(UA) || (/Macintosh/.test(UA) && navigator.maxTouchPoints > 1),
  android: /android/i.test(UA),
  inApp: /FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Line\/|Snapchat|Twitter|LinkedInApp|; wv\)/i.test(UA),
};
DEV.iosSafari = DEV.ios && /Safari/i.test(UA) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(UA) && !DEV.inApp;
DEV.mobile = DEV.ios || DEV.android;
const isInstalled = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
const appUrl = () => location.origin + location.pathname;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredPrompt = e; $$(".one-tap").forEach(b => b.hidden = false); });
window.addEventListener("appinstalled", () => { deferredPrompt = null; try { localStorage.setItem("lpg_installed", "1"); } catch { } confetti(); toast("App installed! Find it on your home screen 🎉", "good"); if (location.hash === "#install") renderInstall(); });

window.doInstall = async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt(); const c = await deferredPrompt.userChoice; deferredPrompt = null;
    if (c && c.outcome === "accepted") toast("Installing… ✅", "good");
    return;
  }
  go("install");
};
window.showInstall = () => window.doInstall();
window.copyLink = async (u) => {
  u = u || appUrl();
  try { await navigator.clipboard.writeText(u); toast("Link copied — paste it in Chrome / Safari", "good"); }
  catch { prompt("Copy this link:", u); }
};
window.shareApp = async () => {
  const data = { title: "Learn from Pallavi Gupta", text: "English Grammar app (Class 1–5) in English & Hindi. Install it free:", url: appUrl() + "#install" };
  if (navigator.share) { try { await navigator.share(data); } catch { } }
  else window.open("https://wa.me/?text=" + encodeURIComponent(data.text + " " + data.url), "_blank");
};
window.dismissInstallBar = () => { try { localStorage.setItem("lpg_hideInstall", Date.now()); } catch { } const b = $(".install-bar"); if (b) b.remove(); };
function installBar() {
  if (isInstalled()) return "";
  let hid = 0; try { hid = +localStorage.getItem("lpg_hideInstall") || 0; } catch { }
  if (Date.now() - hid < 3 * 864e5) return "";
  return `<div class="install-bar"><img src="icons/icon-192.png" alt=""><div><b>Install the app</b><small>${DEV.ios ? "Add to your iPhone home screen" : "One tap · works offline · free"}</small></div>
    <button class="btn primary sm" onclick="doInstall()">Install</button><button class="x" aria-label="Close" onclick="dismissInstallBar()">✕</button></div>`;
}
const SHARE_ICON = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#0a84ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"/><path d="M8 7l4-4 4 4"/><path d="M6 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1"/></svg>`;
const ADD_ICON = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg>`;
const DOTS_ICON = `<svg viewBox="0 0 24 24" width="22" height="22" fill="#333"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>`;

function renderInstall(tab) {
  tab = tab || (DEV.ios ? "iphone" : DEV.android ? "android" : "computer");
  const url = appUrl();
  const intent = `intent://${location.host}${location.pathname}#Intent;scheme=${location.protocol.replace(":", "")};package=com.android.chrome;end`;
  const tabBtn = (k, l) => `<button class="tab ${tab === k ? "on" : ""}" onclick="renderInstall('${k}')">${l}</button>`;
  let body = "";
  if (tab === "android") body = `
    ${DEV.android && DEV.inApp ? `<div class="warn-box">⚠️ You opened this inside another app (WhatsApp / Instagram). Open it in <b>Chrome</b> to install.<br><span lang="hi">इसे Chrome में खोलें, फिर इंस्टॉल करें।</span>
      <a class="btn primary big" href="${esc(intent)}">Open in Chrome</a><button class="btn ghost" onclick="copyLink()">📋 Copy link</button></div>` : ""}
    <button class="btn primary big one-tap" ${deferredPrompt ? "" : "hidden"} onclick="doInstall()">📲 Install now — one tap</button>
    <ol class="steps">
      <li><span class="n">1</span><div>Open this page in <b>Google Chrome</b>.<small lang="hi">यह पेज Google Chrome में खोलें।</small></div></li>
      <li><span class="n">2</span><div>Tap the <b>⋮</b> menu ${DOTS_ICON} at the top-right corner.<small lang="hi">ऊपर दाईं ओर ⋮ मेनू पर टैप करें।</small></div></li>
      <li><span class="n">3</span><div>Tap <b>Install app</b> (or <b>Add to Home screen</b>).<small lang="hi">"Install app" या "Add to Home screen" चुनें।</small></div></li>
      <li><span class="n">4</span><div>Tap <b>Install</b>. The app icon appears on your home screen. ✅<small lang="hi">Install दबाएँ — ऐप का आइकन होम स्क्रीन पर आ जाएगा।</small></div></li>
    </ol>`;
  else if (tab === "iphone") body = `
    ${DEV.ios && !DEV.iosSafari ? `<div class="warn-box">⚠️ On iPhone, apps install from <b>Safari</b>. Copy the link and open it in Safari.<br><span lang="hi">iPhone पर ऐप Safari से इंस्टॉल होता है। लिंक कॉपी करके Safari में खोलें।</span>
      <button class="btn primary big" onclick="copyLink()">📋 Copy link for Safari</button></div>` : ""}
    <ol class="steps">
      <li><span class="n">1</span><div>Open this page in <b>Safari</b> 🧭.<small lang="hi">यह पेज Safari में खोलें।</small></div></li>
      <li><span class="n">2</span><div>Tap the <b>Share</b> button ${SHARE_ICON} at the bottom of the screen (on iPad: at the top).<small lang="hi">नीचे Share बटन पर टैप करें (iPad पर ऊपर)।</small></div></li>
      <li><span class="n">3</span><div>Scroll down and tap <b>Add to Home Screen</b> ${ADD_ICON}<small lang="hi">नीचे स्क्रॉल करके "Add to Home Screen" चुनें।</small></div></li>
      <li><span class="n">4</span><div>Tap <b>Add</b> at the top-right. Done! ✅<small lang="hi">ऊपर दाईं ओर "Add" दबाएँ। हो गया!</small></div></li>
    </ol>
    ${DEV.iosSafari ? `<div class="ios-arrow">Tap ${SHARE_ICON} below<span>⬇</span></div>` : ""}`;
  else body = `
    <p>Scan this code with your phone camera to open the app, then install it.<br><span lang="hi">फ़ोन के कैमरे से यह कोड स्कैन करें, फिर ऐप इंस्टॉल करें।</span></p>
    <img class="qr" alt="QR code for the app link" src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(url + "#install")}" onerror="this.replaceWith(Object.assign(document.createElement('p'),{className:'hint',textContent:'(QR code needs internet)'}))">
    <button class="btn primary one-tap" ${deferredPrompt ? "" : "hidden"} onclick="doInstall()">💻 Install on this computer</button>`;
  app().innerHTML = header("Install the App", "go('')") + `<main class="wrap install-page">
    <div class="inst-hero">
      <img src="icons/icon-512.png" alt="App icon" class="inst-icon">
      <div><h2>Learn from Pallavi Gupta</h2><p>English Grammar · Class 1–5 · English & हिंदी</p>
      <div class="inst-tags"><span>✅ Free</span><span>📶 Works offline</span><span>🚫 No Play Store needed</span></div></div>
    </div>
    ${isInstalled() ? `<div class="card ok-box">✅ The app is already installed on this device. <span lang="hi">ऐप पहले से इंस्टॉल है।</span><button class="btn primary big" onclick="go('')">Open the app</button></div>` : `
    <div class="tabs">${tabBtn("android", "🤖 Android")}${tabBtn("iphone", "📱 iPhone / iPad")}${tabBtn("computer", "💻 Computer")}</div>
    <div class="card">${body}</div>`}
    <div class="card share-card"><h3>📤 Share with parents & students</h3>
      <pre class="cred">${esc(url)}</pre>
      <div class="row"><button class="btn ghost" onclick="copyLink()">📋 Copy link</button><button class="btn primary" onclick="shareApp()">Share on WhatsApp</button></div></div>
  </main>`;
}
window.renderInstall = renderInstall;

/* ===================== START ===================== */
(async function start() {
  applyTextSize();
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => { });
  S.db = window.FIREBASE_CONFIG ? new FireDB(window.FIREBASE_CONFIG) : new LocalDB();
  try { await S.db.init(); } catch (e) {
    app().innerHTML = `<div class="wrap"><div class="card err">Could not connect to the server. Check internet and refresh.<br><small>${esc(friendly(e))}</small></div><button class="btn primary" onclick="location.reload()">🔄 Retry</button></div>`; return;
  }
  try { S.settings = await S.db.getSettings() || {}; } catch { S.settings = {}; }
  if (!S.settings.phone && window.TEACHER_PHONE) S.settings.phone = String(window.TEACHER_PHONE);
  S.session = await S.db.restoreSession();
  if (S.session) await loadData();
  route();
})();
