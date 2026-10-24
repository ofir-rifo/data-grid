# Pull request description policy

Status: specified for the authorized PR description milestone, 2026-10-24.

The executable policy in `.github/scripts/pr-description-policy.mjs` owns section
names, order and template instructions. Generate the GitHub template from it;
regression tests compare the complete generated template with the committed file.
Documentation refers to that policy rather than maintaining a competing schema.

Exactly five H2 sections are required: Summary; Changes; Tests and Verification;
Risks and Limitations; Related Issues / Specifications, in that order. Other H2
sections are rejected to avoid ambiguous section boundaries. H3 subsections are
allowed. Required headings must be exact, standalone ATX headings with one space
after `##`. Headings inside fenced code or HTML comments are not sections.
Support backtick/tilde fences, CRLF, links, lists and multiline content. This is a
deliberately small Markdown subset, not a CommonMark renderer; indented code and
HTML blocks other than comments are not special parsing contexts.

Ignore comments and Markdown decoration when deciding whether content is empty.
Reject placeholder lines (TODO, TBD, FIXME, TBA, coming soon, template prompts),
even when mixed with prose; do not ban ordinary discussion containing these words.
Summary/Changes require actual change descriptions. Risks accept `None identified`
or explained not-applicable forms; related references require a link, issue/PR
reference, repository spec/document path, or `Not applicable: <explanation>`.

Verification uses one status entry per reported check: `PASS: <check>`,
`FAIL: <check> — <reason>`, or `NOT RUN: <check> — <reason>` (hyphen/colon separators
also accepted). Optional list markers and bold status labels are accepted. Wrapped
lines continue the preceding entry. All entries require substantive descriptions;
FAIL and NOT RUN require substantive reasons. Prose/subheadings may organize the
section using entry continuation lines but cannot replace entries. Automation checks representation, not whether
tests really ran or whether prose is truthful: reviewers retain that obligation.

Draft and regular PRs receive identical validation. CLI reads only the real event
payload's pull_request.body and fails closed on absent/malformed event data.
The read-only pull_request workflow has no draft/path filters, no secrets,
dependency installation, builds or privileged execution. One job name is stable:
`PR description`. Unit tests exercise parsing, content rules, CLI and exact
template/workflow contracts. Content is never interpolated into shell commands
or GitHub workflow annotations. Current workflow code is reviewable PR code;
read-only execution limits damage but cannot prevent a PR from changing its own
validator. Review workflow changes before merging. Required checks are a separate,
human-controlled repository setting; implementation alone does not enforce merges.

Acceptance: all requested negative/positive cases have deterministic tests, errors
name the offending section, malformed events exit nonzero, template drift fails,
all six requested PR event types are present, and no existing protections or PRs
are modified. Heavy workloads remain prohibited. Performance HOLD; POC NO-GO.
