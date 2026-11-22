/**
 * Pure arrangement document model for The Digital Works Song Studio.
 *
 * The source of truth for all timeline placements is the musical tick:
 * 960 ticks = 1 quarter note. Audio assets are NOT included here.
 * This module never opens a network connection, creates an AudioContext,
 * requests GPU compute, or touches browser storage.
 */
export const TICKS_PER_QUARTER = 960;
export const PROJECT_VERSION = 1;

function positiveNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new TypeError(label + " must be a finite positive number.");
  }
  return value;
}
function integerAtLeast(value, minimum, label) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new TypeError(label + " must be an integer >= " + minimum + ".");
  }
  return value;
}
function nonEmptyString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(label + " must be a non-empty string.");
  }
  return value.trim();
}
function meterParts(meter) {
  if (!meter || typeof meter !== "object") {
    throw new TypeError("meter must be an object.");
  }
  const { numerator, denominator } = meter;
  if (![2, 3, 4, 5, 6, 7, 9, 12].includes(numerator) ||
      ![2, 4, 8, 16].includes(denominator)) {
    throw new RangeError("Unsupported time signature.");
  }
  return { numerator, denominator };
}

export function ticksPerBar(meter = { numerator: 4, denominator: 4 }) {
  const { numerator, denominator } = meterParts(meter);
  return TICKS_PER_QUARTER * numerator * (4 / denominator);
}

export function barsToTicks(bars, meter) {
  integerAtLeast(bars, 0, "bars");
  return bars * ticksPerBar(meter);
}

export function ticksToSeconds(ticks, bpm) {
  integerAtLeast(ticks, 0, "ticks");
  positiveNumber(bpm, "bpm");
  return ticks * 60 / (bpm * TICKS_PER_QUARTER);
}

export function secondsToTicks(seconds, bpm) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) {
    throw new TypeError("seconds must be finite and non-negative.");
  }
  positiveNumber(bpm, "bpm");
  return Math.round(seconds * bpm * TICKS_PER_QUARTER / 60);
}

export function snapTick(tick, gridTicks) {
  integerAtLeast(tick, 0, "tick");
  integerAtLeast(gridTicks, 1, "gridTicks");
  return Math.max(0, Math.round(tick / gridTicks) * gridTicks);
}

export function emptyProject({
  id, name = "Untitled song", bpm = 120,
  meter = { numerator: 4, denominator: 4 }
}) {
  nonEmptyString(id, "project id");
  nonEmptyString(name, "project name");
  positiveNumber(bpm, "bpm");
  if (bpm < 30 || bpm > 300) throw new RangeError("bpm must be 30..300.");
  const validMeter = meterParts(meter);
  return {
    schemaVersion: PROJECT_VERSION,
    id,
    name,
    bpm,
    meter: validMeter,
    tracks: [],
    clips: []
  };
}

function validateProject(project) {
  if (!project || project.schemaVersion !== PROJECT_VERSION ||
      !Array.isArray(project.tracks) || !Array.isArray(project.clips)) {
    throw new TypeError("Invalid or unsupported Song Studio document.");
  }
  positiveNumber(project.bpm, "project bpm");
  meterParts(project.meter);
}
function replaceClip(project, clipId, change) {
  validateProject(project);
  if (!project.clips.some(clip => clip.id === clipId)) {
    throw new RangeError("Clip not found: " + clipId);
  }
  return {
    ...project,
    clips: project.clips.map(clip => clip.id === clipId ? { ...clip, ...change } : clip)
  };
}

export function addTrack(project, {
  id, name = "New track", type = "audio", muted = false,
  solo = false, volume = 1, pan = 0
}) {
  validateProject(project);
  nonEmptyString(id, "track id");
  nonEmptyString(name, "track name");
  if (project.tracks.some(track => track.id === id)) {
    throw new RangeError("Track id already exists.");
  }
  if (!["audio", "instrument", "vocal", "drums", "bus"].includes(type)) {
    throw new RangeError("Unsupported track type.");
  }
  if (typeof muted !== "boolean" || typeof solo !== "boolean" ||
      typeof volume !== "number" || volume < 0 || volume > 2 ||
      typeof pan !== "number" || pan < -1 || pan > 1) {
    throw new RangeError("Invalid mixer settings.");
  }
  const track = { id, name, type, muted, solo, volume, pan };
  return { ...project, tracks: [...project.tracks, track] };
}

