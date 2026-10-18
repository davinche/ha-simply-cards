# Current validation

Locally validated on October 18, 2026 for `v0.1.1-beta.6`. The release tag
identifies the source revision once published. Local checks do not replace
live Home Assistant/Echo validation.

Beta.6 adds shared production design styles, exact bundled Inter/Cormorant faces,
Image Button actions/editor, opt-in horizontal Entity layout, 17 embedded weather
backgrounds with theme-aware text, and centered media icons. Public design
fixtures use fictional labels and synthetic entity IDs. Private deployment
reviews and screenshot-specific notes are excluded from version control.
Privacy checks run in both CI and the release workflow, alongside source/bundle
browser suites. Physical-device verification remains a separate live check.

- Source browser suite: 29 groups pass using local Chrome and Playwright.
- Release build and metadata checks pass. The bundle has no external imports.
- The same 29 browser groups also run against the compiled bundle.
- A real npm lockfile is included; both GitHub workflows use `npm ci`.
- Coverage includes native Grid/Sections contracts, responsive layouts,
  complete action-form saves, inherited/explicit icon actions, independent
  power switches, picture preservation, preview protection, shared request
  guards, accessibility and compact media fallback.
- Beta.2 adds independent Entity icon-background colors and a blank default
  thermostat hint. Both have regression coverage, including custom hints and
  restoring state-based background colors.
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
was exercised during local validation. Publishing is handled separately by
the tagged GitHub release workflow.

## Historical preparation limits

Earlier preparation notes reported unavailable npm/GitHub access and no
lockfile or validated bundle. The npm and local bundle limitations were
resolved during this audit follow-up. Earlier saved GitHub login errors do
not establish current authentication status; check locally when needed.
