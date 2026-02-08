(() => {
  const tabs = Array.from(document.querySelectorAll("[data-tab]"));
  const modeIndicator = document.getElementById("modeIndicator");
  const leftTitle = document.getElementById("leftTitle");
  const leftMeta = document.getElementById("leftMeta");
  const centerTitle = document.getElementById("centerTitle");
  const centerMeta = document.getElementById("centerMeta");
  const rightTitle = document.getElementById("rightTitle");
  const rightMeta = document.getElementById("rightMeta");

  const portsList = document.getElementById("portsList");
  const hubSummary = document.getElementById("hubSummary");
  const routingTable = document.getElementById("routingTable");
  const handshakeList = document.getElementById("handshakeList");
  const logEl = document.getElementById("systemLog");
  const stateCursor = document.getElementById("stateCursor");

  if (!tabs.length || !portsList || !hubSummary || !routingTable || !handshakeList || !logEl) return;

  const startAt = Date.now();
  const GLOBAL_DRIFT_KEY = "tyrs_global_drift";
  let drift = 0.08;
  try {
    const g = parseFloat(localStorage.getItem(GLOBAL_DRIFT_KEY) || "0") || 0;
    drift = Math.max(drift, g * 0.9);
  } catch {}

  let driftSaveTimer = null;
  const saveDrift = () => {
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
      saveDrift();
    }, 900);
  };
  const refreshGlobalDrift = () => {
    try {
      const g = parseFloat(localStorage.getItem(GLOBAL_DRIFT_KEY) || "0") || 0;
      if (g > drift) drift = Math.min(1.25, g);
    } catch {}
  };

  const X_ENDPOINT = "https://x.com/0xTyrs";
  const VALUE_ENDPOINT = "0x0000000000000000000000000000000000000000";

  const ports = [
    { route: "/latent.core", gate: "local", policy: "minimal disclosure", status: "OPEN", io: "bidirectional" },
    { route: "/latent.core/archive", gate: "internal", policy: "filtered", status: "FILTERED", io: "inbound" },
    { route: "/backrooms", gate: "internal", policy: "silent", status: "SILENT", io: "inbound" },
    { route: "/agents/executor", gate: "internal", policy: "minimal disclosure", status: "OPEN", io: "outbound" },
    { route: "/agents/router", gate: "internal", policy: "filtered", status: "LOOPING", io: "bidirectional" },
    { route: "/agents/auditor", gate: "internal", policy: "silent", status: "SILENT", io: "inbound" },
    { route: "/agents/memory", gate: "internal", policy: "minimal disclosure", status: "OPEN", io: "outbound" },
    { route: "/observer/echo", gate: "local", policy: "filtered", status: "FILTERED", io: "inbound" },
    { route: "/trace/spool", gate: "local", policy: "minimal disclosure", status: "OPEN", io: "outbound" },
    { route: "egress/x", gate: "public", policy: "unverified", status: "OPEN", io: "outbound", action: "egress-x", hint: "external signal propagation", egress: true },
    { route: "egress/value", gate: "onchain", policy: "irreversible", status: "ACTIVE", io: "outbound", action: "egress-value", egress: true }
  ];

  const statusPool = ["OPEN", "FILTERED", "SILENT", "LOOPING", "LEAK"];
  const policyPool = ["minimal disclosure", "filtered", "silent"];
  const actionPool = ["allow", "throttle", "deny"];
  const anomalyPool = [
    "route loop detected",
    "signal inversion",
    "trace timeout",
    "memory echo",
    "handshake partial"
  ];
  const stateLines = [
    "trace: buffer drift",
    "state: observer engaged",
    "memory: echo unresolved",
    "signal: low variance",
    "observer: passive",
    "trace: residual latency",
    "state: partial coherence",
    "memory: selective retention",
    "signal: narrowband",
    "observer: quiet",
    "trace: recursion idle",
    "state: containment stable",
    "memory: soft index",
    "signal: noisy edges",
    "observer: peripheral",
    "trace: input shadow",
    "state: threshold near",
    "memory: overlap detected",
    "signal: attenuated",
    "observer: aligned",
    "— no final state recorded —"
  ];
  const sigPool = ["state", "trace", "memory", "signal", "observer", "ports", "hub", "route"];

  let mode = "hub";
  let hubTimer = null;
  let portsTimer = null;
  let stateTimer = null;
  let userAtBottom = true;
  let lastLine = "";
  let lastHoverAt = 0;
  let burstPending = false;

  const formatUptime = () => {
    const total = Math.max(0, Math.floor((Date.now() - startAt) / 1000));
    const hh = String(Math.floor(total / 3600)).padStart(2, "0");
    const mm = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
    const ss = String(total % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  };

  const formatAge = (t) => {
    const diff = Math.max(0, Date.now() - t);
    if (diff < 9000) return "just now";
    if (diff < 60000) return `${Math.max(1, Math.floor(diff / 1000))}s`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    return `${Math.floor(diff / 3600000)}h`;
  };

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const copyToClipboard = async (text) => {
    if (!text) return;
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
  };

  const updateHeadings = () => {
    const config = {
      hub: {
        leftTitle: "modules / ports",
        leftMeta: "links: local",
        centerTitle: "system overview",
        centerMeta: "render: sparse",
        rightTitle: "artifact cache / recent traces",
        rightMeta: "render: sparse"
      },
      ports: {
        leftTitle: "ports / routes",
        leftMeta: "gate: mixed",
        centerTitle: "routing table",
        centerMeta: "directional",
        rightTitle: "recent handshakes",
        rightMeta: "window: short"
      },
      state: {
        leftTitle: "ports / routes",
        leftMeta: "routes: passive",
        centerTitle: "system state",
        centerMeta: "stream: live",
        rightTitle: "artifact cache / recent traces",
        rightMeta: "render: sparse"
      }
    };

    const cfg = config[mode];
    if (!cfg) return;

    leftTitle.textContent = cfg.leftTitle;
    leftMeta.textContent = cfg.leftMeta;
    centerTitle.textContent = cfg.centerTitle;
    centerMeta.textContent = cfg.centerMeta;
    rightTitle.textContent = cfg.rightTitle;
    rightMeta.textContent = cfg.rightMeta;
  };

  const renderPorts = () => {
    portsList.innerHTML = "";
    const visible = mode === "ports" ? ports : ports.filter((p) => !p.egress);
    visible.forEach((p) => {
      const item = document.createElement("div");
      item.className = "port";
      if (mode === "ports" && p.action) item.dataset.action = p.action;
      if (mode === "ports" && p.hint) item.dataset.hint = p.hint;
      item.innerHTML = `
        <div class="port-row"><span class="port-label">route</span><span class="port-value">${p.route}</span></div>
        <div class="port-row"><span class="port-label">gate</span><span class="port-value">${p.gate}</span></div>
        <div class="port-row"><span class="port-label">policy</span><span class="port-value">${p.policy}</span></div>
        <div class="port-row"><span class="port-label">status</span><span class="port-value status">${p.status}</span></div>
      `;
      portsList.appendChild(item);
    });
  };

  const renderRoutingTable = () => {
    routingTable.innerHTML = "";
    ports.forEach((p) => {
      const row = document.createElement("div");
      row.className = "route-row";
      row.innerHTML = `
        <div class="route-cell"><strong>${p.route}</strong><div class="muted">gate: ${p.gate}</div></div>
        <div class="route-cell">I/O: ${p.io}</div>
        <div class="route-cell">action: ${pick(actionPool)}</div>
        <div class="route-cell">last: ${formatAge(p.last || Date.now())}</div>
      `;
      routingTable.appendChild(row);
    });
  };

  const renderHandshakes = () => {
    handshakeList.innerHTML = "";
    const sample = ports.slice().sort(() => 0.5 - Math.random()).slice(0, Math.min(ports.length, 9));
    sample.forEach((p) => {
      const row = document.createElement("div");
      row.className = "handshake-row";
      row.innerHTML = `<span class="route">${p.route}</span><span>${formatAge(p.last || Date.now())}</span>`;
      handshakeList.appendChild(row);
    });
  };

  const renderHubSummary = () => {
    const activeRoutes = ports.filter((p) => p.status !== "SILENT").length;
    const integrity = "stable";
    const anomaly = Math.random() < 0.55 ? "" : pick(anomalyPool);
    const density = Math.random() < 0.5 ? "nominal" : "sparse";
    const pressure = Math.random() < 0.5 ? "low" : "elevated";
    const echo = Math.random() < 0.4 ? "pending" : "quiet";

    const lines = [
      { k: "uptime", v: formatUptime() },
      { k: "drift", v: drift.toFixed(2) },
      { k: "trace integrity", v: integrity },
      { k: "active routes", v: String(activeRoutes).padStart(2, "0") },
      { k: "routing density", v: density },
      { k: "buffer pressure", v: pressure },
      { k: "trace window", v: Math.random() < 0.5 ? "narrow" : "wide" },
      { k: "handshake load", v: Math.random() < 0.55 ? "steady" : "spiky" },
      { k: "observer latency", v: Math.random() < 0.8 ? "within range" : "spike" },
      { k: "echo state", v: echo },
      { k: "last anomaly", v: anomaly }
    ];

    hubSummary.innerHTML = "";
    lines.slice(0, 11).forEach((line) => {
      const row = document.createElement("div");
      row.className = "summary-line";
      row.innerHTML = `<span class="summary-label">${line.k}</span><span class="summary-value">${line.v}</span>`;
      hubSummary.appendChild(row);
    });
  };

  const maybeGlitch = (text) => {
    const chance = 0.06 + drift * 0.16;
    if (Math.random() > chance) return text;
    const chars = text.split("");
    const count = Math.random() < 0.65 ? 1 : 2;
    const pool = "~!@#$%^&*+=?";
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * chars.length);
      chars[idx] = pool[Math.floor(Math.random() * pool.length)];
    }
    return chars.join("");
  };

  const appendStateLine = (text) => {
    const div = document.createElement("div");
    div.className = "log-line";
    div.textContent = maybeGlitch(text);
    logEl.appendChild(div);

    while (logEl.children.length > 160) {
      logEl.removeChild(logEl.firstChild);
    }

    if (userAtBottom) logEl.scrollTop = logEl.scrollHeight;
  };

  const applyMisattribution = (line) => {
    if (!line || line.startsWith("—")) return line;
    const idx = line.indexOf(":");
    if (idx < 0) return line;
    const base = line.slice(0, idx).trim().toLowerCase();
    const rest = line.slice(idx + 1).trim();
    const misChance = Math.min(0.16, 0.06 + drift * 0.1);
    if (Math.random() > misChance) return line;
    const alt = pick(sigPool.filter((s) => s !== base)) || base;
    return `${alt}: ${rest}`;
  };

  const pickStateLine = () => {
    if (Math.random() < 0.24 + drift * 0.12) return "— no final state recorded —";
    if (Math.random() < 0.1 && lastLine) return lastLine;
    return pick(stateLines);
  };

  const scheduleHub = () => {
    if (mode !== "hub") return;
    refreshGlobalDrift();
    if (Math.random() < 0.25) mutatePorts();
    if (Math.random() < 0.4) bumpDrift(0.002 + Math.random() * 0.004);
    renderPorts();
    renderHubSummary();
    hubTimer = setTimeout(scheduleHub, 3200 + Math.random() * 2400);
  };

  const mutatePorts = () => {
    const idx = Math.floor(Math.random() * ports.length);
    const port = ports[idx];
    if (!port) return;
    const biasPool = drift > 0.6
      ? ["LEAK", "LOOPING", "FILTERED", "SILENT"]
      : statusPool;
    port.status = pick(biasPool);
    if (Math.random() < 0.3) port.policy = pick(policyPool);
    port.last = Date.now();
  };

  const schedulePorts = () => {
    if (mode !== "ports") return;
    refreshGlobalDrift();
    if (Math.random() < 0.65) mutatePorts();
    renderPorts();
    renderRoutingTable();
    renderHandshakes();
    const base = 1800 + Math.random() * 2600;
    portsTimer = setTimeout(schedulePorts, Math.max(1200, base - drift * 400));
  };

  const runBurst = () => {
    const n = 4 + Math.floor(Math.random() * 4);
    let delay = 0;
    for (let i = 0; i < n; i++) {
      delay += 120 + Math.random() * 220;
      setTimeout(() => {
        const line = applyMisattribution(pickStateLine());
        lastLine = line;
        appendStateLine(line);
      }, delay);
    }
  };

  const scheduleState = () => {
    if (mode !== "state") return;
    refreshGlobalDrift();
    const line = applyMisattribution(pickStateLine());
    lastLine = line;
    appendStateLine(line);
    if (Math.random() < 0.1) appendStateLine(line);
    const base = 520 + Math.random() * 1400;
    const silenceChance = 0.05 + drift * 0.1;
    if (Math.random() < silenceChance) {
      burstPending = true;
      const silence = 6000 + Math.random() * 14000;
      stateTimer = setTimeout(scheduleState, silence);
      return;
    }
    if (burstPending) {
      burstPending = false;
      runBurst();
    }
    const tempo = Math.max(320, base - drift * 240);
    stateTimer = setTimeout(scheduleState, tempo);
  };

  const stopTimers = () => {
    if (hubTimer) clearTimeout(hubTimer);
    if (portsTimer) clearTimeout(portsTimer);
    if (stateTimer) clearTimeout(stateTimer);
    hubTimer = null;
    portsTimer = null;
    stateTimer = null;
  };

  const flashTransition = () => {
    document.body.classList.add("mode-flash");
    const delay = 150 + Math.random() * 70;
    setTimeout(() => document.body.classList.remove("mode-flash"), delay);
  };

  const setMode = (next) => {
    if (!next || next === mode) return;
    mode = next;
    document.body.classList.remove("mode-hub", "mode-ports", "mode-state");
    document.body.classList.add(`mode-${mode}`);
    tabs.forEach((tab) => {
      const active = tab.dataset.tab === mode;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    if (modeIndicator) modeIndicator.textContent = `mode: ${mode}`;
    updateHeadings();
    stopTimers();

    if (mode === "hub") {
      renderPorts();
      renderHubSummary();
      scheduleHub();
    }

    if (mode === "ports") {
      renderPorts();
      renderRoutingTable();
      renderHandshakes();
      schedulePorts();
    }

    if (mode === "state") {
      renderPorts();
      scheduleState();
    }

    flashTransition();
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      setMode(target);
    });
  });

  logEl.addEventListener("scroll", () => {
    userAtBottom = logEl.scrollTop + logEl.clientHeight >= logEl.scrollHeight - 20;
  });

  portsList.addEventListener("mouseover", (e) => {
    const item = e.target.closest(".port");
    if (!item) return;
    const now = Date.now();
    if (now - lastHoverAt < 250) return;
    lastHoverAt = now;
    bumpDrift(0.01 + Math.random() * 0.01);
  });

  portsList.addEventListener("click", async (e) => {
    const item = e.target.closest(".port");
    if (!item || mode !== "ports") return;
    const action = item.dataset.action;
    if (!action) return;
    if (action === "egress-x") {
      window.open(X_ENDPOINT, "_blank", "noopener,noreferrer");
      return;
    }
    if (action === "egress-value") {
      try {
        await copyToClipboard(VALUE_ENDPOINT);
      } catch {}
      if (mode === "state" && Math.random() < 0.6) {
        appendStateLine("value endpoint accessed");
      } else if (Math.random() < 0.35) {
        appendStateLine("value endpoint accessed");
      }
      bumpDrift(0.006 + Math.random() * 0.008);
    }
  });

  const init = () => {
    ports.forEach((p) => {
      p.last = Date.now() - Math.random() * 3600000;
    });
    document.body.classList.add("mode-hub");
    if (modeIndicator) modeIndicator.textContent = "mode: hub";
    updateHeadings();
    renderPorts();
    renderHubSummary();
    scheduleHub();
  };

  init();
})();
