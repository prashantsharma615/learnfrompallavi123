# Learn from Pallavi Gupta — Setup Guide

Built with plain **HTML, CSS and JavaScript** — no frameworks, nothing to install. Firebase is used only to store logins and scores online.

English Grammar app for Class 1–5. Every lesson is explained in **English and Hindi**, and every topic has a **worksheet** that checks answers automatically.
It works on **Android and iPhone**: students open a link once and install it on the home screen like a normal app.

---

## What's inside

**For students**
- **52 grammar topics** (Class 1 to 5, 10–12 topics per class) with **267 auto-checked worksheet questions**. Each one has an explanation, rules, examples and Pallavi Ma'am's tip.
- A switch on every lesson to show **English / हिंदी / Both**.
- 🔊 Read-aloud button on every line, in both English and Hindi voices.
- A built-in practice worksheet for every topic, plus worksheets the teacher adds. Answers are checked instantly and students earn ⭐ stars.
- A **Print** button that turns any worksheet into a paper sheet with Name, Date and Score lines.
- A "My Progress" page.
- Students start in their own class but can also look at other classes.

- 🏠 **Bottom menu:** Learn · Games · Badges · Progress, like a real app.
- ✨ **Word of the Day** with its Hindi meaning, an example and a read-aloud button.
- 🔍 **Search** any topic in English or Hindi.
- ⬅️ ➡️ **Previous / Next topic** buttons at the end of every lesson.
- 🎮 **Games Zone:**
  - **Sentence Builder:** tap jumbled words into the right order (the Hindi meaning is shown).
  - **Spelling Bee:** hear a word and type its spelling.
  - **Speak English:** say a sentence into the mic and the app checks it. Works in Chrome and in iPhone Safari.
  - **Quick Quiz:** 10 random questions from a class, with a timer.
  - **Match the Pairs:** opposites, one & many, masculine & feminine, past tense, and English–Hindi words.
- 🔥 **Daily streak** and 🏅 **11 badges**, with confetti when a student earns one.
- 🎓 **Printable certificate**, signed by Pallavi Gupta, when a student scores 60% or more in every topic of their class.
- 📢 **Notices and homework** from the teacher appear at the top of the home screen, with a due date and a button that opens the linked topic.

