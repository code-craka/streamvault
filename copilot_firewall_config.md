# Customizing or disabling the firewall for GitHub Copilot coding agent

Copilot coding agent uses an outbound firewall by default to reduce data exfiltration risk. You can keep the recommended allowlist and add a minimal custom allowlist for required third‑party APIs.

Where to configure
- Repository Settings → Code & automation → Copilot → coding agent

Recommended settings
- Enable firewall: ON
- Recommended allowlist: ON
- Custom allowlist: add only what you need

Suggested custom allowlist for StreamVault
- Cloudflare Stream API (narrow URL is safer):
  - https://api.cloudflare.com/client/v4/accounts/<YOUR_ACCOUNT_ID>/stream/
  - Or broader: Domain: api.cloudflare.com
- Playback CDN (if tests fetch sample content):
  - Domain: videodelivery.net
- Stripe API (use test keys in CI):
  - Domain: api.stripe.com
- Google/Firebase (only those used by tests/build):
  - Domains: firestore.googleapis.com, firebase.googleapis.com, storage.googleapis.com

How the firewall behaves
- If a blocked request occurs, Copilot will add a warning to the PR or comment indicating the blocked address and the command that attempted it. Use that signal to refine the allowlist.

Disabling the firewall (not recommended)
- Toggle "Enable firewall" to OFF. This allows the agent to connect to any host and increases exfiltration risk. Prefer targeted allowlisting.

Notes
- Larger runners and self-hosted runners: Copilot supports GitHub‑hosted Ubuntu x64 runners only. To use larger runners, provision them first in Settings → Actions → Runners → Larger runners, then update the `runs-on` label in `.github/workflows/copilot-setup-steps.yml`.
- Git LFS: The setup workflow checks out with `lfs: true` to ensure LFS objects are available to the agent.