'use strict';

const ISSUE_URL_PATTERN = /https:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/g;

function parseChecklistRows(markdown) {
  return markdown
    .split('\n')
    .filter((line) => line.trimStart().startsWith('|'))
    .map((line) => ({ line, cells: line.split('|').map((cell) => cell.trim()) }))
    .filter(({ cells }) => cells.length >= 7 && cells[1] !== 'Item' && !/^[-: ]+$/.test(cells[1] || ''))
    .map(({ line, cells }) => {
      const linkCell = cells[5] || '';
      const issue = [...linkCell.matchAll(ISSUE_URL_PATTERN)][0];
      return {
        line,
        item: cells[1],
        description: cells[2],
        owner: cells[3],
        status: cells[4],
        link: linkCell,
        issue: issue
          ? { owner: issue[1], repo: issue[2], number: Number(issue[3]) }
          : undefined,
      };
    });
}

function issueNumbersForRepository(markdown, owner, repo) {
  return [...new Set(
    parseChecklistRows(markdown)
      .filter((row) => row.issue?.owner === owner && row.issue?.repo === repo)
      .map((row) => row.issue.number),
  )];
}

function updateClosedIssueRows(markdown, owner, repo, closedIssueNumbers) {
  const closed = new Set(closedIssueNumbers);
  const rows = parseChecklistRows(markdown);
  const updates = new Map();

  for (const row of rows) {
    if (
      row.issue?.owner === owner &&
      row.issue?.repo === repo &&
      closed.has(row.issue.number) &&
      row.status !== 'Done'
    ) {
      const cells = row.line.split('|');
      cells[4] = ' Done ';
      updates.set(row.line, cells.join('|'));
    }
  }

  return markdown
    .split('\n')
    .map((line) => updates.get(line) || line)
    .join('\n');
}

function auditChecklist(markdown, owner, repo, issueStates) {
  return parseChecklistRows(markdown)
    .filter((row) => row.issue?.owner === owner && row.issue?.repo === repo)
    .map((row) => {
      const actualState = issueStates.get(row.issue.number);
      return {
        item: row.item,
        issueNumber: row.issue.number,
        checklistStatus: row.status,
        issueState: actualState,
        accurate: actualState !== 'closed' || row.status === 'Done',
      };
    });
}

module.exports = {
  parseChecklistRows,
  issueNumbersForRepository,
  updateClosedIssueRows,
  auditChecklist,
};
