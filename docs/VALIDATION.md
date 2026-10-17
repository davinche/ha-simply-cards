# Current validation

Validated on October 17, 2026 against base revision
`2f543123752a474f364eb0308de45bb0592bf9cb` plus the uncommitted audit fixes.
This is a local working-tree validation, not validation of a published release.

- Source browser suite: 29 groups pass using local Chrome and Playwright.
- Release build and metadata checks pass. The bundle has no external imports.
- The same 29 browser groups also run against the compiled bundle.
- A real npm lockfile is included; both GitHub workflows use `npm ci`.
- Coverage includes native Grid/Sections contracts, responsive layouts,
  complete action-form saves, inherited/explicit icon actions, independent
  power switches, picture preservation, preview protection, shared request
  guards, accessibility and compact media fallback.
- Fixtures use synthetic entity/user IDs. Browser screenshots and test results
  are generated under `tests/` and ignored by Git.

## Required live checks

The browser harness mocks Home Assistant widgets and template messages. Its
form mock now submits the full populated form rather than only edited fields.
This catches save-related regressions but does not replace real UI validation.

Before promoting a release, verify the following on Home Assistant:

1. Edit only a Control hold action, save, and confirm its inherited icon tap
   still toggles. Repeat with a slider and the legacy Fan alias.
2. Set icon tap explicitly to none; confirm the icon does nothing and the
   slider power switch still works. Reload and verify persistence.
3. Confirm gesture selectors, entity context, confirmations and editor previews
   work with actual Home Assistant widgets.
4. Check Jinja subscriptions, real icons/fonts and artwork on both Echo browsers.
5. Verify HACS installation/resource reload and both GitHub workflow runs.

No live Home Assistant, real devices, HACS install, or remote GitHub workflow
was exercised during local validation. No commit, push, tag or release was
performed as part of the audit fixes.

## Historical preparation limits

Earlier preparation notes reported unavailable npm/GitHub access and no
lockfile or validated bundle. The npm and local bundle limitations were
resolved during this audit follow-up. Earlier saved GitHub login errors do
not establish current authentication status; check locally when needed.
