const MODEL_FAST = "@cf/black-forest-labs/flux-2-klein-4b";
const MODEL_QUALITY = "@cf/black-forest-labs/flux-2-klein-9b";
const ALLOWED_ORIGIN = "https://tra1er.github.io";
const ALLOWED_HOSTNAME = "tra1er.github.io";
const MAX_PROMPT_LENGTH = 1500;
const ALLOWED_SIZES = new Set([
  "512x512", "768x768", "1024x1024", "1024x768",
  "768x1024", "1280x720", "720x1280"
]);

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Access-Control-Expose-Headers": "X-Image-Model, X-Music-Provider, X-Music-Model",
    "Vary": "Origin"
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

async function verifyTurnstile(token, secret, ip, expectedAction = "generate") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: secret,
          response: token,
          remoteip: ip,
          idempotency_key: crypto.randomUUID()
        }),
        signal: controller.signal
      }
    );
    if (!response.ok) return false;
    const result = await response.json();
    return result.success === true &&
      result.hostname === ALLOWED_HOSTNAME &&
      result.action === expectedAction;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}



function decodeBase64Bytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function handleMusicGeneration(request, env) {
  if (!env.TURNSTILE_SECRET || !env.MUSIC_RATE_LIMIT || !env.SONG_STUDIO_PREVIEW_KEY) {
    return json({ error: "Private music preview is not configured yet." }, 503);
  }
  if (!request.headers.get("Content-Type")?.includes("application/json")) {
    return json({ error: "Send a JSON request." }, 415);
  }
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid request body." }, 400); }

  const provider = body.provider === "eleven" ? "eleven" : body.provider === "lyria" ? "lyria" : "";
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const lyrics = typeof body.lyrics === "string" ? body.lyrics.trim() : "";
  const mode = body.mode === "instrumental" ? "instrumental" : "vocals";
  const durationSeconds = Number(body.durationSeconds);
  const bpm = Number(body.bpm);
  const previewKey = typeof body.previewKey === "string" ? body.previewKey : "";
  const token = typeof body.turnstileToken === "string" ? body.turnstileToken : "";

  if (!provider) return json({ error: "Choose a supported music provider." }, 400);
  if (!prompt || prompt.length > 3000) return json({ error: "The music prompt must contain 1–3,000 characters." }, 400);
  if (lyrics.length > 5000) return json({ error: "Lyrics must be 5,000 characters or fewer." }, 400);
  if (![30, 60, 120, 180, 240].includes(durationSeconds)) return json({ error: "Choose an available song length." }, 400);
  if (!Number.isInteger(bpm) || bpm < 60 || bpm > 180) return json({ error: "Choose a tempo between 60 and 180 BPM." }, 400);
  if (!previewKey || previewKey.length > 256 || previewKey !== env.SONG_STUDIO_PREVIEW_KEY) return json({ error: "The private preview key is incorrect." }, 403);
  if (!token || token.length > 2048) return json({ error: "Complete the human check before generating." }, 400);

  const apiKey = provider === "eleven" ? env.ELEVENLABS_API_KEY : "";
  if (provider === "lyria" && !env.AI) return json({ error: "Cloudflare Workers AI is not connected to this Worker." }, 503);
  if (provider === "eleven" && !apiKey) return json({ error: "ElevenLabs Music API has not been connected by the owner yet." }, 503);

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const rate = await env.MUSIC_RATE_LIMIT.limit({ key: ip });
  if (!rate.success) return json({ error: "Too many music requests. Please wait a minute before trying again." }, 429);
  const verified = await verifyTurnstile(token, env.TURNSTILE_SECRET, ip, "music-generate");
  if (!verified) return json({ error: "Human verification expired or failed. Please try again." }, 403);

  const stylePrompt = prompt + "\nTempo direction: " + bpm + " BPM. Target duration: about " + durationSeconds + " seconds.";
  try {
    if (provider === "lyria") {
      let fullPrompt = stylePrompt;
      if (mode === "instrumental") fullPrompt += "\nInstrumental only: no vocals, no spoken words.";
      else if (lyrics) fullPrompt += "\nUse these lyrics as the vocal text where musically appropriate:\n" + lyrics;
      else fullPrompt += "\nInclude natural, expressive vocals and original lyrics.";
      const result = await env.AI.run(
        "google/lyria-3.5",
        { prompt: fullPrompt },
        { gateway: { id: "default" } }
      );
      const audioUrl = result && result.audio;
      if (typeof audioUrl !== "string" || !audioUrl.startsWith("https://")) {
        console.error("Cloudflare Lyria returned no valid audio URL.");
        return json({ error: "Cloudflare Lyria returned no playable audio. Check the Workers AI response and account access." }, 502);
      }
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        console.error("Could not retrieve generated Lyria audio:", audioResponse.status);
        return json({ error: "The generated Lyria audio could not be retrieved." }, 502);
      }
      const audioBytes = await audioResponse.arrayBuffer();
      if (!audioBytes.byteLength) return json({ error: "Lyria returned an empty audio file." }, 502);
      return new Response(audioBytes, {
        status: 200,
        headers: {
          ...corsHeaders(), "Content-Type": audioResponse.headers.get("Content-Type") || "audio/mpeg",
          "Content-Length": String(audioBytes.byteLength), "Cache-Control": "no-store",
          "X-Music-Provider": "Cloudflare / Google", "X-Music-Model": "Lyria 3.5"
        }
      });
    }

    const styles = [
      "professionally arranged music", "clear, detailed studio production",
      String(bpm) + " BPM", "cohesive musical structure", "natural expressive performance"
    ];
    const negativeStyles = ["robotic vocals", "muddy mix", "generic stock backing", "unintended sound effects"];
    let payload;
    if (lyrics && mode === "vocals") {
      const sections = lyrics.split(/(?=^\s*\[[^\]]+\]\s*$)/m).map((part) => part.trim()).filter(Boolean).slice(0, 30);
      const chunksSource = sections.length ? sections : ["[Verse 1]\n" + lyrics];
      const perSection = Math.max(3000, Math.min(120000, Math.floor((durationSeconds * 1000) / chunksSource.length)));
      const chunks = chunksSource.map((section, index) => ({
        text: section,
        duration_ms: perSection,
        positive_styles: index === 0 ? styles.concat(["vocal-led song", "memorable melodic hook"]) : styles,
        negative_styles: negativeStyles,
        context_adherence: "high"
      }));
      payload = { composition_plan: { chunks: chunks }, model_id: "music_v2_5" };
    } else {
      let fullPrompt = stylePrompt;
      if (mode === "instrumental") fullPrompt += "\nInstrumental only, no vocals.";
      else fullPrompt += "\nInclude natural, expressive vocals and original lyrics.";
      payload = {
        prompt: fullPrompt, music_length_ms: durationSeconds * 1000,
        model_id: "music_v2_5", force_instrumental: mode === "instrumental"
      };
    }
    const response = await fetch("https://api.elevenlabs.io/v1/music?output_format=mp3_48000_192", {
      method: "POST",
      headers: { "Content-Type": "application/json", "xi-api-key": apiKey },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      console.error("Eleven Music API error:", response.status, (await response.text()).slice(0, 500));
      if (response.status === 401 || response.status === 403) return json({ error: "ElevenLabs rejected the API key or this account does not have Music API access." }, 502);
      if (response.status === 429) return json({ error: "ElevenLabs usage limit reached. Check your subscription and API quota." }, 429);
      return json({ error: "Eleven Music could not generate this track (HTTP " + response.status + ")." }, 502);
    }
    const audioBytes = await response.arrayBuffer();
    if (!audioBytes.byteLength) return json({ error: "Eleven Music returned an empty audio file." }, 502);
    return new Response(audioBytes, {
      status: 200,
      headers: {
        ...corsHeaders(), "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBytes.byteLength), "Cache-Control": "no-store",
        "X-Music-Provider": "ElevenLabs", "X-Music-Model": "Eleven Music v2.5"
      }
    });
  } catch (error) {
    const detail = String(error?.message || "Unknown error").slice(0, 500);
    const gatewayLogId = env.AI?.aiGatewayLogId || "unavailable";
    console.error("Music generation failed:", detail, "AI Gateway log ID:", gatewayLogId);

    if (/credit|billing|gateway|payment|balance|prepaid|fund/i.test(detail)) {
      return json({
        error: "Cloudflare AI Gateway could not authorize Lyria. Check that the default gateway has Workers AI Billing set to Unified billing and that prepaid credits are available."
      }, 402);
    }

    return json({
      error: "Cloudflare could not complete the Lyria request. Check the Worker and AI Gateway logs. AI Gateway log ID: " + gatewayLogId
    }, 503);
  }
}

