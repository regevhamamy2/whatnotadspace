# Whatnot Sponsor Overlay V2

Cloud-ready V2 for remote show-by-show sponsor management.

## Included
- 10 sponsor slots per show
- 20-second default rotation (editable per show)
- $250 default slot price
- $2,000 default exclusive-show takeover
- 12K–15K reach messaging
- automatic house ad when fewer than 10 paid/active sponsors are loaded
- remote dashboard protected by a password
- OBS browser-source overlay that updates from the cloud every 5 seconds
- Supabase database schema

## Fastest deployment path

### 1. Create a Supabase project
In Supabase, open SQL Editor and run `supabase-schema.sql`.

Then copy:
- Project URL
- service_role key (keep this secret)

### 2. Deploy to Vercel
Create a new Vercel project from this folder/repository.
Set these environment variables:

SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ADMIN_PASSWORD
CHANNEL_SLUG=discount-kicks

Deploy.

### 3. Open the dashboard
Go to:
`https://YOUR-DOMAIN/dashboard`

Log in with ADMIN_PASSWORD. Create each show, then fill any of the 10 sponsor slots.

### 4. Add the permanent OBS browser source
In OBS add Browser Source:
`https://YOUR-DOMAIN/overlay?channel=discount-kicks`

Set browser size to 1080 x 1920. The HTML itself is transparent except for the sponsor bar, so position/crop it to match the Whatnot layout.

You do NOT change the OBS URL for each show. The overlay finds the show whose start/end time includes the current time.

## Current V2 behavior
- Active paid/active sponsor slots rotate.
- If fewer than 10 sponsors are active, a house ad enters the rotation showing YOUR BRAND HERE, 12K–15K SHOW REACH, next-show price, and remaining slot count.
- If Exclusive Takeover is enabled, the exclusive sponsor stays on continuously.
- Dashboard changes are reflected by the overlay within about 5 seconds.

## Before commercial launch
Recommended next hardening steps:
1. Replace shared-password login with real user accounts.
2. Add direct logo upload (Supabase Storage) instead of logo URL.
3. Add advertiser/contact/payment notes.
4. Add impression logging and sponsor reports.
5. Add show duplication and recurring schedules.
6. Add a mobile-first dashboard view.
7. Add fallback/offline overlay behavior in OBS.
