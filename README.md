# Reel Shuffler

Instagram doesn't have a "shuffle reels" button. This extension fixes that: it collects visible Reel links from any page, shuffles them with Fisher-Yates, and lets you watch them in random order.

## What it does

- Collects visible Reel links (`/reel/...`) from the current page
- Shuffles them randomly
- Opens Reels in randomized order using **Next** or **Random**
- Saves the queue in extension storage (persists across tabs)
- Popup UI to control the queue without the floating panel

## Install

### Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on...**
3. Select the `manifest.json` file inside this folder
4. Open Instagram and use the floating panel or the extension popup

### Chrome / Edge

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder
5. Open Instagram and use the floating panel or the extension popup

## Usage

1. Open a profile's Reels tab or any page with visible reel tiles
2. Scroll down to load more reels into view
3. Click **Shuffle Visible** (floating panel or popup)
4. Use **Next** to go through the shuffled queue, or **Random** to jump anywhere
5. **Clear Queue** to reset

## Limitations

- Only shuffles Reel links already loaded in your browser (scroll to load more)
- Works on Instagram Web (`https://www.instagram.com`), not the mobile app
- Cannot override Instagram's backend ranking for the home Reels feed
