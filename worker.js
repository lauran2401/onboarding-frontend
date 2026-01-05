// worker.js
// Research-grade, append-only event logger for an instrumented onboarding flow.
// No aggregation. No inference. Preserve raw temporal structure.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === "/log-event" && request.method === "POST") {
      return logEvent(request, env, corsHeaders);
    }

    if (url.pathname === "/submit" && request.method === "POST") {
      return submitResponses(request, env, corsHeaders);
    }

    if (url.pathname === "/export" && request.method === "GET") {
      return exportEvents(request, env, corsHeaders);
    }

    return new Response("Not found", { status: 404, headers: corsHeaders });
  },
};

// ---- POST /log-event ----
// Appends a single interaction event.
// No mutation. No aggregation.

async function logEvent(request, env, corsHeaders) {
  const body = await request.json();

  if (!body.session_id || !body.event_type) {
    return new Response("Invalid event", { status: 400, headers: corsHeaders });
  }

  const event = {
    schema_version: "event_v1",
    received_at: Date.now(),   // server timestamp
    ...body                   // client-sent payload
  };

  const key =
    `events/${event.session_id}/${event.received_at}-${crypto.randomUUID()}`;

  await env.EVENTS_KV.put(key, JSON.stringify(event));

  return new Response("ok", { headers: corsHeaders });
}

// ---- POST /submit ----
// Stores final answers payload once per session.

async function submitResponses(request, env, corsHeaders) {
  const body = await request.json();

  if (!body.session_id || !body.responses) {
    return new Response("Invalid submission", { status: 400, headers: corsHeaders });
  }

  const payload = {
    schema_version: "response_v1",
    received_at: Date.now(),
    session_id: body.session_id,
    responses: body.responses,
    metadata: body.metadata || {}
  };

  const key = `submissions/${body.session_id}.json`;

  await env.SUBMISSIONS_KV.put(key, JSON.stringify(payload));

  return new Response("submitted", { headers: corsHeaders });
}

// ---- GET /export ----
// NDJSON export of raw events.
// Token protected. Read-only.

async function exportEvents(request, env, corsHeaders) {
  const auth = request.headers.get("Authorization");
  if (auth !== `Bearer ${env.EXPORT_TOKEN}`) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  const url = new URL(request.url);
  const prefix = url.searchParams.get("prefix") || "events/";

  const list = await env.EVENTS_KV.list({ prefix });

  let output = "";
  for (const key of list.keys) {
    const value = await env.EVENTS_KV.get(key.name);
    if (value) output += value + "\n";
  }

  return new Response(output, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/x-ndjson",
    },
  });
}
