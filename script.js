// ======== Configuration ========

// Three distinct wordsets, each 12 one-syllable, unrelated pairs.
const WORDSETS = [
  // Wordset 1
  [
    ["cat", "ring"],
    ["sun", "jam"],
    ["bed", "rope"],
    ["fish", "bell"],
    ["tree", "mask"],
    ["star", "shoe"],
    ["book", "coal"],
    ["rain", "gold"],
    ["glass", "farm"],
    ["road", "leaf"],
    ["bread", "wave"],
    ["clock", "sand"],
  ],
  // Wordset 2
  [
    ["ship", "barn"],
    ["salt", "glove"],
    ["stone", "card"],
    ["wind", "seat"],
    ["lamp", "knot"],
    ["foot", "surf"],
    ["milk", "twig"],
    ["ring", "cup"],
    ["seed", "mine"],
    ["bell", "sky"],
    ["leaf", "hook"],
    ["mask", "page"],
  ],
  // Wordset 3
  [
    ["coal", "bed"],
    ["gate", "fish"],
    ["wave", "bread"],
    ["sand", "star"],
    ["chair", "rain"],
    ["hand", "glass"],
    ["card", "sun"],
    ["wheel", "book"],
    ["barn", "cat"],
    ["rope", "tree"],
    ["bird", "road"],
    ["jam", "ship"],
  ],
];

// Study display time per pair (ms)
const STUDY_MS = 3000;

// ======== State ========

let weekNumber = null;
let wordsetIndex = 0;
let pairs = []; // active 12 pairs
let phase = "setup"; // setup | study | round | summary
let currentRound = 0; // 1..3
let studyIdx = 0;
let studyTimer = null;
let answersByRound = { 1: [], 2: [], 3: [] };
let scoresByRound = { 1: 0, 2: 0, 3: 0 };

// ======== Elements ========

const phaseLabelEl = document.getElementById("phase-label");
const progressBarEl = document.getElementById("progress-bar");

const setupSection = document.getElementById("setup-section");
const studySection = document.getElementById("study-section");
const roundSection = document.getElementById("round-section");
const summarySection = document.getElementById("summary-section");

const weekInput = document.getElementById("week-input");
const startBtn = document.getElementById("start-btn");
const skipStudyBtn = document.getElementById("skip-study-btn");

const pairLeftEl = document.getElementById("pair-left");
const pairRightEl = document.getElementById("pair-right");

const roundTitleEl = document.getElementById("round-title");
const roundListEl = document.getElementById("round-list");
const submitRoundBtn = document.getElementById("submit-round-btn");

const scoreR1El = document.getElementById("score-r1");
const scoreR2El = document.getElementById("score-r2");
const scoreR3El = document.getElementById("score-r3");
const restartBtn = document.getElementById("restart-btn");

// ======== Utils ========

function setPhase(name) {
  phase = name;
  phaseLabelEl.textContent =
    name === "setup" ? "Setup" :
    name === "study" ? "Study" :
    name === "round" ? `Round ${currentRound}` :
    name === "summary" ? "Summary" : "";

  setupSection.classList.toggle("active", name === "setup");
  studySection.classList.toggle("active", name === "study");
  roundSection.classList.toggle("active", name === "round");
  summarySection.classList.toggle("active", name === "summary");
}

function clampProgress(pct) {
  progressBarEl.style.width = `${Math.max(0, Math.min(100, pct))}%`;
}

