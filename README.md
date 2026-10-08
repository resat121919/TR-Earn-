# TR Earn Pro

Professional starter for a Telegram Mini App with:
- Telegram WebApp initData server-side verification
- User database
- TR Points balance
- Daily check-in
- Tasks
- Referral links
- Withdrawal requests
- Server-side reward accounting

## Important
Do not put BOT_TOKEN in frontend code or GitHub Pages.
For production, use HTTPS and a managed database/backups. Review local laws and your own reward/withdrawal terms before launching.

## Local setup
1. Install Node.js 20+.
2. Copy `.env.example` to `.env`.
3. Add BOT_TOKEN and BOT_USERNAME.
4. `npm install`
5. `npm start`
6. Use an HTTPS deployment for Telegram.

## Telegram
Set the Mini App URL to your deployed backend URL, not the static GitHub Pages URL, because the backend must receive `/api` requests.

The existing GitHub Pages frontend can still be used as a static mockup, but the secure version should point to the backend host.
