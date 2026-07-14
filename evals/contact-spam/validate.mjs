import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { deterministicContactDecision } from '../../gateway/lib/contactSpam.js';

const dataset = JSON.parse(readFileSync(new URL('./dataset.v1.json', import.meta.url), 'utf8'));
assert.equal(dataset.schema_version, 'contact-spam.dataset.v1');
assert.ok(Array.isArray(dataset.cases) && dataset.cases.length >= 20);

const ids = new Set();
let criticalDeliveries = 0;
let advertisingRejects = 0;
for (const entry of dataset.cases) {
  assert.match(entry.id, /^[a-z0-9-]+$/);
  assert.ok(!ids.has(entry.id), `duplicate id: ${entry.id}`);
  ids.add(entry.id);
  assert.ok(['Consulting', 'Content collaboration', 'Speaking opportunity', 'Other'].includes(entry.intent));
  assert.ok(['deliver', 'reject'].includes(entry.expected));
  assert.equal(typeof entry.message, 'string');
  assert.ok(entry.message.length >= 20);
  assert.doesNotMatch(entry.message, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);

  const ruleDecision = deterministicContactDecision(entry.message).decision;
  if (entry.critical) {
    criticalDeliveries += 1;
    assert.equal(entry.expected, 'deliver');
    assert.notEqual(ruleDecision, 'reject', `${entry.id}: critical legitimate message was rejected`);
  }
  if (entry.expected === 'reject') {
    advertisingRejects += 1;
    assert.equal(ruleDecision, 'reject', `${entry.id}: explicit advertising escaped deterministic rules`);
  }
}

console.log(`Validated ${dataset.cases.length} contact-spam cases.`);
console.log(`Critical legitimate deliveries: ${criticalDeliveries}; explicit advertising rejects: ${advertisingRejects}.`);

