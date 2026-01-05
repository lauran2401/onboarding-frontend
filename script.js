// script.js
// Frontend event emitter + question loader
// Research instrument only. No analytics. No inference.

// ---- CONFIG ----
const WORKER_URL = "https://onboarding-logger.lauran2401.workers.dev";

// ---- SESSION ----
const session_id = crypto.randomUUID();
const session_start_time = Date.now();


// ---- LOW-LEVEL SEND ----
async function sendEvent(event_type, data = {}) {
  const payload = {
    session_id,
    event_type,
    client_time: Date.now(),
    ...data
  };

  try {
    await fetch(`${WORKER_URL}/log-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (_) {
    // Silent by design
  }
}

// ---- REQUIRED EVENTS ----
sendEvent("session_start");

export function consentGiven() {
  sendEvent("consent_given");
}

export function questionShown(id) {
  sendEvent("question_shown", { id });
}

export function firstInteraction(id) {
  sendEvent("first_interaction", { id });
}

export function inputChange(id, count) {
  sendEvent("input_change", { id, count });
}

export function navNext(id) {
  sendEvent("navigation_next", { id });
}

// ---- FINAL SUBMIT ----
export async function submitResponses(responses) {
  sendEvent("submit");

  await fetch(`${WORKER_URL}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id,
      responses,
      metadata: {
        total_time_ms: Date.now() - session_start_time
      }
    })
  });
}

// ---- QUESTION FLOW ----
let questions = [];
let current = 0;
const responses = {};
let inputCount = 0;
let hasInteracted = false;

// DOM refs (pulled from index.html)
const questionText = document.getElementById("questionText");
const answerInput = document.getElementById("answerInput");
const questionArea = document.getElementById("questionArea");
const doneArea = document.getElementById("doneArea");
const nextBtn = document.getElementById("nextBtn");

// Load questions.json
async function loadQuestions() {
  const res = await fetch("./questions.json");
  questions = await res.json();
}

// Show current question
function showQuestion() {
  const q = questions[current];

  questionText.textContent = q.prompt;
  answerInput.value = responses[q.id] || "";

  inputCount = 0;
  hasInteracted = false;

  questionShown(q.id);
}

// Input handling
answerInput.addEventListener("input", () => {
  const q = questions[current];
  inputCount++;

  if (!hasInteracted) {
    hasInteracted = true;
    firstInteraction(q.id);
  }

  inputChange(q.id, inputCount);
});

// Next button
nextBtn.addEventListener("click", () => {
  const q = questions[current];
  responses[q.id] = answerInput.value;

  navNext(q.id);

  current++;
  if (current < questions.length) {
    showQuestion();
  } else {
    questionArea.classList.add("hidden");
    doneArea.classList.remove("hidden");
    submitResponses(responses);
  }
});

// ---- INIT ----
loadQuestions().then(() => {
  // Questions load only after consent flow triggers showQuestion()
});