function selectWordset(weekNum) {
  // Cycle week number through sets: week % 3
  const idx = ((weekNum % 3) + 3) % 3;
  const map = { 1: 0, 2: 1, 0: 2 };
  return map[idx];
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalize(s) {
  return (s || "").trim().toLowerCase();
}

// ======== Study Phase ========

function startStudy() {
  setPhase("study");
  studyIdx = 0;
  clampProgress(0);
  renderStudyPair();
  studyTimer = setInterval(nextStudyPair, STUDY_MS);
}

function renderStudyPair() {
  const [L, R] = pairs[studyIdx];
  pairLeftEl.textContent = L;
  pairRightEl.textContent = R;
  const pct = ((studyIdx) / pairs.length) * 100;
  clampProgress(pct);
}

function nextStudyPair() {
  studyIdx++;
  if (studyIdx >= pairs.length) {
    clearInterval(studyTimer);
    clampProgress(100);
    startRound(1);
    return;
  }
  renderStudyPair();
}

// ======== Rounds ========

function startRound(n) {
  currentRound = n;
  setPhase("round");
  roundTitleEl.textContent = `Round ${n}`;

  const order = shuffle(pairs.map((p, i) => i));

  roundListEl.innerHTML = "";
  answersByRound[n] = new Array(pairs.length).fill("");

  order.forEach((idx) => {
    const cueSide = Math.random() < 0.5 ? 0 : 1;
    const cue = pairs[idx][cueSide];
    const target = pairs[idx][1 - cueSide];

    const item = document.createElement("div");
    item.className = "round-item";

    const cueEl = document.createElement("div");
    cueEl.className = "cue";
    cueEl.textContent = cue;

    const inputEl = document.createElement("input");
    inputEl.type = "text";
    inputEl.placeholder = "Type the matching word";
    inputEl.autocomplete = "off";
    inputEl.dataset.pairIndex = String(idx);
    inputEl.dataset.target = target;

    item.appendChild(cueEl);
    item.appendChild(inputEl);
    roundListEl.appendChild(item);

    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const inputs = [...roundListEl.querySelectorAll("input")];
        const next = inputs[inputs.indexOf(inputEl) + 1];
        if (next) next.focus();
      }
    });
  });

  const firstInput = roundListEl.querySelector("input");
  if (firstInput) firstInput.focus();

  clampProgress(0);
}

function scoreRound() {
  const inputs = [...roundListEl.querySelectorAll("input")];
  let correct = 0;

  inputs.forEach((inp) => {
    const idx = Number(inp.dataset.pairIndex);
    const target = normalize(inp.dataset.target);
    const val = normalize(inp.value);
    answersByRound[currentRound][idx] = val;
    if (val === target) correct++;
    inp.style.borderColor = val === target ? "var(--success)" : "var(--danger)";
  });

  scoresByRound[currentRound] = correct;
}

function continueFlowAfterRound() {
  if (currentRound < 3) {
    startStudyAgainThenRound(currentRound + 1);
  } else {
    showSummary();
  }
}

function startStudyAgainThenRound(nextRoundNum) {
  setPhase("study");
  studyIdx = 0;
  clampProgress(0);
  renderStudyPair();
  if (studyTimer) clearInterval(studyTimer);
  studyTimer = setInterval(() => {
    studyIdx++;
    if (studyIdx >= pairs.length) {
      clearInterval(studyTimer);
      clampProgress(100);
      startRound(nextRoundNum);
    } else {
      renderStudyPair();
    }
  }, STUDY_MS);
}

function showSummary() {
  setPhase("summary");
  scoreR1El.textContent = `${scoresByRound[1]}/12`;
  scoreR2El.textContent = `${scoresByRound[2]}/12`;
  scoreR3El.textContent = `${scoresByRound[3]}/12`;
  clampProgress(100);
}

// ======== Event Listeners ========

startBtn.addEventListener("click", () => {
  const val = Number(weekInput.value);
  if (!val || val < 1) {
    alert("Please enter a valid week number (1 or higher).");
    weekInput.focus();
    return;
  }
  weekNumber = val;
  wordsetIndex = selectWordset(weekNumber);
  pairs = WORDSETS[wordsetIndex].slice();
  pairs = shuffle(pairs);
  startStudy();
});

skipStudyBtn.addEventListener("click", () => {
  nextStudy
