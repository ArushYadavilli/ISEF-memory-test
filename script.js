// ======== Configuration ========
const WORDSETS = [
  [
    ["cat", "ring"], ["sun", "jam"], ["bed", "rope"], ["fish", "bell"],
    ["tree", "mask"], ["star", "shoe"], ["book", "coal"], ["rain", "gold"],
    ["glass", "farm"], ["road", "leaf"], ["bread", "wave"], ["clock", "sand"],
  ],
  [
    ["ship", "barn"], ["salt", "glove"], ["stone", "card"], ["wind", "seat"],
    ["lamp", "knot"], ["foot", "surf"], ["milk", "twig"], ["ring", "cup"],
    ["seed", "mine"], ["bell", "sky"], ["leaf", "hook"], ["mask", "page"],
  ],
  [
    ["coal", "bed"], ["gate", "fish"], ["wave", "bread"], ["sand", "star"],
    ["chair", "rain"], ["hand", "glass"], ["card", "sun"], ["wheel", "book"],
    ["barn", "cat"], ["rope", "tree"], ["bird", "road"], ["jam", "ship"],
  ],
];

const STUDY_MS = 3000;
const ANSWER_TIME_LIMIT = 5000; // 5 seconds

// ======== State ========
let weekNumber = null;
let wordsetIndex = 0;
let pairs = [];
let currentRound = 0;
let studyIdx = 0;
let studyTimer = null;
let currentOrder = [];
let currentCueIndex = 0;
let currentCorrect = 0;
let answerTimer = null;

// Score variables
let roundOneScore = 0;
let roundTwoScore = 0;
let roundThreeScore = 0;

// ======== Elements ========
let phaseLabelEl, progressBarEl;
let setupSection, studySection, roundSection, summarySection;
let weekInput, startBtn, skipBtn;
let pairLeftEl, pairRightEl;
let roundTitleEl, roundListEl, submitRoundBtn;
let scoreR1El, scoreR2El, scoreR3El, restartBtn;

// ======== Utils ========
function setPhase(name) {
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
  pairs = shuffle(pairs); // randomize order each study round
  clampProgress(0);
  renderStudyPair();
  studyTimer = setInterval(nextStudyPair, STUDY_MS);
}

function renderStudyPair() {
  const [L, R] = pairs[studyIdx];
  pairLeftEl.textContent = L;
  pairRightEl.textContent = R;
  const pct = (studyIdx / pairs.length) * 100;
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

// ======== Rounds (one cue at a time, left word only) ========
function startRound(n) {
  currentRound = n;
  currentCorrect = 0;
  setPhase("round");
  roundTitleEl.textContent = `Round ${n}`;

  currentOrder = shuffle(pairs.map((_, i) => i));
  currentCueIndex = 0;
  showNextCue();
}

function showNextCue() {
  roundListEl.innerHTML = "";

  if (currentCueIndex >= currentOrder.length) {
    if (currentRound === 1) roundOneScore = currentCorrect;
    if (currentRound === 2) roundTwoScore = currentCorrect;
    if (currentRound === 3) roundThreeScore = currentCorrect;

    if (currentRound < 3) {
      startStudyAgainThenRound(currentRound + 1);
    } else {
      showSummary();
    }
    return;
  }

  const idx = currentOrder[currentCueIndex];
  const cue = pairs[idx][0];       // always left word
  const target = pairs[idx][1];    // always right word

  const item = document.createElement("div");
  item.className = "round-item";

  const cueEl = document.createElement("div");
  cueEl.className = "cue";
  cueEl.textContent = cue;

  const inputEl = document.createElement("input");
  inputEl.type = "text";
  inputEl.placeholder = "Type the matching word";
  inputEl.autocomplete = "off";

  item.appendChild(cueEl);
  item.appendChild(inputEl);
  roundListEl.appendChild(item);

  inputEl.focus();

  // Start 5-second timer
  if (answerTimer) clearTimeout(answerTimer);
  answerTimer = setTimeout(() => {
    currentCueIndex++;
    showNextCue();
  }, ANSWER_TIME_LIMIT);

  // Submit button
  submitRoundBtn.onclick = () => {
    clearTimeout(answerTimer);
    const val = normalize(inputEl.value);
    if (val === normalize(target)) {
      currentCorrect++;
    }
    currentCueIndex++;
    showNextCue();
  };

  // Skip button
  skipBtn.onclick = () => {
    clearTimeout(answerTimer);
    currentCueIndex++;
    showNextCue();
  };
}

function startStudyAgainThenRound(nextRoundNum) {
  setPhase("study");
  studyIdx = 0;
  pairs = shuffle(pairs); // randomize order again
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
  scoreR1El.textContent = `${roundOneScore}/12 (Week ${weekNumber})`;
  scoreR2El.textContent = `${roundTwoScore}/12 (Week ${weekNumber})`;
  scoreR3El.textContent = `${roundThreeScore}/12 (Week ${weekNumber})`;
  clampProgress(100);
}

// ======== Boot & Event Listeners ========
document.addEventListener("DOMContentLoaded", () => {
  phaseLabelEl = document.getElementById("phase-label");
  progressBarEl = document.getElementById("progress-bar");

  setupSection = document.getElementById("setup-section");
  studySection = document.getElementById("study-section");
  roundSection = document.getElementById("round-section");
  summarySection = document.getElementById("summary-section");

  weekInput = document.getElementById("week-input");
  startBtn = document.getElementById("start-btn");
  skipBtn = document.getElementById("skip-study-btn"); // reused as Skip in rounds

  pairLeftEl = document.getElementById("pair-left");
  pairRightEl = document.getElementById("pair-right");

  roundTitleEl = document.getElementById("round-title");
  roundListEl = document.getElementById("round-list");
  submitRoundBtn = document.getElementById("submit-round-btn");

  scoreR1El = document.getElementById("score-r1");
  scoreR2El = document.getElementById("score-r2");
  scoreR3El = document.getElementById("score-r3");
  restartBtn = document.getElementById("restart-btn");

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
});
