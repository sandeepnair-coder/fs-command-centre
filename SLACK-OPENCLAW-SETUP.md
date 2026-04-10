# Slack -> OpenClaw Note Analysis Pipeline

## Overview

This pipeline silently monitors selected Slack channels for Granola-style meeting notes. When detected, notes are analyzed by OpenClaw for client relevance and upsell opportunities. Results are stored in the `opportunity_insights` table and viewable at `/settings/integrations/slack-insights`.

**Key principle:** OpenClaw does NOT post anything in Slack. It silently reads, analyzes, and saves insights internally.

---

## Architecture

```
Slack Channel (Granola posts meeting notes)
    |
    v
POST /api/slack/events (signature-verified)
    |
    v
Filter: bot messages, edits, wrong channels
    |
    v
Detect: Granola note heuristics (keywords, structure, known bot IDs)
    |
    v
Persist: opportunity_insights (status: "analyzing")
    |
    v
OpenClaw: analyzeSlackNote() via WebSocket gateway
    |
    v
Update: opportunity_insights (status: "analyzed", summary, scores)
    |
    v
View: /settings/integrations/slack-insights
```

---

## Files Created/Modified

| File | Purpose |
|------|---------|
| `app/api/slack/events/route.ts` | Slack Events API endpoint with signature verification |
| `lib/slack/detect-granola.ts` | Heuristic detector for Granola-style meeting notes |
| `lib/openclaw/analyze-slack-note.ts` | OpenClaw adapter for note analysis |
| `lib/openclaw/client.ts` | Added generic `openclawIntelligence()` function |
| `app/(app)/settings/integrations/slack-insights/page.tsx` | Admin UI for viewing insights |
| `app/(app)/settings/integrations/slack-insights/actions.ts` | Server actions for fetching insights |
| `proxy.ts` | Added `/api/slack(.*)` to public routes |

---

## Database

### Table: `opportunity_insights`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| source_type | text | Always "slack" for now |
| source_message_id | text | `slack:{channel_id}:{ts}` for deduplication |
| channel_id | text | Slack channel ID |
| channel_name | text | Resolved channel name (best-effort) |
| note_text | text | Full message text |
| summary | text | AI-generated summary |
| is_client_related | boolean | Whether note is about a client |
| upsell_opportunity | boolean | Whether there's an AI media upsell opportunity |
| recommended_service | text | Specific service recommendation |
| confidence_score | numeric | 0-1 confidence score |
| rationale | text | AI reasoning |
| raw_analysis | jsonb | Full analysis JSON |
| status | text | new / analyzing / analyzed / error |
| created_at | timestamptz | When the note was captured |

---

## Environment Variables

Add these to Vercel (or `.env.local`):

```env
# Required for signature verification
SLACK_SIGNING_SECRET=your_slack_signing_secret

# Required for channel name resolution
SLACK_BOT_TOKEN=xoxb-your-bot-token

# Comma-separated list of channel IDs to monitor (empty = all channels where bot is added)
SLACK_ALLOWED_CHANNEL_IDS=C01ABC123,C02DEF456

# Already in use by the existing OpenClaw integration
OPENCLAW_API_URL=wss://openclaw.tail030cbd.ts.net
OPENCLAW_API_TOKEN=your_shared_token
```

---

## Slack App Setup

### 1. Create the Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App** > **From scratch**
3. Name: `Fynd Studio Bot` (or similar)
4. Workspace: Select your workspace

### 2. Configure Bot Scopes

Go to **OAuth & Permissions** > **Bot Token Scopes** and add:

| Scope | Purpose |
|-------|---------|
| `channels:history` | Read messages in public channels |
| `channels:read` | Get channel info (names) |
| `chat:write` | Future: respond in channels (not used yet) |
| `app_mentions:read` | Future: respond to @mentions |

### 3. Enable Event Subscriptions

Go to **Event Subscriptions**:

