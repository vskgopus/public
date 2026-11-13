// The two AI engines of the browser version. Both read the chapter PDF and return JSON
// matching the schema built from the ticked sections (same prompts as the desktop app).
//
// Claude: Anthropic's official SDK (bundled in vendor/), with the user's own API key, called
//         straight from the browser (dangerouslyAllowBrowser: the key is the user's own and stays
//         in this browser).
// Gemini: Google's REST API with the user's own (free) key; the same request format as the
//         desktop app's gemini.py.
import { Anthropic } from "./vendor/anthropic-sdk-1.3.0.mjs";

export class Stopped extends Error {}
export class UsageLimit extends Error {}

export const CLAUDE_MODELS = [
  { id: "claude-opus-5-5", name: "Claude Opus 5.5 (best)", price: "$4 / $20 per million input / output tokens" },
  { id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5 (cheaper)", price: "$2 / $10 per million input / output tokens" },
  { id: "claude-haiku-5-5", name: "Claude Haiku 5.5 (cheapest)", price: "$0.10 / $0.50 per million input / output tokens" },
];

const mins = s => (s >= 60 ? `${Math.floor(s / 60)} min ${String(Math.floor(s % 60)).padStart(2, "0")} s` : `${Math.floor(s)} s`);

// ------------------------------------------------------------------ Claude

export async function claude({ pdfBase64, prompt, system, schema, apiKey, model, title, log, progress, signal }) {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 3, timeout: 30 * 60 * 1000 });
  const body = {
    model,
    max_tokens: 64000,
    system,
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: { type: "json_schema", schema } },
    messages: [{ role: "user", content: [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 }, title },
      { type: "text", text: prompt },
    ] }],
  };
  // If a safety classifier declines, let the API retry on a suitable model (not offered on Haiku).
  if (!model.startsWith("claude-haiku")) Object.assign(body, { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" });

  const started = Date.now();
  let chars = 0, wroteFirst = false, lastShown = 0;
  log(`Sending the chapter PDF (${(pdfBase64.length * 0.75 / 1e6).toFixed(1)} MB) to Claude (${model}) …`);
  let stream;
  try {
    stream = client.beta.messages.stream(body, { signal });
    for await (const event of stream) {
      if (event.type === "message_start") log("Claude accepted the request and is reading the chapter …");
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        if (!wroteFirst) { wroteFirst = true; log(`Claude started writing the answer after ${mins((Date.now() - started) / 1000)}.`); }
        chars += event.delta.text.length;
      }
      const now = Date.now();
      if (now - lastShown > 700) {
        lastShown = now;
        progress(wroteFirst ? `Receiving the answer from Claude: ${chars.toLocaleString()} characters, ${mins((now - started) / 1000)} so far`
                            : `Claude is reading the chapter and thinking … ${mins((now - started) / 1000)} so far`);
      }
    }
  } catch (e) {
    if (signal?.aborted) throw new Stopped("Stopped.");
    if (e instanceof Anthropic.AuthenticationError) throw new Error("The Claude API key was rejected. Check it in Settings.");
    if (e instanceof Anthropic.PermissionDeniedError) throw new Error(`Your Claude API key may not use ${model} (${e.message}).`);
    if (e instanceof Anthropic.RateLimitError) throw new UsageLimit(`Claude rate or usage limit reached (${e.message}).`);
    if (e instanceof Anthropic.BadRequestError) throw new Error(`Claude could not take this request: ${e.message}`);
    if (e instanceof Anthropic.APIConnectionError) throw new Error("Could not reach the Claude API. Check your internet connection.");
    if (e instanceof Anthropic.APIError) throw new Error(`Claude API error ${e.status ?? ""}: ${e.message}`);
    throw e;
  }
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") throw new Error(`Claude declined this request (${message.stop_details?.category ?? "no category"}).`);
  if (message.stop_reason === "max_tokens") throw new Error("The output was too long; split the chapter into smaller parts in Settings, or tick fewer sections.");
  const text = message.content.filter(b => b.type === "text").map(b => b.text).join("");
  log(`Claude finished writing: ${text.length.toLocaleString()} characters in ${mins((Date.now() - started) / 1000)}.`);
  let data;
  try { data = JSON.parse(text); } catch { throw new Error("Claude returned incomplete material. Try again, or split the chapter in Settings."); }
  return { data, usage: `Claude ${message.model}: ${message.usage.input_tokens} in / ${message.usage.output_tokens} out tokens` };
}

// ------------------------------------------------------------------ Gemini

const GEMINI = "https://generativelanguage.googleapis.com/v1beta";
const SKIP = /image|tts|audio|live|embed|computer-use|robotics|native|veo|imagen|aqa|learnlm|gemma/i;

