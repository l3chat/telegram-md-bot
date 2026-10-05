# Roadmap

## Completed

- [x] Markdown → Telegram Rich Message
- [x] Plain-text / entities fallback for failed simple Rich Messages
- [x] Accept Markdown as text
- [x] Accept `.md`, `.markdown`, and `.txt` files
- [x] Photos inside Rich Messages
- [x] Audio and voice messages inside Rich Messages
- [x] Video and generic file attachments
- [x] Automatic media linking
- [x] Automatic placement of unreferenced media
- [x] Draft workflow with `/media`, `/send`, `/clear`
- [x] Replace Cloudflare KV design with Durable Objects
- [x] 24-hour automatic draft expiry
- [x] English UI
- [x] Russian UI
- [x] German UI
- [x] French UI
- [x] Ukrainian UI
- [x] GitHub Actions tests

## Before wider public release

- [ ] Register localized Telegram command menus with BotFather / Bot API
- [ ] Add localized bot name / short description / description
- [ ] Add `/privacy`
- [ ] Publish a privacy notice
- [ ] Add rate limiting / abuse protection
- [ ] Add clearer platform-limit error messages
- [ ] Add production smoke test after deployment
- [ ] Review album workflow and reduce need for manual `/send`
- [ ] Add more end-to-end tests for Rich Message media
