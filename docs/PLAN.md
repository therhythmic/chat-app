# Chat App: plan (v0.1, Nov 19 2026)

## Goal
One simple, clean, beautiful inbox where a team talks, pulling in Slack, Messages (iMessage + SMS), Messenger and Telegram, plus texts forwarded or tagged to a dedicated number. Everything is organized by project. AI suggests the project ("Looks like GearHead. Correct?") and the person confirms or corrects with one tap.

## What each platform actually allows (checked Nov 19 2026)

| Source | Official route | What it can see | Verdict |
|---|---|---|---|
| Slack | Events API + user token with `channels:history`, `groups:history`, `im:history`, `mpim:history` | Real-time channel and DM messages the signed-in user is in. A bot token only sees chats the bot is in. | Fully supported |
| Telegram | User API (MTProto via TDLib) with the person's own login; api_id from my.telegram.org | Full chat list (Main, Archive, folders). Must follow Telegram's API terms. Secret chats are device-only. | Supported |
| Dedicated number (SMS) | Twilio (or similar) number; people forward or text it | Only what gets sent to that number. US 10-digit numbers need A2P 10DLC registration to *send*; toll-free is a separate path. | Supported, easy, costs a small monthly fee |
| Messages (iMessage + SMS on iPhone) | **None.** Apple has no public API to read a person's chats. Messages for Business is customer-initiated business support only, needs Apple approval, no group chats. | Unofficial options: a Mac relay (BlueBubbles-style, needs a Mac always on and signed in) or paid vendors that don't explain how they reach Apple. | Not officially possible |
| Messenger | Messenger Platform works **only for Facebook Pages**, not personal accounts. 24-hour reply window. | Page inbox only. Personal chats are not reachable. | Only for a Page |

Sources: docs.slack.dev (message event, im.history, conversations.history); core.telegram.org/api and /tdlib/getting-started; register.apple.com Messages for Business FAQ; developers.facebook.com Messenger Platform FAQ and Send a Message; twilio.com A2P 10DLC docs.

## Proposed MVP order
1. Design (Figma, 390 phone + 1440 desktop) and John's review
2. Web app shell as a PWA (installable on iPhone home screen), with the unified inbox, project views and AI suggestions running on sample data
3. Chat App number in group texts (source = Messages), with AI tagging
4. Slack
5. Telegram
6. Messages and Messenger: depends on John's decision below

## Decided (Nov 19 2026): Messages via the app's own number
John adds teammates (e.g. Anjuan) and the Chat App number (saved as a contact) to a group text. Everything in that thread comes into the app with source = Messages; AI reads and tags each message to a project, asking when unsure.
Verified limits: a non-Apple number can't join an existing iMessage group, so start a new group, and it becomes an MMS (green-bubble) group. Twilio group texting: US/Canada +1 long codes only (no toll-free), max 10 participants. Telnyx: max 8 recipients + sender, inbound replies carry a `cc` list of participants. Not yet confirmed by docs: that a group started on a phone arrives with the full participant list. Test this first once a number exists.

## Views (from John)
- Threads: by team member. Every app's messages with a person in one thread.
- Projects: everything tagged to a project, any app.
- Sources: by app and team member.
Use official app logos for sources.

## Stack (proposed, not final)
Next.js PWA on Vercel, Supabase (Postgres, auth, realtime), Claude for project suggestions, Twilio for the number.
