const API_BASE = "https://digital-works-ai.traier12345.workers.dev";
const $ = (selector) => document.querySelector(selector);
const state = { providers: {}, previewEnabled: false, tracks: [], audioContext: null, sources: [], playing: false, playStartedAt: 0, playOffset: 0, frame: 0, currentBlobUrl: "" };
const colors = ["#b99be7", "#d99ab9", "#8cbeb4", "#8fa8e1", "#d7b77e"];

function setStatus(message, kind) {
  const node = $("#generateStatus");
  node.textContent = message;
  node.className = "status-message" + (kind ? " " + kind : "");
}
function formatTime(seconds) {
  const value = Math.max(0, Math.floor(seconds || 0));
  return String(Math.floor(value / 60)).padStart(2, "0") + ":" + String(value % 60).padStart(2, "0");
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, function (char) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char];
  });
}
function selectedProvider() { return $("#provider").value; }
function providerReady(provider) {
  return Boolean(state.providers[provider] && state.providers[provider].configured);
}
function refreshProviderUI() {
  const lyria = providerReady("lyria");
  const eleven = providerReady("eleven");
  $("#lyriaState").textContent = lyria ? "Connected" : "Not connected";
  $("#elevenState").textContent = eleven ? "Connected" : "Not connected";
  $("#lyriaCard").classList.toggle("ready", lyria);
  $("#elevenCard").classList.toggle("ready", eleven);
  $("#connectionTitle").textContent = lyria || eleven ? "Music provider available" : "Prototype workspace ready";
  $("#connectionText").textContent = lyria || eleven ? "Private preview access is configured separately." : "Audio editing works now; AI generation awaits provider setup.";
  updateProviderNote();
}
function updateProviderNote() {
  const provider = selectedProvider();
  const ready = providerReady(provider);
  if (provider === "lyria") {
    $("#providerNote").textContent = ready ? "Connected · $0.08 per full song · no free API tier" : "Not connected · $0.08 per full song · no free API tier";
  } else {
    $("#providerNote").textContent = ready ? "Connected · paid API access · plan quotas and download limits apply" : "Not connected · paid API access · plan quotas and download limits apply";
  }
  $("#generateBtn").disabled = !ready || !state.previewEnabled;
  if (!state.previewEnabled) {
    setStatus("Generation is locked until a private preview key is configured in Cloudflare.", "");
  } else if (!ready) {
    setStatus("Add the selected provider's API key to Cloudflare to enable generation.", "");
  } else {
    setStatus("Ready. Check the paid-usage confirmation and complete the human check before generating.", "success");
  }
}
async function loadProviderStatus() {
  try {
    const response = await fetch(API_BASE + "/api/music/status", { cache: "no-store" });
    if (!response.ok) throw new Error("Music service status is unavailable.");
    const data = await response.json();
    state.providers = data.providers || {};
    state.previewEnabled = data.previewEnabled === true;
    refreshProviderUI();
  } catch (error) {
    $("#connectionTitle").textContent = "Audio workspace ready";
    $("#connectionText").textContent = "Music API connection is not deployed yet. Local editing is available.";
    $("#lyriaState").textContent = "Not connected";
    $("#elevenState").textContent = "Not connected";
    setStatus("The music API has not been deployed yet. You can still import and mix audio locally.", "");
    $("#generateBtn").disabled = true;
  }
}
function getAudioContext() {
  if (!state.audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error("This browser does not support the Web Audio API.");
    state.audioContext = new AudioContextClass();
  }
  return state.audioContext;
}
function maxDuration() {
  return state.tracks.reduce((maximum, track) => Math.max(maximum, track.buffer.duration), 0);
}
function updateTransport() {
  const duration = maxDuration();
  const position = state.playing && state.audioContext
    ? state.playOffset + state.audioContext.currentTime - state.playStartedAt
    : state.playOffset;
  $("#currentTime").textContent = formatTime(position);
  $("#totalTime").textContent = formatTime(duration);
  $("#seek").max = String(Math.max(1, Math.ceil(duration)));
  $("#seek").value = String(Math.min(duration, position));
  $("#seek").disabled = state.tracks.length === 0;
  $("#playAll").disabled = state.tracks.length === 0;
  $("#pauseAll").disabled = !state.playing;
  $("#stopAll").disabled = state.tracks.length === 0;
  $("#exportMix").disabled = state.tracks.length === 0;
  $("#trackCount").textContent = state.tracks.length + (state.tracks.length === 1 ? " TRACK" : " TRACKS");
}
function stopSources() {
  state.sources.forEach(function (source) {
    try { source.stop(); } catch (_) {}
  });
  state.sources = [];
}
function currentPosition() {
  if (!state.playing || !state.audioContext) return state.playOffset;
  return Math.min(maxDuration(), state.playOffset + state.audioContext.currentTime - state.playStartedAt);
}
function pausePlayback() {
  if (!state.playing) return;
  state.playOffset = currentPosition();
  state.playing = false;
  stopSources();
  cancelAnimationFrame(state.frame);
  updateTransport();
}
function stopPlayback() {
  state.playing = false;
  state.playOffset = 0;
  stopSources();
  cancelAnimationFrame(state.frame);
  updateTransport();
}
async function startPlayback(position) {
  if (!state.tracks.length) return;
  const context = getAudioContext();
  await context.resume();
  stopSources();
  const duration = maxDuration();
  const offset = typeof position === "number" ? position : state.playOffset;
  state.playOffset = offset >= duration ? 0 : Math.max(0, offset);
  const anySolo = state.tracks.some(function (track) { return track.solo; });
  const now = context.currentTime;
  state.tracks.forEach(function (track) {
    if (track.muted || (anySolo && !track.solo) || state.playOffset >= track.buffer.duration) return;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = track.buffer;
    gain.gain.value = track.volume;
    source.connect(gain);
    gain.connect(context.destination);
    source.start(now, state.playOffset);
    state.sources.push(source);
  });
  state.playStartedAt = now;
  state.playing = true;
  function tick() {
    if (!state.playing) return;
    const positionNow = currentPosition();
    $("#currentTime").textContent = formatTime(positionNow);
    $("#seek").value = String(Math.min(duration, positionNow));
    if (positionNow >= duration) {
      stopPlayback();
      return;
    }
    state.frame = requestAnimationFrame(tick);
  }
  updateTransport();
  tick();
}
function restartIfPlaying() {
  if (!state.playing) return;
  const position = currentPosition();
  state.playing = false;
  stopSources();
  startPlayback(position).catch(function (error) { setStatus(error.message, "error"); });
}
function drawWaveform(canvas, buffer, color) {
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  const width = Math.max(300, Math.floor(canvas.clientWidth * ratio));
  const height = Math.floor(55 * ratio);
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#1b1925";
  context.fillRect(0, 0, width, height);
  const data = buffer.getChannelData(0);
  const step = Math.max(1, Math.floor(data.length / width));
  const middle = height / 2;
  context.fillStyle = color;
  for (let x = 0; x < width; x++) {
    let peak = 0;
    const start = x * step;
    for (let i = 0; i < step && start + i < data.length; i++) peak = Math.max(peak, Math.abs(data[start + i]));
    const bar = Math.max(2, peak * height * 0.86);
    context.fillRect(x, middle - bar / 2, 1.4 * ratio, bar);
  }
}
async function addTrack(blob, name, sourceLabel) {
  const context = getAudioContext();
  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await context.decodeAudioData(arrayBuffer.slice(0));
  const track = {
    id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random(),
    name: name || "Imported audio",
    sourceLabel: sourceLabel || "Imported locally",
    buffer: audioBuffer,
    volume: 1,
    muted: false,
    solo: false,
    color: colors[state.tracks.length % colors.length]
  };
  state.tracks.push(track);
  renderTracks();
  return track;
}
function renderTracks() {
  const list = $("#trackList");
  list.replaceChildren();
  if (!state.tracks.length) {
    const empty = document.createElement("div");
    empty.className = "track-empty";
    empty.textContent = "No tracks yet. Import audio or generate your first composition.";
    list.appendChild(empty);
  }
  state.tracks.forEach(function (track) {
    const row = document.createElement("article");
    row.className = "track-row";
    row.dataset.track = track.id;
    row.innerHTML =
      '<div class="track-info"><div><div class="track-name" title="' + escapeHtml(track.name) + '">' + escapeHtml(track.name) + '</div><div class="track-sub">' + escapeHtml(track.sourceLabel) + ' · ' + formatTime(track.buffer.duration) + '</div></div>' +
      '<div class="track-controls"><button type="button" data-action="mute" class="' + (track.muted ? "active" : "") + '">Mute</button><button type="button" data-action="solo" class="' + (track.solo ? "active" : "") + '">Solo</button><button type="button" data-action="remove">Remove</button></div></div>' +
      '<div><canvas class="track-wave" aria-label="Waveform for ' + escapeHtml(track.name) + '"></canvas><div class="track-bottom"><span>LEVEL</span><input type="range" min="0" max="1.5" step="0.01" value="' + track.volume + '" data-action="volume" aria-label="Volume for ' + escapeHtml(track.name) + '"><span>' + Math.round(track.volume * 100) + '%</span></div></div>';
    list.appendChild(row);
    drawWaveform(row.querySelector("canvas"), track.buffer, track.color);
  });
  updateTransport();
}
$("#trackList").addEventListener("click", function (event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const row = button.closest("[data-track]");
  const track = state.tracks.find(function (item) { return item.id === row.dataset.track; });
  if (!track) return;
  const action = button.dataset.action;
  if (action === "mute") track.muted = !track.muted;
  if (action === "solo") track.solo = !track.solo;
  if (action === "remove") {
    const position = currentPosition();
    state.tracks = state.tracks.filter(function (item) { return item.id !== track.id; });
    if (state.playing) {
      state.playing = false;
      stopSources();
      startPlayback(Math.min(position, maxDuration())).catch(function () {});
    }
  }
  renderTracks();
  restartIfPlaying();
});
$("#trackList").addEventListener("input", function (event) {
  if (event.target.dataset.action !== "volume") return;
  const row = event.target.closest("[data-track]");
  const track = state.tracks.find(function (item) { return item.id === row.dataset.track; });
  if (!track) return;
  track.volume = Number(event.target.value);
  row.querySelector(".track-bottom span:last-child").textContent = Math.round(track.volume * 100) + "%";
  restartIfPlaying();
});
$("#audioImport").addEventListener("change", async function (event) {
  const files = Array.from(event.target.files || []);
  for (const file of files) {
    try {
      await addTrack(file, file.name, "Imported locally");
    } catch (error) {
      setStatus("Could not read " + file.name + ": " + error.message, "error");
    }
  }
  event.target.value = "";
});
$("#playAll").addEventListener("click", function () { startPlayback().catch(function (error) { setStatus(error.message, "error"); }); });
$("#pauseAll").addEventListener("click", pausePlayback);
$("#stopAll").addEventListener("click", stopPlayback);
$("#seek").addEventListener("input", function () {
  const position = Number(this.value);
  if (state.playing) {
    state.playing = false;
    stopSources();
    startPlayback(position).catch(function () {});
  } else {
    state.playOffset = position;
    updateTransport();
  }
});
function writeWav(buffer) {
  const channels = 2;
  const sampleRate = buffer.sampleRate;
  const frames = buffer.length;
  const bytesPerSample = 2;
  const output = new ArrayBuffer(44 + frames * channels * bytesPerSample);
  const view = new DataView(output);
  function writeString(offset, value) {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  }
  writeString(0, "RIFF");
  view.setUint32(4, 36 + frames * channels * bytesPerSample, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, frames * channels * bytesPerSample, true);
  const left = buffer.getChannelData(0);
  const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;
  let offset = 44;
  for (let i = 0; i < frames; i++) {
    const l = Math.max(-1, Math.min(1, left[i]));
    const r = Math.max(-1, Math.min(1, right[i]));
    view.setInt16(offset, l < 0 ? l * 32768 : l * 32767, true); offset += 2;
    view.setInt16(offset, r < 0 ? r * 32768 : r * 32767, true); offset += 2;
  }
  return new Blob([output], { type: "audio/wav" });
}
$("#exportMix").addEventListener("click", async function () {
  if (!state.tracks.length) return;
  const button = this;
  button.disabled = true;
  button.textContent = "Rendering…";
  try {
    const duration = maxDuration();
    const sampleRate = 44100;
    const offline = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate);
    const anySolo = state.tracks.some(function (track) { return track.solo; });
    state.tracks.forEach(function (track) {
      if (track.muted || (anySolo && !track.solo)) return;
      const source = offline.createBufferSource();
      const gain = offline.createGain();
      source.buffer = track.buffer;
      gain.gain.value = track.volume;
      source.connect(gain);
      gain.connect(offline.destination);
      source.start(0);
    });
    const mixed = await offline.startRendering();
    const wav = writeWav(mixed);
    const url = URL.createObjectURL(wav);
    const link = document.createElement("a");
    link.href = url;
    link.download = "digital-works-song-studio-mix.wav";
    link.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
    setStatus("Your WAV mix has been exported.", "success");
  } catch (error) {
    setStatus("Mix export failed: " + error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = "Export mix";
  }
});
function resetTurnstile() {
  window.__dwSongTurnstileToken = "";
  if (window.turnstile && window.__dwSongTurnstileWidget !== undefined) {
    try { window.turnstile.reset(window.__dwSongTurnstileWidget); } catch (_) {}
  }
}
async function generateSong(providerOverride, promptOverride) {
  const provider = providerOverride || selectedProvider();
  const prompt = (promptOverride || $("#prompt").value).trim();
  if (!prompt) { setStatus("Describe the sound you want first.", "error"); return; }
  if (!providerReady(provider)) { setStatus("This provider is not connected yet.", "error"); return; }
  if (!state.previewEnabled) { setStatus("Private preview access is not configured.", "error"); return; }
  if (!$("#previewKey").value.trim()) { setStatus("Enter your private preview key. It is never saved by this page.", "error"); return; }
  if (!$("#costConfirm").checked) { setStatus("Confirm that this generation can use paid API credits.", "error"); return; }
  const token = window.__dwSongTurnstileToken || "";
  if (!token) { setStatus("Complete the Cloudflare human check first.", "error"); return; }
  const button = $("#generateBtn");
  button.disabled = true;
  button.textContent = "Generating…";
  setStatus("Sending a request to " + (provider === "lyria" ? "Google Lyria 3.5" : "Eleven Music v2.5") + ". This may take a little while.", "");
  const payload = {
    provider: provider,
    prompt: prompt,
    mode: $("#mode").value,
    durationSeconds: Number($("#duration").value),
    bpm: Number($("#bpm").value),
    lyrics: $("#lyrics").value.trim(),
    previewKey: $("#previewKey").value,
    turnstileToken: token
  };
  try {
    const response = await fetch(API_BASE + "/api/music/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      let message = "Generation failed (" + response.status + ").";
      try { const data = await response.json(); if (data.error) message = data.error; } catch (_) {}
      throw new Error(message);
    }
    const blob = await response.blob();
    if (!blob.type.startsWith("audio/") || blob.size < 1024) throw new Error("The provider returned an unexpected audio response.");
    const providerName = response.headers.get("X-Music-Provider") || (provider === "lyria" ? "Google Lyria" : "Eleven Music");
    const modelName = response.headers.get("X-Music-Model") || "";
    const title = prompt.length > 54 ? prompt.slice(0, 51) + "…" : prompt;
    if (state.currentBlobUrl) URL.revokeObjectURL(state.currentBlobUrl);
    state.currentBlobUrl = URL.createObjectURL(blob);
    $("#audioPlayer").src = state.currentBlobUrl;
    $("#activeTitle").textContent = title;
    $("#activeProvider").textContent = providerName.toUpperCase() + " / GENERATED";
    $("#activeDetails").textContent = modelName + " · " + Math.round(blob.size / 1024) + " KB";
    $("#downloadTrack").href = state.currentBlobUrl;
    $("#downloadTrack").download = "digital-works-" + provider + "-song.mp3";
    $("#playerEmpty").hidden = true;
    $("#playerReady").hidden = false;
    await addTrack(blob, title, providerName + " · AI generated");
    setStatus("Audio generated successfully. It has been added to your local multitrack workspace.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    resetTurnstile();
    button.textContent = "✦ Generate song";
    button.disabled = !providerReady(selectedProvider()) || !state.previewEnabled;
  }
}
$("#generateBtn").addEventListener("click", function () { generateSong().catch(function (error) { setStatus(error.message, "error"); }); });
$("#provider").addEventListener("change", updateProviderNote);
$("#bpm").addEventListener("input", function () { $("#bpmValue").textContent = this.value; });
const benchmarkPrompts = {
  indie: "A natural, emotionally convincing indie rock song with expressive male lead vocals, live drums with human groove, melodic electric bass, layered rhythm guitars and a memorable chorus. Intimate verses build into a wide, powerful final chorus. Organic studio production, dynamic performance, nuanced vocal phrasing. Avoid generic stock-pop arrangement and synthetic-sounding vocals.",
  cinematic: "A fully instrumental cinematic composition with intimate felt piano, evolving orchestral strings, deep organic percussion, warm low brass and a gradual emotional crescendo. Distinct sections, expressive dynamics, detailed stereo image and a satisfying resolved ending. No vocals.",
  electronic: "A detailed modern electronic track with punchy tightly performed drums, a distinctive moving bassline, layered analog synthesizers, evolving arpeggios, textured transitions and a memorable melodic hook. Energetic but musical, carefully arranged, polished low end. No generic loop-library feel.",
  acoustic: "A vulnerable acoustic ballad with natural intimate male vocals, fingerpicked steel-string guitar, restrained piano, subtle room ambience, expressive phrasing and a memorable emotional chorus. Keep the arrangement human and understated, then build gently toward the ending."
};
$("#useBenchmark").addEventListener("click", function () {
  $("#prompt").value = benchmarkPrompts[$("#benchmark").value];
  $("#mode").value = $("#benchmark").value === "cinematic" || $("#benchmark").value === "electronic" ? "instrumental" : "vocals";
  setStatus("Benchmark prompt loaded. Use the same prompt with each provider for a fair comparison.", "success");
  $("#prompt").focus();
});
document.querySelectorAll("[data-prompt]").forEach(function (button) {
  button.addEventListener("click", function () {
    $("#prompt").value = button.dataset.prompt;
    $("#prompt").focus();
  });
});
window.addEventListener("resize", function () {
  document.querySelectorAll(".track-wave").forEach(function (canvas) {
    const row = canvas.closest("[data-track]");
    const track = state.tracks.find(function (item) { return item.id === row.dataset.track; });
    if (track) drawWaveform(canvas, track.buffer, track.color);
  });
});
loadProviderStatus();
updateTransport();
