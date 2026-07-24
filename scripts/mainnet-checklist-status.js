'use strict';

const ISSUE_URL_PATTERN = /https:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/g;

function parseChecklist(content, repository) {
  const rows = [];
  const lines = content.split('\n');

  lines.forEach((line, lineIndex) => {
    if (!line.trimStart().startsWith('|')) return;

    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 5 || cells[0] === '---' || cells[0] === 'Item') return;

    const links = [...line.matchAll(ISSUE_URL_PATTERN)];
    const matchingIssue = links.find(
      (match) => `${match[1]}/${match[2]}`.toLowerCase() === repository.toLowerCase(),
    );

    rows.push({
      lineIndex,
      item: cells[0],
      status: cells[3],
      issueNumber: matchingIssue ? Number(matchingIssue[3]) : null,
      cells,
    });
  });

  return rows;
}

function updateChecklist(content, repository, closedIssueNumbers) {
  const closed = new Set([...closedIssueNumbers].map(Number));
  const rows = parseChecklist(content, repository);
  const rowsByLine = new Map(rows.map((row) => [row.lineIndex, row]));

  const updated = content
    .split('\n')
    .map((line, lineIndex) => {
      const row = rowsByLine.get(lineIndex);
      if (!row || row.issueNumber === null || !closed.has(row.issueNumber)) return line;
      if (row.status === 'Done') return line;

      const cells = line.split('|');
      if (cells.length < 7) return line;
      cells[4] = ' Done ';
      return cells.join('|');
    })
    .join('\n');

  return {
    content: updated,
    changed: updated !== content,
    rows: parseChecklist(updated, repository),
  };
}

function summarizeChecklist(content, repository) {
  const rows = parseChecklist(content, repository);
  const byStatus = rows.reduce((summary, row) => {
    summary[row.status] = (summary[row.status] || 0) + 1;
    return summary;
  }, {});

  return {
    total: rows.length,
    linkedIssues: rows.filter((row) => row.issueNumber !== null).length,
    byStatus,
  };
}

module.exports = { parseChecklist, updateChecklist, summarizeChecklist };