**For admin (Pallavi Ma'am)**
- **Students:** create a Login ID and password (🎲 makes a password for you), send the login to parents on WhatsApp, change a password or class, pause a login or delete a student.
- **Worksheets:** add a worksheet to any class and topic. It can have auto-checked questions (multiple choice, fill in the blank, true/false), a photo or scan of a paper worksheet, and/or a Google Drive PDF link.
- **Add many students at once:** paste a list in the form `Name, Class, LoginID, Password`.
- **Notices:** post a notice or homework to all classes or to one class.
- **Add your own lessons (no coding):** Admin → 📚 Lessons → "Add your own lesson". Enter the title, explanation, rules and examples in English and Hindi, plus practice questions. Students see it straight away.
- **Report cards:** tap a student in Results (or 📄 in Students) to open a printable report card. It shows each topic's best score, a grade and your remarks, and has a WhatsApp button to send a summary to parents.
- **Results:** every student's scores, averages and when they were last active. **Download (Excel)** exports a CSV file.
- **Settings:** upload the teacher's photo (it shows on the login screen and in the app) and write a welcome note.

---

## Files

| File | What it is |
|---|---|
| `index.html` | App page (HTML) |
| `style.css` | All design and colours (CSS) |
| `app.js` | App logic (login, lessons, worksheets, admin) |
| `content.js` | **All lessons, worksheets, Word of the Day, game words and sentences.** You can also add lessons from the Admin panel without editing code. |
| `firebase-config.js` | Paste your Firebase keys here (Step 2) |
| `firestore.rules` | Database security rules (Step 2) |
| `manifest.json`, `sw.js`, `icons/` | Make it installable and work offline |
| `icons/pallavi.jpg` | Pallavi Gupta's photo (app producer). Replace this file to change the built-in photo. |

---

## Step 1 — Try it now (demo mode, about 2 minutes)

1. Go to **https://app.netlify.com/drop** and drag the whole `learn-from-pallavi-gupta` folder onto the page. You get a link like `https://xyz.netlify.app`.
2. Open the link, choose **Admin** and log in with the password **admin123**. Then create a student and log in as that student.

⚠️ In demo mode, data is saved **only on that one phone or computer**. To let students log in from their own phones, do Step 2.

## Step 2 — Connect Firebase so logins work on every phone (free, about 15 minutes)

1. Go to **https://console.firebase.google.com** → **Add project** → name it `learn-from-pallavi` (you can turn Analytics off).
2. **Build → Authentication → Get started → Email/Password → Enable → Save.**
3. In **Authentication → Users → Add user**, create the admin account:
   - Email: `admin@learnfrompallavi.app` (or any email; if you use a different one, change it in **both** `firebase-config.js` and `firestore.rules`)
   - Password: choose a strong one. This is the admin login.
4. **Build → Firestore Database → Create database** → choose the `asia-south1 (Mumbai)` location → **Start in production mode**.
5. Open the **Rules** tab, paste everything from `firestore.rules`, and click **Publish**.
6. Go to **Project settings (⚙️) → Your apps → Web (</>)**, register an app, and copy the `firebaseConfig` block.
7. Open `firebase-config.js` and replace `window.FIREBASE_CONFIG = null;` with your config, like the example in that file.
8. Upload the folder again to Netlify (drag and drop onto your site's **Deploys** page).
9. In Firebase, go to **Authentication → Settings → Authorized domains** and add your Netlify domain (for example `xyz.netlify.app`).

The yellow "Demo mode" bar will disappear. From now on, every student account, worksheet and score is stored online and works on every phone.

> The free Firebase "Spark" plan is plenty for hundreds of students.

## Step 3 — Install on phones

Send the Netlify link to parents. You can use the 📤 WhatsApp button in Admin → Students.

- **Android (Chrome):** open the link → tap **⋮ menu → Install app** (or tap "Install this app" on the login screen).
- **iPhone/iPad (Safari):** open the link → tap **Share (□↑) → Add to Home Screen → Add**.

The app gets its own icon and opens full-screen like any other app. Lessons that have already been opened also work without internet.

## Step 4 (optional) — Publish on Google Play Store / Apple App Store

- **Play Store:** go to **https://www.pwabuilder.com**, enter your Netlify link, and choose **Package for stores → Android**. It creates the file to upload in the Google Play Console. A Play developer account costs a one-time $25.
- **App Store:** PWABuilder can also make an iOS package, but you need an Apple Developer account ($99/year) and a Mac with Xcode to submit it. Until then, "Add to Home Screen" on iPhone works perfectly well.

---

## Editing lessons

Open `content.js`. Each topic looks like this:

```js
{id:"c2-pronouns", cls:2, icon:"🙋",
 title:{en:"Pronouns", hi:"सर्वनाम"},
 intro:{en:"...", hi:"..."},
 points:[{en:"...", hi:"..."}],
 examples:[{en:"...", hi:"..."}],
 tip:{en:"...", hi:"..."},
 ws:[ {t:"mcq", q:"Question", o:["A","B","C"], a:1},   // a = index of the correct option (0 = first)
      {t:"fill", q:"one cup — two ___", a:["cups"]},
      {t:"tf", q:"'sing' is a verb.", a:true} ]}
```

To add a topic, copy one block, give it a new `id`, and set `cls` to the class number. Teacher worksheets added through the Admin panel need **no** code changes.

## Notes
- Student passwords are kept so the admin can see them and share them again. Only the admin and that student can read them.
- Deleting a student blocks that login straight away.
- Photo worksheets are compressed automatically. Use a clear, well-lit photo.
