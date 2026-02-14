# Instagram Reel Shuffler

Instagram does not currently provide a native "shuffle reels" button. This extension is a practical workaround: it shuffles the Reel links that are currently visible on your page and lets you jump through that queue in random order.

## What it does

- Collects visible Reel links (`/reel/...`) from the current page.
- Shuffles them with Fisher-Yates.
- Opens Reels in randomized order using `Next` or `Random`.
- Saves the queue in extension storage.

## Limitations

- It cannot override Instagram's backend ranking for your home Reels feed.
- It only shuffles Reel links loaded in your current browser view.
- It works on Instagram Web (`https://www.instagram.com`), not the mobile app.

## Install (Chrome/Edge)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder: `instagram-reels-shuffler`.
5. Open Instagram web and use the floating panel at bottom-right.

## Usage

1. Open a profile Reels tab or any page with visible reel tiles.
2. Scroll a bit so more reel links are loaded.
3. Click `Shuffle Visible`.
4. Use `Next` or `Random` to watch in non-chronological order.

## Create a new GitHub repo

```bash
cd instagram-reels-shuffler
git init
git add .
git commit -m "feat: initial instagram reel shuffler extension"
gh repo create instagram-reels-shuffler --public --source=. --remote=origin --push
```