async function gemErr(r) {
  try { const j = await r.json(); return [String(j.error?.status || ""), String(j.error?.message || "").slice(0, 300)]; }
  catch { return ["", (await r.text().catch(() => "")).slice(0, 300)]; }
}

const version = id => parseFloat((id.match(/gemini-(\d+(?:\.\d+)?)/) || [0, 0])[1]);
const rank = m => {
  const id = m.id;
  return [/preview|exp|latest|\d{3}$|-\d{2}-\d{2}/.test(id) ? 1 : 0, id.includes("flash") && !id.includes("lite") ? 0 : 1,
          id.includes("lite") ? 1 : 0, -version(id), id];
};
const cmp = (a, b) => { const x = rank(a), y = rank(b); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1; return 0; };

export async function geminiModels(apiKey) {
  const out = []; let token = "";
  for (let i = 0; i < 10; i++) {
    const url = `${GEMINI}/models?pageSize=100${token ? `&pageToken=${encodeURIComponent(token)}` : ""}`;
    let r;
    try { r = await fetch(url, { headers: { "x-goog-api-key": apiKey } }); }
    catch { throw new Error("Could not reach the Gemini API. Check your internet connection."); }
    if (!r.ok) {
      const [status, msg] = await gemErr(r);
      if (/api.?key|API_KEY|permission|unauthenticated/i.test(msg + status)) throw new Error(`The Gemini API key was rejected (${msg || status}).`);
      throw new Error(`Gemini API error ${r.status} ${status}: ${msg}`);
    }
    const j = await r.json();
    for (const m of j.models || []) {
      const id = String(m.name || "").replace(/^models\//, "");
      if (id.startsWith("gemini") && (m.supportedGenerationMethods || []).includes("generateContent") && !SKIP.test(id))
        out.push({ id, name: m.displayName || id, outputLimit: m.outputTokenLimit || 0 });
    }
    token = j.nextPageToken || "";
    if (!token) break;
  }
  return out.sort(cmp);
}

class ModelUnavailable extends Error {}

async function geminiOnce({ pdfBase64, prompt, system, schema, apiKey, model, outputLimit, log, progress, signal, simplified = false }) {
  const config = { responseMimeType: "application/json", responseJsonSchema: simplified ? simplify(schema) : schema };
  if (outputLimit) config.maxOutputTokens = outputLimit;
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ inlineData: { mimeType: "application/pdf", data: pdfBase64 } }, { text: prompt }] }],
    generationConfig: config,
  });
  const url = `${GEMINI}/models/${model}:streamGenerateContent?alt=sse`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const sent = Date.now();
    log(`Sending the chapter PDF (${(pdfBase64.length * 0.75 / 1e6).toFixed(1)} MB) to Google Gemini (${model})${attempt > 1 ? ` (attempt ${attempt})` : ""} …`);
    const tick = setInterval(() => progress(`Waiting for Google's reply … ${mins((Date.now() - sent) / 1000)} so far (Gemini reads and thinks before it answers)`), 1000);
    let r;
    try { r = await fetch(url, { method: "POST", headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" }, body, signal }); }
    catch (e) { clearInterval(tick); if (signal?.aborted) throw new Stopped("Stopped."); throw new Error("Could not reach the Gemini API. Check your internet connection."); }
    clearInterval(tick);
    if (r.ok) return readGemini(r, { log, progress, signal, sent });
    const [status, msg] = await gemErr(r);
    if (r.status === 429 || status === "RESOURCE_EXHAUSTED") throw new UsageLimit(msg || "usage limit reached");
    if (r.status === 404) throw new ModelUnavailable(`not available to this key (${msg})`);
    if (r.status === 400 && !simplified && /schema/i.test(msg)) {
      log("Google did not accept the detailed output format; retrying with a simpler one …");
      return geminiOnce({ pdfBase64, prompt, system, schema, apiKey, model, outputLimit, log, progress, signal, simplified: true });
    }
    if ([500, 502, 503, 504].includes(r.status)) {
      if (attempt >= 2 && /high demand|overloaded/i.test(msg)) throw new ModelUnavailable(`busy (HTTP ${r.status}: ${msg.slice(0, 120)})`);
      if (attempt === 3) throw new ModelUnavailable(`busy after ${attempt} tries (HTTP ${r.status})`);
      log(`Google is busy (HTTP ${r.status}: ${msg.slice(0, 120) || "no details"}). Trying again in ${10 * attempt} s …`);
      await new Promise(res => setTimeout(res, 10000 * attempt));
      continue;
    }
    if (/api.?key|API_KEY|permission|unauthenticated/i.test(msg + status)) throw new Error(`The Gemini API key was rejected (${msg || status}).`);
    throw new Error(`Gemini API error ${r.status} ${status}: ${msg}`);
  }
}

async function readGemini(r, { log, progress, signal, sent }) {
  log(`Google accepted the request after ${mins((Date.now() - sent) / 1000)}; Gemini is writing.`);
  const reader = r.body.getReader(), dec = new TextDecoder("utf-8");
  let buf = "", text = "", finish = "", block = "", usage = {}, first = false, last = 0;
  const take = chunk => {
    let d; try { d = JSON.parse(chunk); } catch { return; }
    if (d.error) {
      if (d.error.status === "RESOURCE_EXHAUSTED" || d.error.code === 429) throw new UsageLimit(d.error.message || "usage limit reached");
      throw new Error(`Gemini reported an error while answering: ${d.error.status || ""} ${d.error.message || ""}`);
    }
    if (d.promptFeedback?.blockReason) block = d.promptFeedback.blockReason;
    Object.assign(usage, d.usageMetadata || {});
    const c = (d.candidates || [])[0];
    if (c) {
      for (const p of c.content?.parts || []) if (p.text && !p.thought) {
        if (!first) { first = true; log(`Gemini started writing the answer, ${mins((Date.now() - sent) / 1000)} after sending.`); }
        text += p.text;
      }
      if (c.finishReason) finish = c.finishReason;
    }
  };
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n\n")) >= 0) {
        const event = buf.slice(0, i); buf = buf.slice(i + 2);
        const data = event.split("\n").filter(l => l.startsWith("data: ")).map(l => l.slice(6)).join("\n");
        if (data) take(data);
      }
      const now = Date.now();
      if (now - last > 700) { last = now; progress(`Receiving the answer from Gemini: ${text.length.toLocaleString()} characters, ${mins((now - sent) / 1000)} since sending`); }
    }
    if (buf.trim().startsWith("data: ")) take(buf.trim().slice(6));
  } catch (e) {
    if (signal?.aborted) throw new Stopped("Stopped.");
    throw e;
  }
  if (block) throw new Error(`Gemini declined this request (${block}).`);
  if (finish === "MAX_TOKENS") throw new Error("The output was too long for Gemini; split the chapter into smaller parts in Settings.");
  if (finish && finish !== "STOP") throw new Error(`Gemini stopped early (${finish}). Try again, or split the chapter in Settings.`);
  log(`Gemini finished writing: ${text.length.toLocaleString()} characters, ${mins((Date.now() - sent) / 1000)} after sending.`);
  let data;
  try { data = JSON.parse(text); } catch { throw new Error("Gemini returned incomplete material. Try again, or split the chapter in Settings."); }
  return { data, usage: `${usage.promptTokenCount ?? "?"} in / ${usage.candidatesTokenCount ?? "?"} out tokens` };
}

