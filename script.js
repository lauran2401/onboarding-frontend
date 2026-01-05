// script.js
// Frontend event emitter + question loader
// Research instrument only. No analytics. No inference.

// ---- CONFIG ----
const WORKER_URL = "https://onboarding-backend.lauran2401.workers.dev";

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

export function questionShown(question_id) {
  sendEvent("question_shown", { question_id });
}

export function firstInteraction(question_id) {
  sendEvent("first_interaction", { question_id });
}

export function inputChange(question_id, count) {
  sendEvent("input_change", { question_id, count });
}

export function navNext(question_id) {
  sendEvent("navigation_next", { question_id });
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

  questionText.textContent = q.text;
  answerInput.value = responses[q.question_id] || "";

  inputCount = 0;
  hasInteracted = false;

  questionShown(q.question_id);
}

// Input handling
answerInput.addEventListener("input", () => {
  const q = questions[current];
  inputCount++;

  if (!hasInteracted) {
    hasInteracted = true;
    firstInteraction(q.question_id);
  }

  inputChange(q.question_id, inputCount);
});

// Next button
nextBtn.addEventListener("click", () => {
  const q = questions[current];
  responses[q.question_id] = answerInput.value;

  navNext(q.question_id);

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
