import { useState, useRef, useEffect } from "react";

// ─── DATA ────────────────────────────────────────────────────────────────────
const WORKSPACES = [
  { id: "work",     emoji: "💼", label: "Work" },
  { id: "personal", emoji: "🏠", label: "Personal" },
  { id: "research", emoji: "🔬", label: "Research" },
];

const INITIAL_TABS = {
  work: [
    { id: "t1", title: "GitHub – Pull Requests",   domain: "github.com",    favicon: "🐙", url: "https://github.com",         pinned: true  },
    { id: "t2", title: "Notion – Sprint Board",    domain: "notion.so",     favicon: "📝", url: "https://notion.so",          pinned: false },
    { id: "t3", title: "Linear – Issues",          domain: "linear.app",    favicon: "📐", url: "https://linear.app",         pinned: false },
    { id: "t4", title: "Figma – Design System",    domain: "figma.com",     favicon: "🎨", url: "https://figma.com",          pinned: false },
    { id: "t5", title: "Slack – #engineering",     domain: "slack.com",     favicon: "💬", url: "https://slack.com",          pinned: false },
  ],
  personal: [
    { id: "t6", title: "Reddit – r/programming",  domain: "reddit.com",    favicon: "👽", url: "https://reddit.com",         pinned: false },
    { id: "t7", title: "YouTube",                  domain: "youtube.com",   favicon: "▶️", url: "https://youtube.com",        pinned: false },
    { id: "t8", title: "Spotify Web Player",       domain: "spotify.com",   favicon: "🎵", url: "https://spotify.com",        pinned: false },
  ],
  research: [
    { id: "t9",  title: "arXiv – AI/ML Papers",   domain: "arxiv.org",     favicon: "📄", url: "https://arxiv.org",          pinned: true  },
    { id: "t10", title: "Wikipedia – Neural Net",  domain: "wikipedia.org", favicon: "📚", url: "https://wikipedia.org",      pinned: false },
    { id: "t11", title: "Hacker News",             domain: "hn.algolia.com",favicon: "🧡", url: "https://news.ycombinator.com", pinned: false },
  ],
};

// ─── TINY HELPER HOOKS ───────────────────────────────────────────────────────
function useDrag(onSwipeUp, onSwipeDown, onSwipeLeft, onSwipeRight) {
  const startY = useRef(null);
  const startX = useRef(null);
  return {
    onTouchStart: (e) => {
      startY.current = e.touches[0].clientY;
      startX.current = e.touches[0].clientX;
    },
    onMouseDown: (e) => {
      startY.current = e.clientY;
      startX.current = e.clientX;
    },
    onTouchEnd: (e) => {
      const dy = startY.current - e.changedTouches[0].clientY;
      const dx = startX.current - e.changedTouches[0].clientX;
      if (Math.abs(dy) > Math.abs(dx)) {
        if (dy > 40) onSwipeUp?.();
        else if (dy < -40) onSwipeDown?.();
      } else {
        if (dx > 40) onSwipeLeft?.();
        else if (dx < -60) onSwipeRight?.();
      }
    },
    onMouseUp: (e) => {
      const dy = startY.current - e.clientY;
      const dx = startX.current - e.clientX;
      if (Math.abs(dy) > Math.abs(dx)) {
        if (dy > 40) onSwipeUp?.();
        else if (dy < -40) onSwipeDown?.();
      } else {
        if (dx > 40) onSwipeLeft?.();
        else if (dx < -60) onSwipeRight?.();
      }
    },
  };
}

