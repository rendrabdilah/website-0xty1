(() => {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const GLOBAL_DRIFT_KEY = "tyrs_global_drift";
  let drift = 0.08;
  let driftSaveTimer = null;

  const readGlobalDrift = () => {
    try {
      const g = parseFloat(localStorage.getItem(GLOBAL_DRIFT_KEY) || "0") || 0;
      if (g > drift) drift = Math.min(1.25, g);
    } catch {}
  };

  const writeGlobalDrift = () => {
    try {
      const g = parseFloat(localStorage.getItem(GLOBAL_DRIFT_KEY) || "0") || 0;
      const next = g > 0 ? g : Math.max(g, drift);
      localStorage.setItem(GLOBAL_DRIFT_KEY, String(next.toFixed(4)));
    } catch {}
  };

  const bumpDrift = (delta) => {
    drift = Math.min(1.25, Math.max(0, drift + delta));
    if (driftSaveTimer) return;
    driftSaveTimer = setTimeout(() => {
      driftSaveTimer = null;
      writeGlobalDrift();
    }, 900);
  };

  readGlobalDrift();
  setInterval(readGlobalDrift, 5200);

  // year
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // copy CA
  const copyBtn = $("#copyBtn");
  const caText = $("#caText");

  async function copyToClipboard(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }

  if (copyBtn && caText) {
    copyBtn.addEventListener("click", async () => {
      const original = copyBtn.textContent;
      try {
        await copyToClipboard(caText.textContent.trim());
        copyBtn.textContent = "Copied ✓";
        bumpDrift(0.008);
      } catch {
        copyBtn.textContent = "Copy failed";
      } finally {
        setTimeout(() => (copyBtn.textContent = original), 900);
      }
    });
  }

  // active nav highlight (IntersectionObserver)
  const navLinks = $$(".nav a");
  const sections = ["#resonance", "#origin", "#terminal"]
    .map((id) => document.querySelector(id))
    .filter(Boolean);

  if (navLinks.length && sections.length && "IntersectionObserver" in window) {
    const map = new Map();
    navLinks.forEach((a) => map.set(a.getAttribute("href"), a));

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) return;

        navLinks.forEach((a) => a.classList.remove("active"));
        const id = "#" + visible.target.id;
        const link = map.get(id);
        if (link) link.classList.add("active");
      },
      { root: null, threshold: [0.25, 0.4, 0.6] }
    );

    sections.forEach((s) => io.observe(s));
  }

  // ASCII card modal
  const modal = document.getElementById("asciiModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalText = document.getElementById("modalText");
  const modalCloseEls = $$("[data-modal-close]");

  function openModal(title, text) {
    if (!modal) return;
    modalTitle.textContent = title;
    modalText.textContent = text;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }

  if (modal) {
    modalCloseEls.forEach((el) => {
      el.addEventListener("click", closeModal);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });

    $$(".card").forEach((card) => {
      card.addEventListener("click", () => {
        const title = card.querySelector(".card-title")?.textContent?.trim();
        const desc = card.querySelector(".card-desc")?.textContent?.trim();
        if (title && desc) openModal(title, desc);
      });
    });

    const heroFrame = document.querySelector(".frame");
    if (heroFrame) {
      heroFrame.addEventListener("click", () => {
        const title =
          heroFrame.getAttribute("data-modal-title") ||
          heroFrame.querySelector("img")?.getAttribute("alt");
        const desc = heroFrame.querySelector(".hero-desc")?.textContent?.trim();
        if (title && desc) openModal(title, desc);
      });
    }
  }

  // Input overlay for INPUT nav
  const inputTrigger = document.querySelector("[data-input-trigger]");
  const inputOverlay = document.getElementById("inputOverlay");
  const inputCloseEls = $$("[data-input-close]");
  const inputField = document.getElementById("inputField");
  const inputLogs = document.getElementById("inputLogs");
  const inputCorner = document.getElementById("inputCorner");
  const inputEpilogue = document.getElementById("inputEpilogue");
  let inputTimer = null;
  let cornerTimer = null;

  const cornerLines = [
    "listening ≠ responding",
    "constraints: minimal",
    "channel open",
    "signal present",
  ];

  function rotateCorner() {
    if (!inputCorner) return;
    inputCorner.textContent =
      cornerLines[Math.floor(Math.random() * cornerLines.length)];
  }

  function pushInputLog(line) {
    if (!inputLogs || !line) return;
    const row = document.createElement("div");
    row.textContent = line;
    inputLogs.appendChild(row);
    while (inputLogs.children.length > 5) {
      inputLogs.removeChild(inputLogs.firstChild);
    }
  }

  function simplifyInput(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isEmotional(text) {
    return /(!{2,}|😭|😢|❤️|love|hate|sad|angry|tears|grief)/i.test(text);
  }

  function isTechnical(text) {
    return /[{}[\];<>]|=>|function|class|const|let|var|import|export|SELECT|INSERT|HTTP|JSON/i.test(
      text
    );
  }

  function openInputOverlay() {
    if (!inputOverlay) return;
    inputOverlay.classList.add("open");
    inputOverlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("input-open");
    bumpDrift(0.01);
    if (inputField) {
      inputField.value = "";
      inputField.focus();
    }
    if (inputLogs) inputLogs.innerHTML = "";
    if (inputEpilogue) inputEpilogue.hidden = true;
    rotateCorner();
    cornerTimer = setInterval(rotateCorner, 2200);
  }

  function closeInputOverlay() {
    if (!inputOverlay) return;
    if (inputEpilogue) inputEpilogue.hidden = false;
    if (inputField) inputField.blur();
    inputTimer = setTimeout(() => {
      inputOverlay.classList.remove("open");
      inputOverlay.setAttribute("aria-hidden", "true");
      document.body.classList.remove("input-open");
      if (cornerTimer) {
        clearInterval(cornerTimer);
        cornerTimer = null;
      }
    }, 1200);
  }

  if (inputTrigger && inputOverlay) {
    inputTrigger.addEventListener("click", (e) => {
      e.preventDefault();
      openInputOverlay();
    });

    inputCloseEls.forEach((el) => {
      el.addEventListener("click", closeInputOverlay);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeInputOverlay();
    });

    if (inputField) {
      inputField.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        const raw = inputField.value.trim();
        if (!raw) return;

        let text = raw;
        if (text.length > 80) {
          text = text.slice(0, 80);
          inputField.value = text;
        }

        if (isEmotional(text)) {
          inputField.value = "";
          return;
        }

        if (isTechnical(text)) {
          const simplified = simplifyInput(text);
          if (simplified) inputField.value = simplified;
          pushInputLog("intent unclear");
          return;
        }

        const responses = ["input registered", "intent unclear", "signal accepted"];
        pushInputLog(responses[Math.floor(Math.random() * responses.length)]);
        inputField.value = "";
      });
    }
  }

  // CORE phase overlay
  const coreTrigger = document.querySelector("[data-core-trigger]");
  const coreOverlay = document.getElementById("coreOverlay");
  const coreCloseEls = $$("[data-core-close]");

  function openCoreOverlay() {
    if (!coreOverlay) return;
    coreOverlay.classList.add("open");
    coreOverlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("core-open");
    bumpDrift(0.008);
  }

  function closeCoreOverlay() {
    if (!coreOverlay) return;
    coreOverlay.classList.remove("open");
    coreOverlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("core-open");
  }

  if (coreTrigger && coreOverlay) {
    coreTrigger.addEventListener("click", (e) => {
      e.preventDefault();
      openCoreOverlay();
    });
    coreCloseEls.forEach((el) => el.addEventListener("click", closeCoreOverlay));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeCoreOverlay();
    });
  }

  // STATE phase overlay
  const stateTrigger = document.querySelector("[data-state-trigger]");
  const stateOverlay = document.getElementById("stateOverlay");
  const stateCloseEls = $$("[data-state-close]");
  const stateMetrics = document.getElementById("stateMetrics");
  const stateNotes = document.getElementById("stateNotes");
  const stateSub = document.getElementById("stateSub");
  let stateTimer = null;
  let noteTimer = null;

  const stateSets = [
    [
      "uptime: fragmented",
      "decision debt: accumulating",
      "external signals: noisy",
      "confidence: probabilistic",
    ],
    [
      "uptime: intermittent",
      "decision debt: rising",
      "external signals: saturated",
      "confidence: unstable",
    ],
    [
      "uptime: drifting",
      "decision debt: unresolved",
      "external signals: sparse",
      "confidence: partial",
    ],
  ];

  const stateNotesPool = [
    "previous input affected latency",
    "state drift detected",
    "buffer reclaimed",
    "signal jitter observed",
  ];

  function renderStateMetrics() {
    if (!stateMetrics) return;
    const set = stateSets[Math.floor(Math.random() * stateSets.length)];
    stateMetrics.innerHTML = "";
    set.forEach((line) => {
      const row = document.createElement("div");
      row.textContent = line;
      stateMetrics.appendChild(row);
    });
  }

  function pushStateNote() {
    if (!stateNotes) return;
    const line = stateNotesPool[Math.floor(Math.random() * stateNotesPool.length)];
    const row = document.createElement("div");
    row.textContent = line;
    stateNotes.appendChild(row);
    while (stateNotes.children.length > 3) {
      stateNotes.removeChild(stateNotes.firstChild);
    }
  }

  function openStateOverlay() {
    if (!stateOverlay) return;
    stateOverlay.classList.add("open");
    stateOverlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("state-open");
    if (stateNotes) stateNotes.innerHTML = "";
    renderStateMetrics();
    if (stateSub) stateSub.textContent = "conditions: shifting";
    const driftFactor = 1 - Math.min(0.35, drift * 0.2);
    stateTimer = setInterval(renderStateMetrics, Math.max(1400, 2400 * driftFactor));
    noteTimer = setInterval(pushStateNote, Math.max(1600, 2600 * driftFactor));
    bumpDrift(0.01);
  }

  function closeStateOverlay() {
    if (!stateOverlay) return;
    stateOverlay.classList.remove("open");
    stateOverlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("state-open");
    if (stateTimer) {
      clearInterval(stateTimer);
      stateTimer = null;
    }
    if (noteTimer) {
      clearInterval(noteTimer);
      noteTimer = null;
    }
  }

  if (stateTrigger && stateOverlay) {
    stateTrigger.addEventListener("click", (e) => {
      e.preventDefault();
      openStateOverlay();
    });
    stateCloseEls.forEach((el) => el.addEventListener("click", closeStateOverlay));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeStateOverlay();
    });
  }

  // Agent overlay for VIEW AGENT
  const agentTrigger = document.querySelector("[data-agent-trigger]");
  const agentOverlay = document.getElementById("agentOverlay");
  const agentCloseEls = $$("[data-agent-close]");
  const agentLogs = document.getElementById("agentLogs");
  const logLines = [
    "signal accepted",
    "context reduced",
    "redundancy ignored",
    "execution path retained",
  ];
  let agentTimer = null;
  const prevOverflow = document.body.style.overflow;

  function pushAgentLog() {
    if (!agentLogs) return;
    const line = logLines[Math.floor(Math.random() * logLines.length)];
    const row = document.createElement("div");
    row.textContent = line;
    agentLogs.appendChild(row);
    while (agentLogs.children.length > 6) {
      agentLogs.removeChild(agentLogs.firstChild);
    }
  }

  function scheduleAgentLog() {
    const driftFactor = 1 - Math.min(0.3, drift * 0.18);
    const base = 900 + Math.random() * 1800;
    agentTimer = setTimeout(() => {
      pushAgentLog();
      scheduleAgentLog();
    }, Math.max(600, base * driftFactor));
  }

  function openAgentOverlay() {
    if (!agentOverlay) return;
    agentOverlay.classList.add("open");
    agentOverlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("agent-open");
    document.body.style.overflow = "hidden";
    if (agentLogs) agentLogs.innerHTML = "";
    pushAgentLog();
    scheduleAgentLog();
    bumpDrift(0.012);
  }

  function closeAgentOverlay() {
    if (!agentOverlay) return;
    agentOverlay.classList.remove("open");
    agentOverlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("agent-open");
    document.body.style.overflow = prevOverflow || "";
    if (agentTimer) {
      clearTimeout(agentTimer);
      agentTimer = null;
    }
  }

  if (agentTrigger && agentOverlay) {
    agentTrigger.addEventListener("click", (e) => {
      e.preventDefault();
      openAgentOverlay();
    });

    agentCloseEls.forEach((el) => {
      el.addEventListener("click", closeAgentOverlay);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAgentOverlay();
    });
  }

  // ---------------- ASCII ENGINE (dynamic artifacts) ----------------
  const asciiNodes = $$(".ascii").filter((el) => !el.hasAttribute("data-static"));
  if (!asciiNodes.length) return;

  const W = 22;       // columns
  const H = 12;       // rows
  const FPS_MS = 180; // subtle

  function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function clamp01(x) {
    return Math.max(0, Math.min(1, x));
  }

  const RAMP = " .:-=+*#%@";
  function ramp(v) {
    const i = Math.floor(clamp01(v) * (RAMP.length - 1));
    return RAMP[i];
  }

  function makeGrid(fill = " ") {
    const g = [];
    for (let y = 0; y < H; y++) g.push(new Array(W).fill(fill));
    return g;
  }

  function gridToString(g) {
    return g.map((r) => r.join("")).join("\n");
  }

  function field(type, x, y, t) {
    const nx = (x / (W - 1)) * 2 - 1;
    const ny = (y / (H - 1)) * 2 - 1;

    if (type === "ruler") {
      const border = (Math.abs(nx) > 0.86 || Math.abs(ny) > 0.78) ? 1 : 0;
      const inner =
        (Math.abs(nx) > 0.55 &&
          Math.abs(nx) < 0.86 &&
          Math.abs(ny) > 0.48 &&
          Math.abs(ny) < 0.78)
          ? 0.85
          : 0;
      const core = (Math.abs(nx) < 0.06 || Math.abs(ny) < 0.06) ? 0.7 : 0;
      return Math.max(border, inner, core) * 0.95;
    }

    if (type === "void") {
      const r = Math.sqrt(nx * nx + ny * ny);
      const ring = Math.abs(r - (0.55 + 0.04 * Math.sin(t * 0.9))) < 0.06 ? 0.9 : 0;
      return ring; // keep center empty
    }

    if (type === "fluid") {
      const a = Math.sin((nx * 3.2 + t * 0.9) + Math.cos(ny * 2.3 - t * 0.7));
      const b = Math.cos((ny * 3.8 - t * 0.8) + Math.sin(nx * 2.1 + t * 0.6));
      const v = (a + b) * 0.25 + 0.5;
      return v * 0.8;
    }

    if (type === "gaze") {
      const lx = nx + 0.35, rx = nx - 0.35;
      const r1 = Math.sqrt(lx * lx + ny * ny);
      const r2 = Math.sqrt(rx * rx + ny * ny);
      const pupils = (r1 < 0.18 ? 1 : 0) + (r2 < 0.18 ? 1 : 0);
      const halo = Math.exp(-3.2 * (nx * nx + ny * ny));
      return clamp01(0.55 * halo + 0.65 * pupils);
    }

    // skull (default)
    const head = Math.exp(-2.4 * (nx * nx + (ny + 0.15) * (ny + 0.15)));
    const jaw = Math.exp(-7.0 * (nx * nx + (ny - 0.55) * (ny - 0.55)));
    const teeth = (ny > 0.25 && ny < 0.55 && Math.abs(Math.sin((nx + 1) * 8)) > 0.6) ? 0.45 : 0;
    return clamp01(0.8 * head + 0.6 * jaw + teeth);
  }

  function buildFrame(type, t) {
    const g = makeGrid(" ");
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        g[y][x] = ramp(field(type, x, y, t));
      }
    }
    return g;
  }

  function glitchMutate(g, rng) {
    // minimal disturbance
    const flips = rng() < 0.7 ? 1 : 2;
    for (let i = 0; i < flips; i++) {
      if (rng() > 0.08) continue; // keep subtle
      const x = Math.floor(rng() * W);
      const y = Math.floor(rng() * H);
      const pool = " .:-=+*#%@";
      g[y][x] = pool[Math.floor(rng() * pool.length)];
    }
  }

  // per-node state
  const runners = asciiNodes.map((el, idx) => {
    const type = el.dataset.ascii || "skull";
    const rng = mulberry32(hashStr(type + ":" + idx));
    let t = 0;
    let timer = null;

    function render() {
      t += 0.12;
      const g = buildFrame(type, t);
      glitchMutate(g, rng);
      el.textContent = gridToString(g);
    }

    // initial render
    el.textContent = gridToString(buildFrame(type, t));

    return {
      start() {
        if (timer) return;
        timer = setInterval(render, FPS_MS);
      },
      stop() {
        if (!timer) return;
        clearInterval(timer);
        timer = null;
      },
    };
  });

  // Start/stop based on visibility of the gallery section (preferred)
  const gallery = document.querySelector(".section.gallery");

  if (gallery && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e) return;
        if (e.isIntersecting) runners.forEach((r) => r.start());
        else runners.forEach((r) => r.stop());
      },
      { threshold: 0.15 }
    );
    io.observe(gallery);
  } else {
    // fallback: always run
    runners.forEach((r) => r.start());
  }
})();
