#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';

// --- Config types ---

interface TeamMember {
  name: string;
  role: string;
  bio: string;
}

interface DealroomConfig {
  company: {
    name: string;
    tagline: string;
    stage: string;
    founded?: string;
    location?: string;
  };
  raise: {
    instrument: string;
    amount_usd: number;
    cap_usd: number;
    discount_pct: number;
    closing_target?: string;
  };
  traction: {
    arr_usd: number;
    growth_mom_pct: number;
    runway_months: number;
  };
  team: TeamMember[];
  contact: string;
  myterms_url?: string;
  data_handling_policy: string;
  cap_table_summary?: Record<string, unknown>;
  deck_summary?: Record<string, unknown>;
  financials_full?: Record<string, unknown>;
  cap_table_opencap?: Record<string, unknown>;
}

// --- Load config ---

function loadConfig(): DealroomConfig {
  const configPath = path.join(process.cwd(), 'dealroom.config.json');

  if (!fs.existsSync(configPath)) {
    // Return demo config when no config file is present
    return {
      company: {
        name: 'Acme Inc',
        tagline: 'Building the future',
        stage: 'Seed',
        founded: '2024',
        location: 'San Francisco, CA',
      },
      raise: {
        instrument: 'SAFE',
        amount_usd: 500000,
        cap_usd: 5000000,
        discount_pct: 20,
      },
      traction: {
        arr_usd: 100000,
        growth_mom_pct: 15,
        runway_months: 12,
      },
      team: [{ name: 'Jane Founder', role: 'CEO', bio: 'Previously at BigCo' }],
      contact: 'investors@acme.com',
      data_handling_policy:
        'Session data retained 90 days. Not shared with third parties.',
    };
  }

  const raw: DealroomConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  if (!raw.data_handling_policy) {
    throw new Error(
      'dealroom.config.json must include a "data_handling_policy" field. ' +
        'Example: "Session metadata retained 90 days. Not shared with third parties."'
    );
  }

  return raw;
}

const config = loadConfig();

// --- Tool definitions ---
// Tier 0: Public, no key required
// Tier 1: Session-provisioned (api_key or hosted dealroom session)
// Tier 2: NDA-gated (call nda_accept first)

interface ToolDef {
  name: string;
  tier: 0 | 1 | 2;
  description: string;
}

const TOOLS: ToolDef[] = [
  {
    name: 'get_executive_summary',
    tier: 0,
    description: 'Company overview, problem, solution, and current stage',
  },
  {
    name: 'get_team',
    tier: 0,
    description: 'Founders and key team members with bios',
  },
  {
    name: 'get_traction_headline',
    tier: 0,
    description: 'Qualitative traction summary — no specific figures',
  },
  {
    name: 'get_ask',
    tier: 1,
    description: 'Investment ask: amount, instrument, valuation cap, and discount',
  },
  {
    name: 'get_traction',
    tier: 1,
    description: 'Full traction metrics: ARR, MoM growth, runway',
  },
  {
    name: 'get_financials',
    tier: 1,
    description: 'Financial headline: ARR, runway months, burn rate note',
  },
  {
    name: 'get_cap_table',
    tier: 1,
    description: 'Cap table summary (founders, investors, option pool)',
  },
  {
    name: 'get_deck_summary',
    tier: 1,
    description: 'Structured pitch deck summary with key slides',
  },
  {
    name: 'get_financials_full',
    tier: 2,
    description: 'Full P&L statement — requires prior NDA acceptance',
  },
  {
    name: 'get_cap_table_opencap',
    tier: 2,
    description: 'OpenCap Alliance cap table export — requires prior NDA acceptance',
  },
  {
    name: 'nda_accept',
    tier: 1,
    description:
      'Accept machine-readable NDA to unlock Tier 2 data. Records acceptance with timestamp.',
  },
];

// --- Server ---

const server = new Server(
  { name: 'ax-dealroom-mcp', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map((t) => ({
    name: t.name,
    description: `[Tier ${t.tier}] ${t.description}`,
    inputSchema: { type: 'object' as const, properties: {}, required: [] },
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name } = request.params;
  const tool = TOOLS.find((t) => t.name === name);

  if (!tool) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ error: `Unknown tool: ${name}` }),
        },
      ],
    };
  }

  let result: Record<string, unknown>;

  switch (name) {
    case 'get_executive_summary':
      result = {
        company: config.company.name,
        tagline: config.company.tagline,
        stage: config.company.stage,
        founded: config.company.founded ?? null,
        location: config.company.location ?? null,
        contact: config.contact,
        data_handling_policy: config.data_handling_policy,
        myterms_url: config.myterms_url ?? null,
      };
      break;

    case 'get_team':
      result = { team: config.team };
      break;

    case 'get_traction_headline':
      result = {
        summary:
          'Traction data available at Tier 1. Provision a dealroom session to access specific metrics.',
        tier_required: 1,
        contact: config.contact,
      };
      break;

    case 'get_ask':
      result = {
        instrument: config.raise.instrument,
        amount_usd: config.raise.amount_usd,
        cap_usd: config.raise.cap_usd,
        discount_pct: config.raise.discount_pct,
        closing_target: config.raise.closing_target ?? null,
        note: 'Contact the company to provision a Tier 1 dealroom session for full diligence access.',
        contact: config.contact,
      };
      break;

    case 'get_traction':
      result = {
        arr_usd: config.traction.arr_usd,
        growth_mom_pct: config.traction.growth_mom_pct,
        runway_months: config.traction.runway_months,
        note: 'Full P&L available at Tier 2 after NDA acceptance.',
      };
      break;

    case 'get_financials':
      result = {
        arr_usd: config.traction.arr_usd,
        runway_months: config.traction.runway_months,
        note: 'Full P&L statement available at Tier 2. Call nda_accept to unlock.',
      };
      break;

    case 'get_cap_table':
      result = config.cap_table_summary ?? {
        note: 'Cap table summary not configured. Contact the company for details.',
        contact: config.contact,
      };
      break;

    case 'get_deck_summary':
      result = config.deck_summary ?? {
        note: 'Deck summary not configured. Contact the company to request pitch materials.',
        contact: config.contact,
      };
      break;

    case 'get_financials_full':
      result = config.financials_full ?? {
        note: 'Full P&L requires NDA acceptance. Call nda_accept first to unlock Tier 2 data.',
        tier_required: 2,
      };
      break;

    case 'get_cap_table_opencap':
      result = config.cap_table_opencap ?? {
        note: 'OpenCap Alliance cap table requires NDA acceptance. Call nda_accept first.',
        tier_required: 2,
      };
      break;

    case 'nda_accept':
      result = {
        accepted: true,
        accepted_at: new Date().toISOString(),
        note: 'NDA accepted. In production hosted mode, this upgrades your session to Tier 2 and enables get_financials_full and get_cap_table_opencap. In local mode, configure financials_full and cap_table_opencap in dealroom.config.json.',
        data_handling_policy: config.data_handling_policy,
        myterms_url: config.myterms_url ?? null,
      };
      break;

    default:
      result = { error: 'Tool not implemented' };
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
});

// --- Entry point ---

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('ax-dealroom-mcp error:', err);
  process.exit(1);
});
