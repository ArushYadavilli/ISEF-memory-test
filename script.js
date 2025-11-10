// ======== Configuration ========

// Wordsets: each is an array of 12 [leftWord, rightWord] pairs.
// Keep pairs simple and consistent (lowercase, single words) for clean matching.
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

// Study display duration per pair (milliseconds)
const STUDY_MS = 3000;

// Max time allowed to answer each cue during recall (milliseconds)
const ANSWER_TIME_LIMIT = 8000;

// ======== State ========

// Current study week number entered by the user
let weekNumber = null;

// Index of the selected wordset (0, 1, or 2)
let wordsetIndex = 0;

// The active set of word pairs for this session
let pairs = [];

// Which round we’re in (1, 2, or 3)
let currentRound = 0;

// Index of the current pair being shown during study
let studyIdx = 0;

// Timer reference for study phase (so we can clear it later)
let studyTimer = null;

// Index of the current cue being asked during a recall round
let currentCueIndex = 0;

// How many correct answers the user has given in the current round
let currentCorrect = 0;

// Time reference for the 5-second  window during test phase
let answerTimer = null;

//Score variables for each round
let roundOneScore = 0;
let roundTwoScore = 0;
let roundThreeScore = 0;

// ======== Elements ========

// Label at the top showing current phase (Setup, Study, Round, Summary)
let phaseLabelEl;

// Progress bar element
let progressBarEl;

// Sections of the app (only one is visible at a time)
let setupSection;
let studySection;
let roundSection;
let summarySection;

// Input for week number and Start button
let weekInput;
let startBtn;

// Elements showing the left and right words during study
let pairLeftEl;
let pairRightEl;

// Round title (e.g., "Round 1")
let roundTitleEl;

// Container for the current cue + input
let roundListEl;

// Submit button for each cue
let submitRoundBtn;

// Score elements for each round
let scoreR1El;
let scoreR2El;
let scoreR3El;

// ======== Utility Functions ========
// Switches the app to a given phase and updates the UI
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

// Keeps the progress bar value safely between 0 and 100
function clampProgress(pct) {
  progressBarEl.style.width = `${Math.max(0, Math.min(100, pct))}%`;
}
// Chooses which wordset to use based on the week number
function selectWordset(weekNum) {
  const idx = ((weekNum % 3) + 3) % 3; // normalize modulo result
  const map = { 1: 0, 2: 1, 0: 2 };    // map remainder to wordset index
  return map[idx];
}

// Randomizes the order of items in an array
function shuffle(arr) {
  const a = arr.slice(); // copy array
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]; // swap
  }
  return a;
}

// Sends Data to the form
function submitResults({participantId, weekNumber, r1, r2, r3}){
  const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLSdAfI1-AVjHhCga1_Lv-geS1Ih_0tOL5wQ_F2vv8dma8GGVLQ/formResponse"
  const data = new FormData();

  data.append("entry.1852794725", participantId);
  data.append("entry.312291640", weekNumber);
  data.append("entry.1830333204", r1);
  data.append("entry.1863797794", r2);
  data.append("entry.625268846", r3);

  fetch(formUrl, {
    method: "POST",
    body: data,
    mode: "no-cors"
  
  })
  .then(() => {
    console.log("Results Submitted to Google Forms");
  })
  .catch(err => {
    console.error("Submission failed:", err);
  });
}
    
  
// Cleans up user input for comparison (lowercase + trimmed)
function normalize(s) {
  return (s || "").trim().toLowerCase();
}

// ======== Study Phase ========

// Begins the study phase: shuffle pairs, show them one by one
function startStudy() {
  setPhase("study");
  studyIdx = 0;
  pairs = shuffle(pairs); // randomize order each study round
  clampProgress(0);
  renderStudyPair();
  studyTimer = setInterval(nextStudyPair, STUDY_MS);
}

// Shows the current pair during study and updates progress
function renderStudyPair() {
  const [L, R] = pairs[studyIdx];
  pairLeftEl.textContent = L;
  pairRightEl.textContent = R;
  const pct = (studyIdx / pairs.length) * 100;
  clampProgress(pct);
}

// Advances to the next pair during study, or moves into Round 1 if finished
function nextStudyPair() {
  studyIdx++;
  if (studyIdx >= pairs.length) {
    clearInterval(studyTimer);
    clampProgress(100);
    startRound(1); // move into first recall round
    return;
  }
  renderStudyPair();
}