function simplify(schema) {
  const s = JSON.parse(JSON.stringify(schema));
  const walk = n => {
    if (Array.isArray(n)) return n.forEach(walk);
    if (n && typeof n === "object") {
      delete n.additionalProperties;
      if (n.type === "integer" && n.enum) { n.description = `${n.description || ""} One of: ${n.enum.join(", ")}.`.trim(); delete n.enum; }
      Object.values(n).forEach(walk);
    }
  };
  walk(s);
  return s;
}

// The chosen model first; if it is busy, withdrawn or out of quota, up to two other Flash models.
export async function gemini(opts) {
  const { apiKey, model, log } = opts;
  const queue = [{ id: model, outputLimit: opts.outputLimit || 0 }], tried = [];
  let lookedUp = false, limits = 0;
  while (queue.length) {
    const m = queue.shift();
    try {
      const res = await geminiOnce({ ...opts, model: m.id, outputLimit: m.outputLimit });
      if (m.id !== model) log(`Tip: ${m.id} answered while ${model} did not. You can choose ${m.id} in Settings.`);
      return { data: res.data, usage: `Gemini ${m.id}: ${res.usage}` };
    } catch (e) {
      if (!(e instanceof ModelUnavailable) && !(e instanceof UsageLimit)) throw e;
      limits += e instanceof UsageLimit ? 1 : 0;
      tried.push(`${m.id}: ${e instanceof UsageLimit ? "usage limit reached" : e.message}`);
      if (!lookedUp) {
        lookedUp = true;
        try {
          const skip = new Set([m.id, ...queue.map(q => q.id)]);
          queue.push(...(await geminiModels(apiKey)).filter(x => x.id.includes("flash") && !skip.has(x.id)).slice(0, 2));
        } catch { /* no fallbacks */ }
      }
      if (queue.length) log(`Gemini ${m.id} ${e instanceof UsageLimit ? "has reached your key's usage limit" : `is not answering (${e.message})`}. Trying ${queue[0].id} instead …`);
    }
  }
  if (limits === tried.length) throw new UsageLimit(`every model tried has reached its limit: ${tried.map(t => t.split(":")[0]).join(", ")}`);
  throw new Error(`No Gemini model answered. ${tried.join(" | ")}. Google says demand spikes are usually temporary: try again later, or choose another model in Settings.`);
}
