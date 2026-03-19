# RetroAI

A retro-themed AI image and video generation platform built with Next.js.

## Features

- **AI Image Generation** — Generate retro-styled images using Google Gemini with customizable prompts
- **AI Video Generation** — Create retro-themed videos using Google Veo
- **Reference Images** — Select from hardcoded reference images or admin-uploaded preset photos to guide generation style
- **Preset Prompts** — 10 built-in scene presets (Film Editor, Truck Driver, Pan Am 747, etc.) with pre-written prompts
- **Credit System** — Users purchase credits via Stripe to generate content

## Admin Panel

Superadmins have access to `/admin` with the following capabilities:

### Custom Prompts

Admins can set custom prompts that are appended to generations at three levels:

1. **Preset Custom Prompts** — Each of the 10 hardcoded presets can have a custom prompt appended when a user selects that preset
2. **Preset Photo Custom Prompts** — Admin-uploaded photos (stored in S3) can each have a custom prompt that is appended when a user selects that photo as a reference image
3. **Reference Image Custom Prompts** — Each of the hardcoded reference images can have a custom prompt appended when selected

All custom prompts are stored in the `settings` table using the `preset_custom_prompt:` key prefix. The full assembled prompt (including any custom prompts) is recorded in the `base_prompt` field of each generation record, giving admins full visibility into what prompt was sent to the AI.

### Other Admin Features

- **Default Prompts** — Configure the base system prompts for image and video generation
- **Preset Photos** — Upload, manage, and delete reference photos stored in S3
- **Generations Gallery** — View all generations across all users with full prompt context
- **User Management** — View users and their credit balances
- **Credit Purchases** — Track all Stripe credit purchases
- **Audit Log** — Full audit trail of admin actions

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Tech Stack

- **Framework**: Next.js (App Router)
- **Auth**: Clerk
- **Database**: Supabase (PostgreSQL)
- **Storage**: AWS S3
- **AI**: Google Gemini (images), Google Veo (video)
- **Payments**: Stripe