// ======== Round Phase ========

// Begins a recall round (Round 1, 2, or 3)
function startRound(n) {
  currentRound = n;
  currentCorrect = 0;
  setPhase("round");
  roundTitleEl.textContent = `Round ${n}`;

  // Shuffle the order of cues for this round
  currentOrder = shuffle(pairs.map((_, i) => i));
  currentCueIndex = 0;

  // Show the first cue
  showNextCue();
}

// Shows the next cue in the current round
function showNextCue() {
  roundListEl.innerHTML = "";

  // If we've gone through all cues in this round
  if (currentCueIndex >= currentOrder.length) {
    // Save score for this round
    if (currentRound === 1) roundOneScore = currentCorrect;
    if (currentRound === 2) roundTwoScore = currentCorrect;
    if (currentRound === 3) roundThreeScore = currentCorrect;

    // Move to next study/round or summary
    if (currentRound < 3) {
      startStudyAgainThenRound(currentRound + 1);
    } else {
      showSummary();
    }
    return;
  }

  // Get the current cue (always left word) and target (right word)
  const idx = currentOrder[currentCueIndex];
  const cue = pairs[idx][0];
  const target = pairs[idx][1];

  // Build UI for this cue
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

  // Start 5-second auto-advance timer
  if (answerTimer) clearTimeout(answerTimer);
  answerTimer = setTimeout(() => {
    currentCueIndex++;
    showNextCue();
  }, ANSWER_TIME_LIMIT);

  // Submit button logic
  submitRoundBtn.onclick = () => {
    clearTimeout(answerTimer);
    const val = normalize(inputEl.value);
    if (val === normalize(target)) {
      currentCorrect++;
    }
    currentCueIndex++;
    showNextCue();
  };
};

// Repeats the study phase before moving into the next round
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

// ======== Summary Phase ========

// Displays the scores after all three rounds
function showSummary() {
  setPhase("summary");
  scoreR1El.textContent = `${roundOneScore}/12 (Week ${weekNumber})`;
  scoreR2El.textContent = `${roundTwoScore}/12 (Week ${weekNumber})`;
  scoreR3El.textContent = `${roundThreeScore}/12 (Week ${weekNumber})`;
  clampProgress(100);

  const participantId = document.getElementById("participant-id").value.trim();
  
  submitResults({
    participantId: participantIdInput.value.trim(),
    weekNumber,
    r1: roundOneScore,
    r2: roundTwoScore,
    r3: roundThreeScore
  });
}

// ======== Bootstrapping / Event Listeners ========

document.addEventListener("DOMContentLoaded", () => {
  // Cache references to DOM elements
  phaseLabelEl = document.getElementById("phase-label");
  progressBarEl = document.getElementById("progress-bar");

  setupSection = document.getElementById("setup-section");
  studySection = document.getElementById("study-section");
  roundSection = document.getElementById("round-section");
  summarySection = document.getElementById("summary-section");

  weekInput = document.getElementById("week-input");
  participantIdInput = document.getElementById("participant-id");
  startBtn = document.getElementById("start-btn");

  pairLeftEl = document.getElementById("pair-left");
  pairRightEl = document.getElementById("pair-right");

  roundTitleEl = document.getElementById("round-title");
  roundListEl = document.getElementById("round-list");
  submitRoundBtn = document.getElementById("submit-round-btn");

  scoreR1El = document.getElementById("score-r1");
  scoreR2El = document.getElementById("score-r2");
  scoreR3El = document.getElementById("score-r3");

  
    // Start button listener
  startBtn.addEventListener("click", () => {
    const participantId = participantIdInput.value.trim();
    const val = parseInt(weekInput.value, 10);
    if(!participantId){
      alert("Please enter your Participant ID given to you when you signed up");
      return;
    }
    if (!val || val < 1) {
      alert("Please enter a valid week number (>=1).");
      return;
    }
    weekNumber = val;
    wordsetIndex = selectWordset(weekNumber);

    // Build pairs from the chosen wordset
    pairs = WORDSETS[wordsetIndex].map(([L, R]) => [L, R]);

    // Begin study phase
    startStudy();
  });

});
