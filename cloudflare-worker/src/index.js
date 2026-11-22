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
    "Access-Control-Expose-Headers": "X-Image-Model",
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

async function verifyTurnstile(token, secret, ip) {
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
      result.action === "generate";
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
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

    // A public, read-only health check is safe without CORS credentials.
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

    if (origin !== ALLOWED_ORIGIN) {
      return new Response("Forbidden origin", { status: 403 });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
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