1. Toggle **Enable Events** to ON
2. **Request URL:** `https://studio.fynd.design/api/slack/events`
   - Slack will send a challenge request; the endpoint handles this automatically
3. Under **Subscribe to bot events**, add:
   - `message.channels` (required)
   - `app_mention` (optional, for future use)
4. Click **Save Changes**

### 4. Install the App

1. Go to **Install App**
2. Click **Install to Workspace**
3. Authorize the requested permissions
4. Copy the **Bot User OAuth Token** (`xoxb-...`) -> set as `SLACK_BOT_TOKEN`

### 5. Get the Signing Secret

1. Go to **Basic Information**
2. Under **App Credentials**, copy **Signing Secret** -> set as `SLACK_SIGNING_SECRET`

### 6. Add Bot to Channels

In Slack:
1. Open the channel you want to monitor
2. Type `/invite @Fynd Studio Bot` (or whatever you named it)
3. Copy the channel ID (right-click channel name > Copy link > extract the ID, e.g., `C01ABC123`)
4. Add the channel ID to `SLACK_ALLOWED_CHANNEL_IDS`

---

## Testing

### Test with a sample Granola-like note

Post this in a monitored Slack channel:

```
Meeting Notes - Client Review: Delloite Q2 Campaign

Attendees: Sandeep, Priya (Delloite), Rahul (Marketing)

Discussion:
- Reviewed Q2 social media campaign performance
- Client impressed with Instagram carousel reach (+40% vs Q1)
- Delloite wants to explore AI-generated video ads for Q3
- Budget discussion: client has 15L allocated for experimental formats

Next Steps:
1. Sandeep to share AI video demo reel by Friday
2. Priya to confirm Q3 timeline internally
3. Follow-up meeting scheduled for next Tuesday

Action Items:
- Create 3 AI video concept drafts for Delloite review
- Update project timeline in Command Centre
```

### Expected behavior:

1. The Slack events endpoint receives the message
2. Granola detector flags it (keywords: "meeting notes", "attendees", "discussion", "next steps", "action items")
3. A row appears in `opportunity_insights` with status "analyzing"
4. OpenClaw analyzes and returns: `is_client_related: true`, `upsell_opportunity: true`, `recommended_service: "AI Video Ads"`
5. Row updates to status "analyzed"
6. Visible at `/settings/integrations/slack-insights`

### Test signature verification locally

```bash
# The endpoint rejects unsigned requests:
curl -X POST https://studio.fynd.design/api/slack/events \
  -H "Content-Type: application/json" \
  -d '{"type":"url_verification","challenge":"test123"}'
# -> 401 Invalid signature

# URL verification works when properly signed by Slack
```

### Test the admin page

Navigate to: `https://studio.fynd.design/settings/integrations/slack-insights`

---

## Granola Note Detection

The detector (`lib/slack/detect-granola.ts`) uses a multi-signal approach:

1. **Known bot IDs**: Instant high-confidence match (add Granola's bot user ID to `KNOWN_GRANOLA_BOT_IDS`)
2. **Keyword matching**: Looks for meeting note keywords (meeting notes, attendees, next steps, etc.)
   - 3+ keywords = high confidence
   - 2+ keywords = medium confidence
3. **Structural patterns**: Numbered lists, bullet lists, headers combined with at least 1 keyword
4. **Length filter**: Messages under 150 characters are skipped

To tune: edit thresholds and keyword list in `lib/slack/detect-granola.ts`.

---

## Future Enhancements

- **Master Dashboard**: Aggregate opportunity_insights into a dedicated dashboard (not just settings page)
- **Auto-create tasks**: When high-confidence opportunities are detected, auto-create follow-up tasks
- **Client linking**: Match detected client names against the clients table
- **Thread context**: Pull full thread context for richer analysis
- **app_mention support**: Let team members @mention the bot to manually trigger analysis
- **Slack DM responses**: Privately notify the relevant manager about detected opportunities
