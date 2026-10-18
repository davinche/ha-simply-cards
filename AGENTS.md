# Contributor instructions

Use [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) as the source of truth for
palette, typography, card layouts, and light/dark behavior. Keep explicit user
color overrides working. Reuse the shared gesture handling for new cards.

New components and alternate layouts are opt-in. Preserve existing dashboard
composition and entity orientation unless the user explicitly requests a change.
Do not add scenes or enable alternate layouts merely to showcase them.

Typography: reserve Cormorant Garamond for the room title and
weather condition. All other text uses Inter, including greetings and Music.

Verification is required for every change. For visual changes, render previews
from the actual implementation, inspect them, and show them to the user before
considering the work complete. Cover affected states and both themes where
applicable; passing code assertions alone is not visual verification. State
which checks ran and any remaining device-specific verification.

Public distribution: never commit private dashboard configurations, deployment
notes, personal names/addresses, actual entity/user/device IDs, credentials,
internal service URLs, browser profiles, or machine-specific filesystem paths.
Use fictional labels and synthetic IDs in public examples and tests. Review the
exact staged files before pushing; run `npm run check:privacy -- --staged`.
