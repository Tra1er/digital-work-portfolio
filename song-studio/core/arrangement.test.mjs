import test from "node:test";
import assert from "node:assert/strict";
import {
  TICKS_PER_QUARTER, ticksPerBar, barsToTicks, ticksToSeconds,
  secondsToTicks, snapTick, emptyProject, addTrack, addClip,
  moveClip, resizeClip, duplicateClip, setClipLoop, removeClip, playbackPlan
} from "./arrangement.mjs";

test("120 BPM 4/4: 8 bars = 16 seconds", () => {
  assert.equal(ticksPerBar({ numerator: 4, denominator: 4 }), 3840);
  assert.equal(ticksToSeconds(barsToTicks(8, { numerator: 4, denominator: 4 }), 120), 16);
});
test("6/8 has three quarter-note beats per bar; 4 bars = 6 seconds at 120 quarter-note BPM", () => {
  assert.equal(ticksPerBar({ numerator: 6, denominator: 8 }), 2880);
  assert.equal(ticksToSeconds(barsToTicks(4, { numerator: 6, denominator: 8 }), 120), 6);
});
test("seconds and ticks round trip within one tick", () => {
  assert.ok(Math.abs(secondsToTicks(12.34, 115) - 12.34 * 115 * TICKS_PER_QUARTER / 60) < 0.5);
});
test("snapTick rounds to the nearest grid", () => {
  assert.equal(snapTick(1921, 480), 1920);
  assert.equal(snapTick(2010, 480), 1920);
  assert.equal(snapTick(2250, 480), 2400);
});
test("clips are immutable and quantized when moved", () => {
  const p0 = emptyProject({ id: "p1", bpm: 120 });
  const p1 = addTrack(p0, { id: "drums", name: "Drums", type: "drums" });
  const p2 = addClip(p1, { id: "c1", trackId: "drums", assetId: "a1", lengthTicks: 3840 });
  const p3 = moveClip(p2, "c1", 1800, { snap: 960 });
  assert.equal(p2.clips[0].startTick, 0);
  assert.equal(p3.clips[0].startTick, 1920);
  assert.equal(p0.tracks.length, 0);
});
test("duplicating, resizing and looping preserves original clip", () => {
  let p = emptyProject({ id: "p1" });
  p = addTrack(p, { id: "t1" });
  p = addClip(p, { id: "c1", trackId: "t1", assetId: "a1", lengthTicks: 3840 });
  const p2 = duplicateClip(p, "c1", { id: "c2" });
  assert.equal(p2.clips[1].startTick, 3840);
  const p3 = resizeClip(p2, "c2", 4200, { snap: 960 });
  assert.equal(p3.clips[1].lengthTicks, 3840);
  const p4 = setClipLoop(p3, "c2", true);
  assert.equal(p4.clips[1].loop, true);
  assert.equal(p.clips.length, 1);
  assert.equal(p4.clips[0].loop, false);
});
test("playbackPlan converts offsets and musical durations without modifying project", () => {
  let p = emptyProject({ id: "p2", bpm: 120 });
  p = addTrack(p, { id: "guitar", name: "Guitar" });
  p = addClip(p, { id: "g1", trackId: "guitar", assetId: "a", startTick: 3840, lengthTicks: 7680, sourceOffsetSeconds: 1.5 });
  const [event] = playbackPlan(p);
  assert.equal(event.startSeconds, 2);
  assert.equal(event.durationSeconds, 4);
  assert.equal(event.sourceOffsetSeconds, 1.5);
  assert.equal(p.clips[0].startSeconds, undefined);
});
test("invalid tracks/clips are rejected", () => {
  const p = emptyProject({ id: "p3" });
  assert.throws(() => addClip(p, { id: "x", trackId: "missing", assetId: "a", lengthTicks: 1 }), /nonexistent/);
  assert.throws(() => addTrack(p, { id: "x", volume: 9 }), /Invalid mixer/);
  assert.throws(() => emptyProject({ id: "p", bpm: 0 }), /positive/);
});
test("removeClip removes only the requested clip", () => {
  let p = addTrack(emptyProject({ id: "p4" }), { id: "a" });
  p = addClip(p, { id: "c1", trackId: "a", assetId: "file", lengthTicks: 960 });
  p = addClip(p, { id: "c2", trackId: "a", assetId: "file", lengthTicks: 960 });
  const next = removeClip(p, "c1");
  assert.deepEqual(next.clips.map(c => c.id), ["c2"]);
  assert.equal(p.clips.length, 2);
});
