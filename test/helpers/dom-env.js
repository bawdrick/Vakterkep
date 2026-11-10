// Browser-like globals for UI tests (happy-dom); each test file runs in its own process.

import { after } from 'node:test';
import { Window } from 'happy-dom';

export function installDom() {
  const window = new Window({ url: 'http://localhost/' });
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.Node = window.Node;
  after(() => window.happyDOM.close());
  return window;
}

// Manual timers: tests decide when a scheduled callback runs
export function createManualTimers() {
  const pending = new Map();
  let nextId = 1;
  return {
    setTimeout(fn) {
      pending.set(nextId, fn);
      return nextId++;
    },
    clearTimeout(id) {
      pending.delete(id);
    },
    get size() {
      return pending.size;
    },
    runAll() {
      const due = [...pending.values()];
      pending.clear();
      due.forEach((fn) => fn());
    },
  };
}
