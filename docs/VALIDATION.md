# Preparation checks

- The full 22-group source browser regression suite passes using the locally available Playwright runtime and Chrome. It covers component actions, templates, visual editors, native Grid/Sections sizing, both thermostat variants, generic Entity/Container rendering, opt-in Header/Weather arrangements and long-title truncation.
- Test fixtures and hardcoded fixture references use synthetic entity IDs; production view YAML, user IDs, credentials and browser profiles are not part of this project.
- Build and release-check scripts pass JavaScript syntax checks.
- GitHub access failed in the preparation environment; the saved GitHub CLI login is invalid. No Git commit/push, tag or release was created.
- Dependency installation failed with `ENOTFOUND registry.npmjs.org`. The esbuild bundle, bundled browser suite, lockfile generation and GitHub workflows therefore remain unverified here. The first connected CI run must pass both suites before publishing/installing a release.
- Browser tests mock Home Assistant form widgets, state and template messages. Live Jinja evaluation, HACS installation, resource migration and both Echo browsers require real-system verification.
