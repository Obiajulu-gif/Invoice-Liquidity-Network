'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  parseChecklist,
  updateChecklist,
  summarizeChecklist,
} = require('./mainnet-checklist-status');

const repository = 'Invoice-Liquidity-Network/Invoice-Liquidity-Network';
const fixture = fs.readFileSync(
  path.join(__dirname, '__fixtures__', 'mainnet-launch-checklist.md'),
  'utf8',
);

test('parses local issue links without treating external links as local', () => {
  const rows = parseChecklist(fixture, repository);

  assert.equal(rows.length, 5);
  assert.deepEqual(
    rows.map(({ item, status, issueNumber }) => ({ item, status, issueNumber })),
    [
      { item: 'Closed issue', status: 'In progress', issueNumber: 10 },
      { item: 'Open issue', status: 'Not started', issueNumber: 11 },
      { item: 'Already done', status: 'Done', issueNumber: 12 },
      { item: 'External issue', status: 'Blocked', issueNumber: null },
      { item: 'Documentation', status: 'In progress', issueNumber: null },
    ],
  );
});

test('marks only rows backed by closed local issues as done', () => {
  const result = updateChecklist(fixture, repository, [10, 12, 20]);
  const rows = result.rows;

  assert.equal(result.changed, true);
  assert.equal(rows.find((row) => row.issueNumber === 10).status, 'Done');
  assert.equal(rows.find((row) => row.issueNumber === 11).status, 'Not started');
  assert.equal(rows.find((row) => row.item === 'External issue').status, 'Blocked');
  assert.equal(rows.find((row) => row.item === 'Documentation').status, 'In progress');
});

test('is idempotent after statuses have already been updated', () => {
  const first = updateChecklist(fixture, repository, [10]);
  const second = updateChecklist(first.content, repository, [10]);

  assert.equal(first.changed, true);
  assert.equal(second.changed, false);
  assert.equal(second.content, first.content);
});

test('summarizes the real checklist format accurately', () => {
  const summary = summarizeChecklist(fixture, repository);

  assert.deepEqual(summary, {
    total: 5,
    linkedIssues: 3,
    byStatus: {
      'In progress': 2,
      'Not started': 1,
      Done: 1,
      Blocked: 1,
    },
  });
});
