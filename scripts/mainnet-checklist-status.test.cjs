'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  parseChecklistRows,
  issueNumbersForRepository,
  updateClosedIssueRows,
  auditChecklist,
} = require('./mainnet-checklist-status.cjs');

const fixture = fs.readFileSync(
  path.join(__dirname, 'fixtures/mainnet-checklist.sample.md'),
  'utf8',
);

test('parses checklist table rows and repository issue links', () => {
  const rows = parseChecklistRows(fixture);
  assert.equal(rows.length, 4);
  assert.deepEqual(rows[0].issue, { owner: 'acme', repo: 'protocol', number: 10 });
  assert.equal(rows[3].issue, undefined);
});

test('extracts unique issue numbers for the current repository only', () => {
  assert.deepEqual(issueNumbersForRepository(fixture, 'acme', 'protocol'), [10, 11, 12]);
  assert.deepEqual(issueNumbersForRepository(fixture, 'other', 'protocol'), []);
});

test('marks only closed linked issues as Done', () => {
  const updated = updateClosedIssueRows(fixture, 'acme', 'protocol', [10, 12]);
  const rows = parseChecklistRows(updated);

  assert.equal(rows.find((row) => row.issue?.number === 10).status, 'Done');
  assert.equal(rows.find((row) => row.issue?.number === 11).status, 'Not started');
  assert.equal(rows.find((row) => row.issue?.number === 12).status, 'Done');
  assert.equal(rows.find((row) => row.item === 'Documentation').status, 'In progress');
});

test('reports stale checklist statuses without changing unrelated rows', () => {
  const audit = auditChecklist(
    fixture,
    'acme',
    'protocol',
    new Map([[10, 'closed'], [11, 'open'], [12, 'closed']]),
  );

  assert.deepEqual(
    audit.map(({ issueNumber, accurate }) => ({ issueNumber, accurate })),
    [
      { issueNumber: 10, accurate: false },
      { issueNumber: 11, accurate: true },
      { issueNumber: 12, accurate: true },
    ],
  );
});
