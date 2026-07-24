# Mainnet checklist status audit

Audit date: 24 July 2026.

The checklist parser recognises four rows linked to repository issues: #299, #300, #301, and #298. All four linked issues are closed, while the corresponding checklist rows are still marked `In progress`.

Therefore, the committed checklist is currently stale according to the workflow's documented rule: a row linked to a closed issue should be `Done`. The updated workflow now:

1. runs fixture-based parser tests before changing the checklist;
2. audits every linked row and reports checked/stale counts in the workflow log;
3. marks only rows whose linked issue is closed;
4. leaves document, workflow, external-repository, and new-issue links unchanged;
5. opens the existing automation pull request when the generated Markdown differs.

The audit intentionally verifies link-state accuracy. Maintainers remain responsible for confirming that each linked issue is the correct evidence for the checklist item before merging an automated status PR.