function decodeBase64Image(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const url = new URL(request.url);

    // Read-only status endpoints are safe to open directly as well as from the site.
    // They reveal only whether integrations are configured, never secret values.
    if (request.method === "GET" && url.pathname === "/health") {
      return new Response(JSON.stringify({
        ok: true,
        service: "The Digital Works image API",
        models: [MODEL_QUALITY, MODEL_FAST]
      }), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store"
        }
      });
    }

    if (request.method === "GET" && url.pathname === "/api/music/status") {
      return json({
        providers: {
          lyria: { configured: Boolean(env.AI) },
          eleven: { configured: Boolean(env.ELEVENLABS_API_KEY) }
        },
        previewEnabled: Boolean(env.SONG_STUDIO_PREVIEW_KEY)
      });
    }

    if (origin !== ALLOWED_ORIGIN) {
      return new Response("Forbidden origin", { status: 403 });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (request.method === "POST" && url.pathname === "/api/music/generate") {
      return handleMusicGeneration(request, env);
    }

    if (request.method !== "POST" || url.pathname !== "/api/generate") {
      return json({ error: "Not found." }, 404);
    }

    if (!env.AI || !env.TURNSTILE_SECRET || !env.IMAGE_RATE_LIMIT) {
      return json({ error: "The image service is not fully configured yet." }, 503);
    }

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const rate = await env.IMAGE_RATE_LIMIT.limit({ key: ip });
    if (!rate.success) {
      return json({ error: "Too many attempts. Please wait a minute and try again." }, 429);
    }

    if (!request.headers.get("Content-Type")?.includes("application/json")) {
      return json({ error: "Send a JSON request." }, 415);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid request body." }, 400);
    }

    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const model = body.model === "fast" ? MODEL_FAST : MODEL_QUALITY;
    const turnstileToken = typeof body.turnstileToken === "string" ? body.turnstileToken : "";
    const width = Number(body.width);
    const height = Number(body.height);
    const size = String(width) + "x" + String(height);

    if (!prompt || prompt.length > MAX_PROMPT_LENGTH) {
      return json({ error: "Prompt must contain 1-" + MAX_PROMPT_LENGTH + " characters." }, 400);
    }
    if (!ALLOWED_SIZES.has(size)) {
      return json({ error: "Choose one of the available image sizes." }, 400);
    }
    if (!turnstileToken || turnstileToken.length > 2048) {
      return json({ error: "Complete the human check before generating." }, 400);
    }

    const verified = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET, ip);
    if (!verified) {
      return json({ error: "Human verification expired or failed. Please try again." }, 403);
    }

    const form = new FormData();
    form.append("prompt", prompt);
    form.append("width", String(width));
    form.append("height", String(height));
    if (Number.isInteger(body.seed) && body.seed >= 0 && body.seed <= 2147483647) {
      form.append("seed", String(body.seed));
    }
    if (typeof body.guidance === "number" && body.guidance >= 1 && body.guidance <= 10) {
      form.append("guidance", String(body.guidance));
    }

    try {
      const serialized = new Response(form);
      const result = await env.AI.run(model, {
        multipart: {
          body: serialized.body,
          contentType: serialized.headers.get("content-type")
        }
      });

      if (!result || typeof result.image !== "string" || !result.image.length) {
        console.error("Workers AI returned no image payload.");
        return json({ error: "The image model did not return an image. Please retry." }, 502);
      }

      const imageBytes = decodeBase64Image(result.image);
      return new Response(imageBytes, {
        status: 200,
        headers: {
          ...corsHeaders(),
          "Content-Type": "image/png",
          "Content-Length": String(imageBytes.byteLength),
          "Cache-Control": "no-store",
          "X-Image-Model": model === MODEL_FAST ? "FLUX.2 Klein 4B" : "FLUX.2 Klein 9B"
        }
      });
    } catch (error) {
      console.error("Workers AI generation failed:", error?.message || "Unknown error");
      return json({
        error: "Image generation failed or the daily free allowance may be exhausted. Please try again later."
      }, 503);
    }
  }
};