export function addClip(project, {
  id, trackId, assetId, startTick = 0, lengthTicks,
  sourceOffsetSeconds = 0, loop = false, gain = 1
}) {
  validateProject(project);
  nonEmptyString(id, "clip id");
  nonEmptyString(trackId, "track id");
  nonEmptyString(assetId, "asset id");
  integerAtLeast(startTick, 0, "startTick");
  integerAtLeast(lengthTicks, 1, "lengthTicks");
  if (!project.tracks.some(track => track.id === trackId)) {
    throw new RangeError("Clip points to a nonexistent track.");
  }
  if (project.clips.some(clip => clip.id === id)) {
    throw new RangeError("Clip id already exists.");
  }
  if (typeof sourceOffsetSeconds !== "number" || sourceOffsetSeconds < 0 ||
      !Number.isFinite(sourceOffsetSeconds) ||
      typeof loop !== "boolean" ||
      typeof gain !== "number" || gain < 0 || gain > 2 || !Number.isFinite(gain)) {
    throw new RangeError("Invalid clip settings.");
  }
  const clip = {
    id, trackId, assetId, startTick, lengthTicks,
    sourceOffsetSeconds, loop, gain
  };
  return { ...project, clips: [...project.clips, clip] };
}

export function moveClip(project, clipId, startTick, { snap = 0, trackId } = {}) {
  validateProject(project);
  integerAtLeast(startTick, 0, "startTick");
  if (snap !== 0) integerAtLeast(snap, 1, "snap");
  const nextStart = snap ? snapTick(startTick, snap) : startTick;
  const change = { startTick: nextStart };
  if (trackId !== undefined) {
    if (!project.tracks.some(track => track.id === trackId)) {
      throw new RangeError("Target track does not exist.");
    }
    change.trackId = trackId;
  }
  return replaceClip(project, clipId, change);
}

export function resizeClip(project, clipId, lengthTicks, { snap = 0 } = {}) {
  integerAtLeast(lengthTicks, 1, "lengthTicks");
  if (snap !== 0) integerAtLeast(snap, 1, "snap");
  const nextLength = snap ? Math.max(snap, snapTick(lengthTicks, snap)) : lengthTicks;
  return replaceClip(project, clipId, { lengthTicks: nextLength });
}

export function duplicateClip(project, clipId, { id, startTick, snap = 0 }) {
  validateProject(project);
  nonEmptyString(id, "new clip id");
  const source = project.clips.find(clip => clip.id === clipId);
  if (!source) throw new RangeError("Source clip not found.");
  const newStart = startTick === undefined
    ? source.startTick + source.lengthTicks
    : startTick;
  return addClip(project, {
    ...source,
    id,
    startTick: snap ? snapTick(newStart, snap) : newStart
  });
}

export function setClipLoop(project, clipId, enabled) {
  if (typeof enabled !== "boolean") throw new TypeError("enabled must be boolean.");
  return replaceClip(project, clipId, { loop: enabled });
}

export function removeClip(project, clipId) {
  validateProject(project);
  return { ...project, clips: project.clips.filter(clip => clip.id !== clipId) };
}

/**
 * Convert arrangement into events for a separate audio scheduler.
 * \`sourceOffsetSeconds\` is the offset into the original audio file.
 *
 * NOTE: The scheduler must use a decoded buffer's true duration to validate
 * loop start/end and non-loop source bounds. An event with loop=true is
 * *not* automatically a seamless loop (crossfade / beat matching is separate).
 */
export function playbackPlan(project) {
  validateProject(project);
  return project.clips
    .filter(clip => project.tracks.some(t => t.id === clip.trackId))
    .map(clip => ({
      ...clip,
      startSeconds: ticksToSeconds(clip.startTick, project.bpm),
      durationSeconds: ticksToSeconds(clip.lengthTicks, project.bpm)
    }))
    .sort((a, b) => a.startTick - b.startTick || a.id.localeCompare(b.id));
}
