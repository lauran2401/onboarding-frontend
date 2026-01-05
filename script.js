// script.js
// Frontend event emitter for research onboarding
// No analytics. No inference. Raw interaction capture only.

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
  } catch (e) {
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

export function navBack(question_id) {
  sendEvent("navigation_back", { question_id });
}

export function idleGap(ms) {
  sendEvent("idle_gap", { value: ms });
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
