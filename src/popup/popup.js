(function () {
  const STORAGE_KEY = "irsQueueState";

  const queuePositionEl = document.getElementById("queue-position");
  const sourceInfoEl = document.getElementById("source-info");
  const controlsEl = document.getElementById("controls");
  const errorEl = document.getElementById("error-msg");

  function setDisabled(disabled) {
    controlsEl.querySelectorAll(".btn").forEach((btn) => {
      btn.disabled = disabled;
    });
  }

  function renderState(queueState, visibleCount) {
    const total = queueState.links.length;
    const position = total ? Math.max(1, queueState.index + 1) : 0;
    queuePositionEl.textContent = `Queue ${position}/${total} | Visible: ${visibleCount}`;

    if (queueState.sourceUrl) {
      try {
        const url = new URL(queueState.sourceUrl);
        sourceInfoEl.textContent = `Source: ${url.pathname}`;
        sourceInfoEl.classList.remove("hidden");
      } catch {
        sourceInfoEl.classList.add("hidden");
      }
    } else {
      sourceInfoEl.classList.add("hidden");
    }
  }

  async function getInstagramTab() {
    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });
    const tab = tabs[0];
    if (tab && tab.url && tab.url.includes("instagram.com")) {
      return tab;
    }
    return null;
  }

  async function sendToTab(tab, message) {
    return chrome.tabs.sendMessage(tab.id, message);
  }

  async function init() {
    const tab = await getInstagramTab();

    if (!tab) {
      controlsEl.classList.add("hidden");
      errorEl.classList.remove("hidden");

      const stored = await chrome.storage.local.get(STORAGE_KEY);
      const state = stored[STORAGE_KEY] || { links: [], index: -1, sourceUrl: "" };
      renderState(state, 0);
      return;
    }

    errorEl.classList.add("hidden");
    controlsEl.classList.remove("hidden");

    try {
      const status = await sendToTab(tab, { type: "IRS_STATUS" });
      if (status) {
        renderState(status.queue, status.visibleCount);
      }
    } catch {
      const stored = await chrome.storage.local.get(STORAGE_KEY);
      const state = stored[STORAGE_KEY] || { links: [], index: -1, sourceUrl: "" };
      renderState(state, 0);
    }

    const NAV_ACTIONS = new Set(["IRS_SHUFFLE", "IRS_FETCH_ALL", "IRS_NEXT", "IRS_RANDOM"]);

    controlsEl.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn || btn.disabled) return;

      const action = btn.dataset.action;
      setDisabled(true);

      try {
        await sendToTab(tab, { type: action });

        // Navigation actions change the page — close popup
        if (NAV_ACTIONS.has(action)) {
          window.close();
          return;
        }

        // Non-nav actions (Clear): refresh status
        await new Promise((r) => setTimeout(r, 200));
        try {
          const status = await sendToTab(tab, { type: "IRS_STATUS" });
          if (status) renderState(status.queue, status.visibleCount);
        } catch { /* content script reloading */ }
      } catch {
        // Content script might not be ready
      } finally {
        setDisabled(false);
      }
    });
  }

  init();
})();
