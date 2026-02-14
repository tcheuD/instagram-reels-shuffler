(function () {
  const ROOT_ID = "irs-root";
  const STATUS_ID = "irs-status";
  const TOAST_ID = "irs-toast";
  const STORAGE_KEY = "irsQueueState";
  const MAX_QUEUE_SIZE = 400;
  const IG_ORIGIN = "https://www.instagram.com";

  // Match /reel/{code}/ with optional username prefix /{user}/reel/{code}/
  const REEL_PATH_RE = /^(\/[^/?#]+)?\/reel\/([^/?#]+)\/?$/;
  // Match /p/{code}/
  const POST_PATH_RE = /^\/p\/([^/?#]+)\/?$/;
  // Current page is a reels tab
  const REELS_PAGE_RE = /\/reels\/?$/;

  function extractReelUrl(href) {
    try {
      const url = new URL(href, location.origin);
      if (url.origin !== IG_ORIGIN) return null;

      const reelMatch = url.pathname.match(REEL_PATH_RE);
      if (reelMatch) {
        const shortcode = reelMatch[2];
        return `${IG_ORIGIN}/reel/${shortcode}/`;
      }

      return null;
    } catch {
      return null;
    }
  }

  function extractPostUrl(href) {
    try {
      const url = new URL(href, location.origin);
      if (url.origin !== IG_ORIGIN) return null;

      const postMatch = url.pathname.match(POST_PATH_RE);
      if (postMatch) {
        const shortcode = postMatch[1];
        return `${IG_ORIGIN}/p/${shortcode}/`;
      }

      return null;
    } catch {
      return null;
    }
  }

  function isValidNavigationUrl(url) {
    try {
      const parsed = new URL(url);
      return parsed.origin === IG_ORIGIN &&
        (REEL_PATH_RE.test(parsed.pathname) || POST_PATH_RE.test(parsed.pathname));
    } catch {
      return false;
    }
  }

  function collectVisibleReelLinks() {
    const links = new Set();

    // Always collect explicit /reel/ links
    document.querySelectorAll('a[href*="/reel/"]').forEach((a) => {
      const url = extractReelUrl(a.getAttribute("href"));
      if (url) links.add(url);
    });

    // On reels pages, also collect /p/ links (they're all reels there)
    const onReelsPage = REELS_PAGE_RE.test(location.pathname);
    if (onReelsPage) {
      document.querySelectorAll('a[href*="/p/"]').forEach((a) => {
        const url = extractPostUrl(a.getAttribute("href"));
        if (url) links.add(url);
      });
    }

    // Also look for /p/ links that sit next to a video/reel indicator
    if (!onReelsPage) {
      document.querySelectorAll('a[href*="/p/"]').forEach((a) => {
        // Check if this grid item has a video overlay (SVG play icon or video element)
        const hasVideoIndicator =
          a.querySelector("svg") !== null ||
          a.closest("div")?.querySelector('svg[aria-label]') !== null;
        if (hasVideoIndicator) {
          const url = extractPostUrl(a.getAttribute("href"));
          if (url) links.add(url);
        }
      });
    }

    return Array.from(links).slice(0, MAX_QUEUE_SIZE);
  }

  function shuffle(items) {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function emptyQueueState() {
    return { links: [], index: -1, createdAt: 0, sourceUrl: "" };
  }

  async function loadQueueState() {
    try {
      const payload = await chrome.storage.local.get(STORAGE_KEY);
      const saved = payload[STORAGE_KEY];
      if (!saved || !Array.isArray(saved.links)) return emptyQueueState();

      // Validate every stored URL points to Instagram
      const validLinks = saved.links.filter((link) =>
        typeof link === "string" && isValidNavigationUrl(link)
      );

      const index =
        typeof saved.index === "number" && saved.index >= 0 && saved.index < validLinks.length
          ? saved.index
          : 0;

      return {
        links: validLinks,
        index,
        createdAt: typeof saved.createdAt === "number" ? saved.createdAt : 0,
        sourceUrl: typeof saved.sourceUrl === "string" ? saved.sourceUrl : ""
      };
    } catch {
      return emptyQueueState();
    }
  }

  async function saveQueueState(queueState) {
    await chrome.storage.local.set({ [STORAGE_KEY]: queueState });
  }

  function queuePositionText(queueState) {
    if (!queueState.links.length) return "0/0";
    return `${Math.max(1, queueState.index + 1)}/${queueState.links.length}`;
  }

  function showToast(message) {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;

    let toast = document.getElementById(TOAST_ID);
    if (!toast) {
      toast = document.createElement("div");
      toast.id = TOAST_ID;
      root.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("irs-toast-visible");
    window.setTimeout(() => toast.classList.remove("irs-toast-visible"), 2000);
  }

  function navigateSafe(url) {
    if (!isValidNavigationUrl(url)) {
      showToast("Invalid URL — clearing queue.");
      saveQueueState(emptyQueueState());
      return;
    }
    location.href = url;
  }

  async function renderStatus() {
    const statusNode = document.getElementById(STATUS_ID);
    if (!statusNode) return;

    const queueState = await loadQueueState();
    const visible = collectVisibleReelLinks().length;
    statusNode.textContent = `Queue ${queuePositionText(queueState)} | Visible: ${visible}`;
  }

  async function createQueueFromVisible() {
    const visible = collectVisibleReelLinks();
    if (!visible.length) {
      showToast("No reels found. Open a reels tab and scroll.");
      return;
    }

    const shuffledLinks = shuffle(visible);
    const queueState = {
      links: shuffledLinks,
      index: 0,
      createdAt: Date.now(),
      sourceUrl: location.href
    };

    await saveQueueState(queueState);
    await renderStatus();
    showToast(`Shuffled ${shuffledLinks.length} reels`);
    navigateSafe(shuffledLinks[0]);
  }

  async function openNextInQueue() {
    const queueState = await loadQueueState();
    if (!queueState.links.length) {
      showToast("Queue empty — shuffle first.");
      return;
    }

    const nextIndex = (queueState.index + 1) % queueState.links.length;
    queueState.index = nextIndex;
    await saveQueueState(queueState);
    navigateSafe(queueState.links[nextIndex]);
  }

  async function openRandomFromQueue() {
    const queueState = await loadQueueState();
    if (!queueState.links.length) {
      showToast("Queue empty — shuffle first.");
      return;
    }

    const randomIndex = Math.floor(Math.random() * queueState.links.length);
    queueState.index = randomIndex;
    await saveQueueState(queueState);
    navigateSafe(queueState.links[randomIndex]);
  }

  async function clearQueue() {
    await saveQueueState(emptyQueueState());
    await renderStatus();
    showToast("Queue cleared");
  }

  function createButton(label, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "irs-button";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  }

  function installPanel() {
    if (document.getElementById(ROOT_ID)) return;

    const root = document.createElement("div");
    root.id = ROOT_ID;

    const title = document.createElement("h2");
    title.className = "irs-title";
    title.textContent = "Reel Shuffler";

    const status = document.createElement("p");
    status.id = STATUS_ID;
    status.className = "irs-status";
    status.textContent = "Queue 0/0 | Visible: 0";

    const controls = document.createElement("div");
    controls.className = "irs-controls";
    controls.appendChild(createButton("Shuffle Visible", createQueueFromVisible));
    controls.appendChild(createButton("Next", openNextInQueue));
    controls.appendChild(createButton("Random", openRandomFromQueue));
    controls.appendChild(createButton("Clear", clearQueue));

    root.appendChild(title);
    root.appendChild(status);
    root.appendChild(controls);
    document.body.appendChild(root);
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id) return false;

    switch (message.type) {
      case "IRS_STATUS": {
        loadQueueState().then((queue) => {
          sendResponse({ queue, visibleCount: collectVisibleReelLinks().length });
        });
        return true;
      }
      case "IRS_SHUFFLE":
        createQueueFromVisible();
        break;
      case "IRS_NEXT":
        openNextInQueue();
        break;
      case "IRS_RANDOM":
        openRandomFromQueue();
        break;
      case "IRS_CLEAR":
        clearQueue();
        break;
    }
  });

  installPanel();
  renderStatus();
  window.setInterval(renderStatus, 2500);
})();
