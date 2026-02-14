(function () {
  const ROOT_ID = "irs-root";
  const STATUS_ID = "irs-status";
  const TOAST_ID = "irs-toast";
  const STORAGE_KEY = "irsQueueState";
  const REEL_PATH_RE = /^\/reel\/[^/?#]+\/?$/;
  const MAX_QUEUE_SIZE = 400;

  function normalizeReelUrl(href) {
    try {
      const url = new URL(href, location.origin);
      if (!REEL_PATH_RE.test(url.pathname)) {
        return null;
      }

      return `${url.origin}${url.pathname.replace(/\/$/, "")}/`;
    } catch {
      return null;
    }
  }

  function collectVisibleReelLinks() {
    const links = new Set();
    const anchors = document.querySelectorAll('a[href*="/reel/"]');

    anchors.forEach((anchor) => {
      const reelUrl = normalizeReelUrl(anchor.getAttribute("href"));
      if (reelUrl) {
        links.add(reelUrl);
      }
    });

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
    return {
      links: [],
      index: -1,
      createdAt: 0,
      sourceUrl: ""
    };
  }

  async function loadQueueState() {
    try {
      const payload = await chrome.storage.local.get(STORAGE_KEY);
      const saved = payload[STORAGE_KEY];
      if (!saved || !Array.isArray(saved.links)) {
        return emptyQueueState();
      }
      return saved;
    } catch {
      return emptyQueueState();
    }
  }

  async function saveQueueState(queueState) {
    await chrome.storage.local.set({
      [STORAGE_KEY]: queueState
    });
  }

  function queuePositionText(queueState) {
    if (!queueState.links.length) {
      return "0/0";
    }
    const position = Math.max(1, queueState.index + 1);
    return `${position}/${queueState.links.length}`;
  }

  function showToast(message) {
    const root = document.getElementById(ROOT_ID);
    if (!root) {
      return;
    }

    let toast = document.getElementById(TOAST_ID);
    if (!toast) {
      toast = document.createElement("div");
      toast.id = TOAST_ID;
      root.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("irs-toast-visible");
    window.setTimeout(() => {
      toast.classList.remove("irs-toast-visible");
    }, 2000);
  }

  async function renderStatus() {
    const statusNode = document.getElementById(STATUS_ID);
    if (!statusNode) {
      return;
    }

    const queueState = await loadQueueState();
    const visible = collectVisibleReelLinks().length;
    const position = queuePositionText(queueState);
    statusNode.textContent = `Queue ${position} | Visible: ${visible}`;
  }

  async function createQueueFromVisible() {
    const visible = collectVisibleReelLinks();

    if (!visible.length) {
      showToast("No visible Reels found. Open a reels grid and scroll.");
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
    showToast(`Queue created: ${shuffledLinks.length} reels`);

    location.href = shuffledLinks[0];
  }

  async function openNextInQueue() {
    const queueState = await loadQueueState();
    if (!queueState.links.length) {
      showToast("Queue is empty. Click Shuffle Visible first.");
      return;
    }

    const nextIndex = (queueState.index + 1) % queueState.links.length;
    queueState.index = nextIndex;
    await saveQueueState(queueState);
    await renderStatus();
    location.href = queueState.links[nextIndex];
  }

  async function openRandomFromQueue() {
    const queueState = await loadQueueState();
    if (!queueState.links.length) {
      showToast("Queue is empty. Click Shuffle Visible first.");
      return;
    }

    const randomIndex = Math.floor(Math.random() * queueState.links.length);
    queueState.index = randomIndex;
    await saveQueueState(queueState);
    await renderStatus();
    location.href = queueState.links[randomIndex];
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
    if (document.getElementById(ROOT_ID)) {
      return;
    }

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

  installPanel();
  renderStatus();

  window.setInterval(() => {
    renderStatus();
  }, 2500);
})();