// ─── STYLES (CSS-in-JS) ──────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }

  :root {
    --bg:        #0d0f14;
    --surface:   #141720;
    --surface2:  #1c2030;
    --border:    rgba(255,255,255,0.07);
    --accent:    #6c9fff;
    --accent2:   #a78bfa;
    --text:      #e8eaf2;
    --text2:     #7a809a;
    --text3:     #454b66;
    --danger:    #ff6b6b;
    --radius:    16px;
    --font:      'DM Sans', sans-serif;
    --mono:      'DM Mono', monospace;
  }

  body { background: var(--bg); font-family: var(--font); color: var(--text); }

  .phone-frame {
    width: 390px; height: 780px; position: relative; overflow: hidden;
    background: var(--bg);
    border-radius: 48px;
    box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 40px 120px rgba(0,0,0,0.8);
    user-select: none;
  }

  /* ── BROWSER CONTENT ─────────────────────────────── */
  .browser-content {
    position: absolute; inset: 0; bottom: 80px;
    background: #fff; overflow: hidden;
    transition: transform 0.35s cubic-bezier(.32,.72,0,1);
  }
  .browser-content.dimmed { filter: brightness(0.4); transform: scale(0.97); }
  .browser-content iframe { width: 100%; height: 100%; border: none; pointer-events: none; }
  .browser-placeholder {
    width: 100%; height: 100%; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 12px;
    background: linear-gradient(160deg, #f0f4ff 0%, #f8f0ff 100%);
    color: #555; font-family: var(--font);
  }
  .browser-placeholder .site-favicon { font-size: 52px; }
  .browser-placeholder .site-title { font-size: 18px; font-weight: 600; color: #222; }
  .browser-placeholder .site-url { font-size: 13px; color: #888; font-family: var(--mono); }

  /* ── URL BAR ─────────────────────────────────────── */
  .url-bar {
    position: absolute; bottom: 0; left: 0; right: 0; height: 80px;
    background: var(--surface);
    border-top: 1px solid var(--border);
    display: flex; align-items: center; gap: 8px; padding: 0 12px 8px;
    z-index: 10;
  }
  .url-pill {
    flex: 1; height: 44px;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 14px;
    display: flex; align-items: center; gap: 8px;
    padding: 0 14px; cursor: pointer;
    transition: background 0.15s;
  }
  .url-pill:hover { background: #252a3a; }
  .url-pill .domain { font-size: 14px; font-weight: 500; color: var(--text); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .url-pill .lock { font-size: 11px; color: var(--accent); }
  .url-pill .workspace-badge {
    font-size: 14px; background: var(--surface); border-radius: 8px;
    width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
    cursor: pointer;
  }
  .url-bar-btn {
    width: 44px; height: 44px; border-radius: 14px;
    background: var(--surface2); border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; font-size: 18px; flex-shrink: 0;
    transition: background 0.15s, transform 0.1s;
  }
  .url-bar-btn:hover { background: #252a3a; }
  .url-bar-btn:active { transform: scale(0.93); }
  .tab-count-badge {
    position: absolute; top: -4px; right: -4px;
    background: var(--accent); color: #000; font-size: 9px; font-weight: 700;
    border-radius: 6px; min-width: 16px; height: 16px;
    display: flex; align-items: center; justify-content: center;
    padding: 0 3px;
  }

  /* ── TAB TRAY ────────────────────────────────────── */
  .tab-tray {
    position: absolute; left: 0; right: 0;
    bottom: 80px;
    height: 220px;
    background: var(--surface);
    border-top: 1px solid var(--border);
    border-radius: 20px 20px 0 0;
    transform: translateY(100%);
    transition: transform 0.38s cubic-bezier(.32,.72,0,1);
    z-index: 20;
    overflow: hidden;
    display: flex; flex-direction: column;
  }
  .tab-tray.open { transform: translateY(0); }

  .tray-handle {
    width: 36px; height: 4px; background: var(--border);
    border-radius: 2px; margin: 10px auto 6px;
    flex-shrink: 0;
  }

  /* workspace selector row */
  .workspace-row {
    display: flex; gap: 6px; padding: 0 14px 8px; flex-shrink: 0;
  }
  .ws-chip {
    height: 30px; padding: 0 12px;
    border-radius: 10px; display: flex; align-items: center; gap: 5px;
    font-size: 12px; font-weight: 500; cursor: pointer;
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--text2); transition: all 0.15s; white-space: nowrap;
  }
  .ws-chip.active { background: var(--accent); color: #000; border-color: var(--accent); }

  /* horizontal tab scroll */
  .tab-scroll {
    display: flex; gap: 10px; padding: 0 14px 14px;
    overflow-x: auto; flex: 1;
    scrollbar-width: none;
  }
  .tab-scroll::-webkit-scrollbar { display: none; }

  .tab-card {
    flex-shrink: 0; width: 120px;
    height: 140px;
    border-radius: 14px;
    background: var(--surface2);
    border: 1.5px solid var(--border);
    overflow: hidden; cursor: pointer;
    transition: transform 0.15s, border-color 0.15s;
    position: relative; display: flex; flex-direction: column;
  }
  .tab-card.active { border-color: var(--accent); }
  .tab-card:hover { transform: translateY(-2px); }
  .tab-card.pinned::after {
    content: '📌'; position: absolute; top: 5px; right: 5px;
    font-size: 10px;
  }
  .tab-thumb {
    flex: 1; display: flex; align-items: center; justify-content: center;
    font-size: 32px;
    background: linear-gradient(135deg, #1e2437 0%, #252b40 100%);
  }
  .tab-info {
    padding: 6px 8px; background: var(--surface);
    border-top: 1px solid var(--border);
  }
  .tab-info .tab-title { font-size: 10px; font-weight: 500; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tab-info .tab-domain { font-size: 9px; color: var(--text3); font-family: var(--mono); }
  .tab-close {
    position: absolute; top: 4px; left: 4px;
    width: 18px; height: 18px; border-radius: 50%;
    background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
    font-size: 9px; opacity: 0; transition: opacity 0.15s; cursor: pointer;
    color: var(--text2);
  }
  .tab-card:hover .tab-close { opacity: 1; }

  /* ── MENU SHEET ──────────────────────────────────── */
  .menu-sheet {
    position: absolute; left: 0; right: 0; bottom: 80px;
    background: var(--surface);
    border-radius: 20px 20px 0 0;
    border-top: 1px solid var(--border);
    transform: translateY(100%);
    transition: transform 0.38s cubic-bezier(.32,.72,0,1);
    z-index: 30; padding-bottom: 12px;
  }
  .menu-sheet.open { transform: translateY(0); }
  .menu-handle { width: 36px; height: 4px; background: var(--border); border-radius: 2px; margin: 10px auto 14px; }

  .menu-section { padding: 0 16px 8px; }
  .menu-section-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text3); margin-bottom: 6px; }

  .menu-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .menu-item {
    background: var(--surface2); border-radius: 14px;
    padding: 12px 14px; display: flex; align-items: center; gap: 10px;
    cursor: pointer; border: 1px solid var(--border);
    transition: background 0.15s;
  }
  .menu-item:hover { background: #252a3a; }
  .menu-item .mi-icon { font-size: 20px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 10px; background: var(--bg); }
  .menu-item .mi-label { font-size: 13px; font-weight: 500; color: var(--text); }
  .menu-item.accent .mi-label { color: var(--accent); }

  .account-card {
    background: var(--surface2); border-radius: 14px; padding: 12px 14px;
    display: flex; align-items: center; gap: 12px; margin: 0 16px 12px;
    border: 1px solid var(--border); cursor: pointer;
  }
  .account-avatar {
    width: 40px; height: 40px; border-radius: 12px;
    background: linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%);
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
  }
  .account-info .name { font-size: 14px; font-weight: 600; }
  .account-info .email { font-size: 11px; color: var(--text2); font-family: var(--mono); }
  .sync-badge { margin-left: auto; background: #1a3a1a; border: 1px solid #2d6b2d; color: #5ccf5c; padding: 3px 8px; border-radius: 8px; font-size: 10px; font-weight: 600; }

  /* ── OVERLAY ─────────────────────────────────────── */
  .overlay {
    position: absolute; inset: 0; bottom: 80px;
    background: rgba(0,0,0,0.5); z-index: 19;
    opacity: 0; pointer-events: none; transition: opacity 0.3s;
  }
  .overlay.visible { opacity: 1; pointer-events: all; }

  /* ── BACK/FWD NAV ────────────────────────────────── */
  .nav-hint {
    position: absolute; top: 50%; transform: translateY(-50%);
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 12px; padding: 8px 12px; font-size: 13px;
    pointer-events: none; z-index: 25;
    opacity: 0; transition: opacity 0.2s;
  }
  .nav-hint.left  { left: 12px; }
  .nav-hint.right { right: 12px; }
  .nav-hint.show  { opacity: 1; }

  /* ── TOAST ───────────────────────────────────────── */
  .toast {
    position: absolute; bottom: 98px; left: 50%; transform: translateX(-50%) translateY(20px);
    background: var(--surface2); border: 1px solid var(--border);
    padding: 8px 16px; border-radius: 12px; font-size: 13px; font-weight: 500;
    white-space: nowrap; opacity: 0; transition: all 0.3s; z-index: 50;
  }
  .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
`;

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function ZenMobileBrowser() {
  const [workspace, setWorkspace] = useState("work");
  const [tabs, setTabs] = useState(INITIAL_TABS);
  const [activeTabId, setActiveTabId] = useState("t1");
  const [trayOpen, setTrayOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  const currentTabs = tabs[workspace] || [];
  const activeTab = currentTabs.find(t => t.id === activeTabId) || currentTabs[0];

  // ── helpers ──────────────────────────────────────
  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2000);
  };

  const closeTab = (e, tabId) => {
    e.stopPropagation();
    setTabs(prev => {
      const updated = { ...prev, [workspace]: prev[workspace].filter(t => t.id !== tabId) };
      return updated;
    });
    if (activeTabId === tabId) {
      const remaining = tabs[workspace].filter(t => t.id !== tabId);
      if (remaining.length) setActiveTabId(remaining[0].id);
    }
    showToast("Tab closed");
  };

  const switchTab = (tabId) => {
    setActiveTabId(tabId);
    setTrayOpen(false);
  };

  const switchWorkspace = (ws) => {
    setWorkspace(ws);
    const wsTabs = tabs[ws] || [];
    if (wsTabs.length) setActiveTabId(wsTabs[0].id);
    showToast(`${WORKSPACES.find(w => w.id === ws).emoji} ${WORKSPACES.find(w => w.id === ws).label}`);
  };

  const addNewTab = () => {
    const id = "t" + Date.now();
    const newTab = { id, title: "New Tab", domain: "newtab", favicon: "✨", url: "", pinned: false };
    setTabs(prev => ({ ...prev, [workspace]: [...prev[workspace], newTab] }));
    setActiveTabId(id);
    setTrayOpen(false);
    showToast("New tab opened");
  };

  const toggleBookmark = () => showToast("🔖 Bookmarked!");

  // ── drag gestures ─────────────────────────────────
  const contentDrag = useDrag(
    () => setTrayOpen(true),   // swipe up → open tray
    null,
    () => {                    // swipe left → next tab
      const idx = currentTabs.findIndex(t => t.id === activeTabId);
      if (idx < currentTabs.length - 1) switchTab(currentTabs[idx + 1].id);
    },
    () => {                    // swipe right → prev tab
      const idx = currentTabs.findIndex(t => t.id === activeTabId);
      if (idx > 0) switchTab(currentTabs[idx - 1].id);
    }
  );

  const trayDrag = useDrag(
    null,
    () => setTrayOpen(false),  // swipe down → close tray
    null, null
  );

  const overlayClick = () => { setTrayOpen(false); setMenuOpen(false); };
  const totalTabs = currentTabs.length;

  return (
    <>
      <style>{CSS}</style>
      {/* centering wrapper */}
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#07080c", padding: "24px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>

          {/* ── INSTRUCTION BADGE ── */}
          <div style={{ color: "#7a809a", fontSize: "12px", fontFamily: "'DM Sans',sans-serif", display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
            <span>↑ Swipe up → tab tray</span>
            <span>← → Swipe → switch tabs</span>
            <span>⋯ Menu → features</span>
          </div>

          {/* ── PHONE FRAME ── */}
          <div className="phone-frame">

            {/* BROWSER CONTENT */}
            <div
              className={`browser-content ${(trayOpen || menuOpen) ? "dimmed" : ""}`}
              {...contentDrag}
            >
              {activeTab ? (
                <div className="browser-placeholder">
                  <div className="site-favicon">{activeTab.favicon}</div>
                  <div className="site-title">{activeTab.title}</div>
                  <div className="site-url">{activeTab.domain}</div>
                  <div style={{ marginTop: "8px", fontSize: "11px", color: "#aaa", fontFamily: "'DM Mono',monospace", padding: "0 32px", textAlign: "center" }}>
                    Swipe left/right to switch tabs · Swipe up for tab tray
                  </div>
                </div>
              ) : (
                <div className="browser-placeholder">
                  <div style={{ fontSize: "40px" }}>🌿</div>
                  <div className="site-title">No tabs open</div>
                </div>
              )}
            </div>

            {/* OVERLAY */}
            <div className={`overlay ${trayOpen || menuOpen ? "visible" : ""}`} onClick={overlayClick} />

            {/* TAB TRAY */}
            <div className={`tab-tray ${trayOpen ? "open" : ""}`} {...trayDrag}>
              <div className="tray-handle" />

              {/* workspace chips */}
              <div className="workspace-row">
                {WORKSPACES.map(ws => (
                  <div
                    key={ws.id}
                    className={`ws-chip ${workspace === ws.id ? "active" : ""}`}
                    onClick={() => switchWorkspace(ws.id)}
                  >
                    {ws.emoji} {ws.label}
                  </div>
                ))}
              </div>

              {/* horizontal tab strip */}
              <div className="tab-scroll">
                {currentTabs.map(tab => (
                  <div
                    key={tab.id}
                    className={`tab-card ${tab.id === activeTabId ? "active" : ""} ${tab.pinned ? "pinned" : ""}`}
                    onClick={() => switchTab(tab.id)}
                  >
                    <div className="tab-close" onClick={(e) => closeTab(e, tab.id)}>✕</div>
                    <div className="tab-thumb">{tab.favicon}</div>
                    <div className="tab-info">
                      <div className="tab-title">{tab.title}</div>
                      <div className="tab-domain">{tab.domain}</div>
                    </div>
                  </div>
                ))}
                {/* new tab card */}
                <div
                  className="tab-card"
                  style={{ alignItems: "center", justifyContent: "center", opacity: 0.6 }}
                  onClick={addNewTab}
                >
                  <div style={{ fontSize: "28px" }}>+</div>
                  <div style={{ fontSize: "11px", color: "var(--text3)", marginTop: "4px" }}>New Tab</div>
                </div>
              </div>
            </div>

            {/* MENU SHEET */}
            <div className={`menu-sheet ${menuOpen ? "open" : ""}`}>
              <div className="menu-handle" />

              {/* Firefox Sync account card */}
              <div className="account-card">
                <div className="account-avatar">🦊</div>
                <div className="account-info">
                  <div className="name">Firefox Account</div>
                  <div className="email">user@example.com</div>
                </div>
                <div className="sync-badge">● Synced</div>
              </div>

              <div className="menu-section">
                <div className="menu-section-label">Navigation</div>
                <div className="menu-grid">
                  <div className="menu-item" onClick={() => { showToast("⬅ Back"); setMenuOpen(false); }}>
                    <div className="mi-icon">←</div>
                    <div className="mi-label">Back</div>
                  </div>
                  <div className="menu-item" onClick={() => { showToast("➡ Forward"); setMenuOpen(false); }}>
                    <div className="mi-icon">→</div>
                    <div className="mi-label">Forward</div>
                  </div>
                </div>
              </div>

              <div className="menu-section">
                <div className="menu-section-label">Actions</div>
                <div className="menu-grid">
                  <div className="menu-item" onClick={() => { toggleBookmark(); setMenuOpen(false); }}>
                    <div className="mi-icon">🔖</div>
                    <div className="mi-label">Bookmark</div>
                  </div>
                  <div className="menu-item" onClick={() => { showToast("🔗 Link copied"); setMenuOpen(false); }}>
                    <div className="mi-icon">🔗</div>
                    <div className="mi-label">Share</div>
                  </div>
                  <div className="menu-item" onClick={() => { showToast("🔄 Reloading…"); setMenuOpen(false); }}>
                    <div className="mi-icon">🔄</div>
                    <div className="mi-label">Reload</div>
                  </div>
                  <div className="menu-item" onClick={() => { showToast("⚙ Settings"); setMenuOpen(false); }}>
                    <div className="mi-icon">⚙️</div>
                    <div className="mi-label">Settings</div>
                  </div>
                </div>
              </div>
            </div>

            {/* URL BAR */}
            <div className="url-bar">
              {/* new tab */}
              <div className="url-bar-btn" onClick={addNewTab} title="New tab">
                <span style={{ fontSize: "22px", lineHeight: 1, color: "var(--text2)" }}>+</span>
              </div>

              {/* url pill */}
              <div className="url-pill" onClick={() => showToast("🔍 Address bar tapped")}>
                <span className="lock">🔒</span>
                <span className="domain">{activeTab?.domain || "newtab"}</span>
                <div
                  className="workspace-badge"
                  onClick={(e) => { e.stopPropagation(); setTrayOpen(v => !v); }}
                  title="Workspaces"
                >
                  {WORKSPACES.find(w => w.id === workspace)?.emoji}
                </div>
              </div>

              {/* tabs button */}
              <div className="url-bar-btn" style={{ position: "relative" }} onClick={() => setTrayOpen(v => !v)} title="Tabs">
                <span style={{ fontSize: "16px", color: "var(--text2)" }}>⊞</span>
                <div className="tab-count-badge">{totalTabs}</div>
              </div>

              {/* menu */}
              <div className="url-bar-btn" onClick={() => setMenuOpen(v => !v)} title="Menu">
                <span style={{ fontSize: "18px", color: "var(--text2)" }}>⋯</span>
              </div>
            </div>

            {/* TOAST */}
            <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
          </div>

          {/* ── LEGEND ── */}
          <div style={{
            fontFamily: "'DM Sans',sans-serif", color: "#454b66", fontSize: "11px",
            textAlign: "center", lineHeight: 1.7, maxWidth: "360px"
          }}>
            Zen Mobile Browser — Proof of Concept · React Native ready · Firefox Sync · Multi-workspace
          </div>
        </div>
      </div>
    </>
  );
}
