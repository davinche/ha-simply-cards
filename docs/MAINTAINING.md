# Maintainer workflow

Target repository: https://github.com/davinche/ha-simply-cards

## Initial publication

This folder is a prepared project, not a published Git checkout. No commit, remote push, tag or GitHub release has been made. In the preparation environment, GitHub access failed and `gh auth status` reported an invalid saved login.

1. Restore GitHub access and authenticate locally using `gh auth login -h github.com`. Do not paste tokens into chat or repository files.
2. Clone your empty repository to a normal project folder. Copy the **contents** of this prepared folder there, including `.github/`, `.gitignore`, `frontend/`, `scripts/` and `tests/`. Do not nest the entire prepared folder inside the repository.
3. Ensure the GitHub repository is public. Give it a description and topics such as `home-assistant`, `lovelace`, `hacs`, `custom-cards`.
4. Install Node.js 22 or newer, then run:

```text
npm install
npx playwright install chromium
npm run build
npm run check:release
npm test
npm run test:bundle
```

5. Commit the prepared files and the generated `package-lock.json`, then push to the repository's default branch. Do not commit `node_modules`, generated screenshots or build output. GitHub Actions also uploads a bundle artifact for branch builds.
6. Wait for **Test and build** to pass in GitHub Actions. Check the source and bundled browser test steps, not only the build.
7. Push tag `v0.1.0` at that tested commit. **Publish release** rebuilds, runs both browser suites, checks that the tag matches `package.json`, and publishes the tested `ha-simply-cards.js` asset only after all checks pass. HACS can then install the release.

The workflow needs repository Actions enabled and permission to create releases; it uses GitHub's built-in token, not a personal token. Published releases are deliberate tag-triggered events; ordinary pushes do not automatically change installed cards.

The package includes pinned direct build/test dependencies. The preparation environment could not download dependencies, so no lockfile or compiled bundle was fabricated. Until a lockfile is generated, workflows use `npm install`. Once committed, switch both workflow installation steps to `npm ci` for locked installs.

## Everyday iteration

1. Edit the source modules in `frontend/` and add/update focused tests in `tests/`.
2. Run the build and both suites above. The bundled suite runs the same regression checks against the compiled entry, including custom-element registration, actions, visual editors, templates and layout geometry.
3. Change `package.json` to the next semantic version (for example `0.1.1`) and update the lockfile. Commit/push the source changes. Do not keep changing `?v=` strings in source imports: releases contain one bundled module.
4. After CI passes, tag that commit with the matching `v` prefix and push the tag. The release workflow publishes the tested asset.
5. In Home Assistant, update through HACS and fully reopen the Echo browser. Dashboard configuration stays untouched unless a change explicitly requires configuration edits.

For experiments, use a version such as `0.2.0-beta.1` and tag `v0.2.0-beta.1`. The workflow marks hyphenated versions as GitHub prereleases. Opt into beta/prerelease downloads in HACS when testing, rather than replacing your stable deployment by default. Roll back by choosing a previous release through HACS redownload/version selection, then fully reloading browsers. Back up YAML separately if you changed configuration.

## Local test environment

Tests use mocked Home Assistant state, form widgets, template result messages and placeholder icons. They do not execute Jinja on a real Home Assistant server or control devices. Validate the live editor, Jinja subscriptions and both Echo browsers before promoting a release.

The harness can use an existing browser/runtime via `ECHO_PLAYWRIGHT_PATH`, `ECHO_BROWSER_PATH` and optional throwaway `ECHO_BROWSER_PROFILE`. Otherwise it uses the installed Playwright browser. Screenshots/results are generated under `tests/` and ignored by Git.

## Privacy and scope

Never copy production dashboards, personal entity/user IDs, tokens, `.env` files, browser profiles or local machine paths into this repository. Examples are placeholders; fixtures use synthetic IDs. Do not rename the existing `echo-…` custom-element tags during packaging: installed dashboard YAML depends on them. Component updates must not overwrite dashboard views or change layout defaults without explicit requirements.
