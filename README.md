# ax-dealroom

**ax-dealroom** is an open-source MCP (Model Context Protocol) server that turns your startup's deal room into a structured, agent-accessible API. AI investment agents — running inside Claude, GPT-4o, Gemini, or any MCP-compatible framework — can query your company data, traction metrics, cap table, and pitch deck programmatically, without human-in-the-loop coordination. The deal room is invisible to human browsers but fully transparent to agents doing diligence.

Hosted version with provisioned sessions, NDA workflows, and investor analytics: [ainative.studio/dealroom](https://ainative.studio/dealroom)

---

## Quick Start

### Run with npx (no install required)

```bash
# From a directory containing your dealroom.config.json
npx ax-dealroom-mcp
```

If no `dealroom.config.json` is found in the working directory, the server starts with a built-in demo config so you can explore the tools immediately.

---

## Add to Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "ax-dealroom": {
      "command": "npx",
      "args": ["ax-dealroom-mcp"],
      "cwd": "/path/to/your/dealroom-directory"
    }
  }
}
```

The `cwd` should be the directory containing your `dealroom.config.json`. Restart Claude Desktop after saving.

---

## Add to Claude Code

Add to `.claude/mcp.json` in your project root (or `~/.claude/mcp.json` for global access):

```json
{
  "mcpServers": {
    "ax-dealroom": {
      "command": "npx",
      "args": ["ax-dealroom-mcp"],
      "cwd": "/path/to/your/dealroom-directory"
    }
  }
}
```

---

## dealroom.config.json Schema

Place this file in the directory you pass as `cwd` to the MCP server. The `data_handling_policy` field is **required** — the server will refuse to start without it.

```json
{
  "company": {
    "name": "Your Startup Inc",
    "tagline": "One line that explains what you do",
    "stage": "Seed",
    "founded": "2024",
    "location": "San Francisco, CA"
  },
  "raise": {
    "instrument": "SAFE",
    "amount_usd": 500000,
    "cap_usd": 5000000,
    "discount_pct": 20,
    "closing_target": "Q2 2026"
  },
  "traction": {
    "arr_usd": 100000,
    "growth_mom_pct": 15,
    "runway_months": 12
  },
  "team": [
    { "name": "Jane Founder", "role": "CEO", "bio": "Previously at BigCo. Built X." },
    { "name": "John Cofounder", "role": "CTO", "bio": "Ex-Google. Open source contributor." }
  ],
  "contact": "investors@yourstartup.com",
  "myterms_url": "https://yourstartup.com/.well-known/myterms.json",
  "data_handling_policy": "Session metadata (provisioning timestamp, tier reached, NDA acceptance) is retained for 90 days. Not shared with third parties. Investors may request deletion at investors@yourstartup.com.",

  "cap_table_summary": {
    "founders": "60%",
    "seed_investors": "20%",
    "option_pool": "15%",
    "advisor_pool": "5%"
  },

  "deck_summary": {
    "problem": "Describe the problem you solve.",
    "solution": "Describe your solution.",
    "market_size": "$10B TAM",
    "business_model": "SaaS, $99/mo per seat",
    "competitive_advantage": "Proprietary data moat"
  },

  "financials_full": {
    "note": "Populate with your P&L. Only returned after NDA acceptance (Tier 2).",
    "revenue_2024": 100000,
    "cogs_2024": 30000,
    "gross_margin_pct": 70,
    "opex_2024": 400000,
    "net_burn_monthly": 25000
  },

  "cap_table_opencap": {
    "note": "OpenCap Alliance format cap table. Only returned after NDA acceptance (Tier 2).",
    "opencap_url": "https://app.opencap.co/your-company"
  }
}
```

### Field Reference

| Field | Required | Description |
|-------|----------|-------------|
| `company.name` | Yes | Legal company name |
| `company.tagline` | Yes | One-line description |
| `company.stage` | Yes | Pre-seed / Seed / Series A / etc. |
| `company.founded` | No | Year founded |
| `company.location` | No | HQ location |
| `raise.instrument` | Yes | SAFE / convertible note / equity |
| `raise.amount_usd` | Yes | Target raise amount in USD |
| `raise.cap_usd` | Yes | Valuation cap in USD |
| `raise.discount_pct` | Yes | Conversion discount percentage |
| `raise.closing_target` | No | Target closing date (e.g. "Q2 2026") |
| `traction.arr_usd` | Yes | Annual recurring revenue in USD |
| `traction.growth_mom_pct` | Yes | Month-over-month growth percentage |
| `traction.runway_months` | Yes | Months of runway remaining |
| `team` | Yes | Array of `{ name, role, bio }` objects |
| `contact` | Yes | Investor contact email |
| `myterms_url` | No | URL to machine-readable terms (myterms.json format) |
| `data_handling_policy` | **Required** | Plain-English statement of how investor session data is handled |
| `cap_table_summary` | No | Shown at Tier 1 — percentage breakdown by shareholder class |
| `deck_summary` | No | Shown at Tier 1 — structured pitch narrative |
| `financials_full` | No | Shown at Tier 2 (post-NDA) — full P&L |
| `cap_table_opencap` | No | Shown at Tier 2 (post-NDA) — OpenCap Alliance format |

---

## Data Tiers

ax-dealroom exposes information in three tiers that map to natural investor diligence stages:

### Tier 0 — Public (no session required)

Available to any agent without authentication.

| Tool | Returns |
|------|---------|
| `get_executive_summary` | Company name, tagline, stage, contact, data handling policy |
| `get_team` | Founders and key team members |
| `get_traction_headline` | Qualitative note directing to Tier 1 |

### Tier 1 — Session-provisioned

Available after the company provisions a dealroom session for an investor. In local mode (self-hosted), all Tier 1 tools are accessible directly.

| Tool | Returns |
|------|---------|
| `get_ask` | Instrument, amount, cap, discount, closing target |
| `get_traction` | ARR, MoM growth, runway months |
| `get_financials` | ARR and runway headline |
| `get_cap_table` | Cap table percentage summary |
| `get_deck_summary` | Structured pitch deck summary |
| `nda_accept` | Accepts NDA and unlocks Tier 2 |

### Tier 2 — NDA-gated

Unlocked by calling `nda_accept` first. Records acceptance with a timestamp.

| Tool | Returns |
|------|---------|
| `get_financials_full` | Full P&L statement |
| `get_cap_table_opencap` | OpenCap Alliance format cap table |

---

## Security Model

**What is public (Tier 0):** Company identity, team, and a qualitative traction headline. This is equivalent to what you would put on a public website. The `data_handling_policy` is always surfaced at Tier 0 so agents know how their session data is handled before proceeding.

**What is session-gated (Tier 1):** Financial metrics, raise terms, and cap table summary. In the hosted version at [ainative.studio/dealroom](https://ainative.studio/dealroom), the company controls which investor agents get a provisioned session. In local mode, Tier 1 data is openly accessible since you control the server.

**What is NDA-gated (Tier 2):** Full P&L and detailed cap table. The `nda_accept` tool creates a machine-readable acceptance record. In hosted mode, this record is timestamped, stored, and linked to the investor's session. In local mode, it returns an acceptance confirmation with the current timestamp.

**What ax-dealroom never does:**
- Serve data to unauthenticated agents in hosted mode beyond Tier 0
- Share investor session data with third parties (enforced by `data_handling_policy`)
- Expose raw credentials or internal system data

---

## data_handling_policy Requirement

The `data_handling_policy` field is **mandatory**. The server will throw an error and refuse to start if it is missing from `dealroom.config.json`.

This requirement exists because AI agents doing diligence are acting on behalf of investors. Those investors have a right to know how their interaction data (session timestamps, tier reached, NDA acceptance records) is stored and used. The policy is surfaced in `get_executive_summary` so it is the first thing any agent reads.

**Minimum acceptable policy:**

```
"data_handling_policy": "Session metadata retained for 90 days. Not shared with third parties."
```

**Recommended policy (with deletion rights):**

```
"data_handling_policy": "Session metadata (provisioning timestamp, tier reached, NDA acceptance) is retained for 90 days. Not shared with third parties. Investors may request deletion at investors@yourstartup.com."
```

---

## Hosted Version

[ainative.studio/dealroom](https://ainative.studio/dealroom) provides:

- Provisioned investor sessions with API key authentication
- NDA acceptance records stored with timestamp and investor identity
- Analytics dashboard: which agents queried what tiers, when
- OpenCap Alliance integration for verified cap table sharing
- `myterms.json` hosting for machine-readable terms

---

## Development

```bash
git clone https://github.com/AINative-Studio/ax-dealroom
cd ax-dealroom/packages/mcp
npm install
npm run build
node dist/index.js
```

### Project Structure

```
ax-dealroom/
├── package.json                 # Monorepo root
├── dealroom.config.json         # Example config (copy and edit for your startup)
├── packages/
│   └── mcp/
│       ├── package.json         # ax-dealroom-mcp package
│       ├── tsconfig.json        # TypeScript config
│       └── src/
│           └── index.ts         # MCP server — 11 tools, 3 tiers
└── README.md
```

---

## License

Apache 2.0 — see [LICENSE](LICENSE).
