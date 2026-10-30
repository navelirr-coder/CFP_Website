const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '../frontend/script.js'), 'utf8');
const controller = source.slice(source.indexOf('  const carouselTrack ='), source.indexOf('  const categoryPills ='));
class Element {
  constructor() {
    this.handlers = {};
    this.style = { removeProperty(name) { delete this[name]; } };
    this.classes = new Set();
    this.classList = { toggle: (name, active) => active ? this.classes.add(name) : this.classes.delete(name) };
    this.captures = new Set();
    this.clientWidth = 390;
  }
  addEventListener(name, handler) { (this.handlers[name] ||= []).push(handler); }
  setPointerCapture(id) { this.captures.add(id); }
  hasPointerCapture(id) { return this.captures.has(id); }
  releasePointerCapture(id) { this.captures.delete(id); }
  emit(name, args = {}) {
    const event = { pointerId: 1, isPrimary: true, button: 0, clientX: 200, clientY: 150,
      target: { closest: () => null }, preventDefault() { this.prevented = true; },
      stopPropagation() { this.stopped = true; }, ...args };
    for (const handler of this.handlers[name] || []) handler(event);
    return event;
  }
}
const track = new Element();
const surface = track.parentElement = new Element();
const prev = new Element(), next = new Element();
const dots = [0, 1, 2].map(index => {
  const dot = new Element(); dot.getAttribute = () => String(index); return dot;
});
let clock = 1000, timerId = 0;
const timers = new Map();
vm.runInNewContext(controller, {
  document: { getElementById: id => ({ carouselTrack: track, prevSlideBtn: prev, nextSlideBtn: next }[id]), querySelectorAll: () => dots },
  Date: { now: () => clock },
  setInterval: (fn, delay) => { assert.equal(delay, 5000); timers.set(++timerId, fn); return timerId; },
  clearInterval: id => timers.delete(id)
});
const selected = () => dots.findIndex(dot => dot.classes.has('active'));
function gesture(dx, dy = 0, ending = 'pointerup') {
  clock += 1000;
  surface.emit('pointerdown'); assert.equal(timers.size, 0, 'autoplay pauses during interaction');
  surface.emit('pointermove', { clientX: 200 + dx, clientY: 150 + dy });
  surface.emit(ending, { clientX: 200 + dx, clientY: 150 + dy });
  assert.equal(timers.size, 1, 'exactly one autoplay timer resumes');
  assert.equal(surface.captures.size, 0, 'pointer capture is released');
  assert.equal(track.style.transition, undefined, 'normal snap animation is restored');
}

assert.equal(timers.size, 1);
gesture(-130, 3); assert.equal(selected(), 1, 'left swipe advances');
assert.equal(surface.emit('click').prevented, true, 'swiping on a link does not accidentally navigate');
gesture(130, 2); assert.equal(selected(), 0, 'right swipe returns');
gesture(130); assert.equal(selected(), 2, 'right swipe wraps at the first slide');
gesture(-130); assert.equal(selected(), 0, 'left swipe wraps at the last slide');
gesture(12, 150); assert.equal(selected(), 0, 'vertical scrolling does not change slides');
assert.ok(!surface.emit('click').prevented, 'vertical scrolling does not suppress a subsequent tap');
gesture(-20); assert.equal(selected(), 0, 'short drags snap back');
gesture(-130, 0, 'pointercancel'); assert.equal(selected(), 0, 'browser cancellation does not change slides');
gesture(-130, 0, 'lostpointercapture'); assert.equal(selected(), 0, 'lost capture recovers cleanly');

surface.emit('pointerdown'); surface.emit('pointerup');
assert.ok(!surface.emit('click').prevented, 'a new Shop CTA tap immediately after a gesture is preserved');
surface.emit('pointerdown');
surface.emit('pointermove', { pointerId: 9, clientX: 20 });
assert.equal(track.style.transition, undefined, 'unrelated pointers are ignored');
surface.emit('pointerdown', { pointerId: 2, isPrimary: false });
surface.emit('pointerup', { clientX: 20 });
assert.equal(selected(), 0, 'multitouch/pinch does not advance');
assert.equal(timers.size, 1);

surface.emit('pointerdown', { target: { closest: () => ({}) } });
assert.equal(timers.size, 1, 'buttons retain their existing click handling');
next.emit('click'); assert.equal(selected(), 1);
prev.emit('click'); assert.equal(selected(), 0);
dots[2].emit('click'); assert.equal(selected(), 2);
[...timers.values()][0](); assert.equal(selected(), 0, 'autoplay still advances and wraps');
assert.equal(timers.size, 1);
console.log('PASS: hero swipe directions/wrapping, vertical scroll, tap safety, cancelled/multitouch gestures, capture recovery, buttons and autoplay.');
