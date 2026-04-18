// EEG Image Reconstruction + Robot Control Demo
// Architecture: signal capture -> image reconstruction -> intent decoding -> robot execution

(() => {
  /** @typedef {{ id: string; label: string; icon: string; action: string; prior: number; signature: number[] }} TargetDef */

  /** @type {TargetDef[]} */
  const TARGETS = [
    {
      id: "vacuum",
      label: "机器人扫地",
      icon: "../assets/pages/sweep.png",
      action: "启动扫地路径",
      prior: 1,
      signature: [0.85, 0.3, 0.2],
    },
    {
      id: "mop",
      label: "机器人拖地",
      icon: "../assets/pages/moop.png",
      action: "切换湿拖模式",
      prior: 1,
      signature: [0.2, 0.82, 0.35],
    },
    {
      id: "tea",
      label: "机器人倒茶",
      icon: "../assets/pages/tea.png",
      action: "执行倒茶流程",
      prior: 1,
      signature: [0.22, 0.35, 0.9],
    },
    {
      id: "laundry",
      label: "机器人洗衣",
      icon: "../assets/pages/laundry.png",
      action: "启动洗衣协同",
      prior: 1,
      signature: [0.72, 0.62, 0.25],
    },
  ];

  const state = {
    running: false,
    runToken: 0,
    phase: "未开始",
    rafId: 0,
    t0: 0,
    lastAction: "—",
    highlightId: "",
    selectedSceneIds: [],
    commandQueue: [],
    commandHistory: [],
    activations: new Map(),
    targets: /** @type {TargetDef[]} */ (TARGETS.map((item) => ({ ...item }))),
    runtime: new Map(), // id -> { canvas, ctx, w, h, dpr }
  };

  const $ = (id) => /** @type {HTMLElement | null} */ (document.getElementById(id));

  const el = {
    btnStartStop: $("btnStartStop"),
    sceneGrid: $("sceneGrid"),
    stimState: $("stimState"),
    lastAction: $("lastAction"),
    decodeState: $("decodeState"),
    decodeScene: $("decodeScene"),
    decodeConfidence: $("decodeConfidence"),
    signalCaption: $("signalCaption"),
    commandQueue: $("commandQueue"),
    selectedOrder: $("selectedOrder"),
  };

  if (!el.btnStartStop || !el.stimState || !el.lastAction || !el.sceneGrid || !el.decodeState || !el.decodeScene || !el.decodeConfidence || !el.signalCaption || !el.commandQueue || !el.selectedOrder) {
    return;
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function setPhase(text) {
    state.phase = text;
    el.stimState.textContent = text;
  }

  function setStartButtonText() {
    el.btnStartStop.textContent = state.running ? "停止模拟" : "开始模拟";
  }

  function setLastAction(text) {
    state.lastAction = text;
    el.lastAction.textContent = text;
  }

  function rgb(n) {
    const v = clamp(Math.round(n), 0, 255);
    return `rgb(${v}, ${v}, ${v})`;
  }

  function getTargetById(id) {
    return state.targets.find((item) => item.id === id) || state.targets[0];
  }

  function getSelectedTargets() {
    return state.selectedSceneIds.map((id) => getTargetById(id));
  }

  function updateFixedTaskLabel(target) {
    const node = $(`freqText-${target.id}`);
    if (!node) return;
    node.textContent = `${target.label}：${target.action}`;
  }

  function renderSceneGrid() {
    const scenes = [
      { id: "vacuum", label: "机器人扫地", icon: "../assets/pages/sweep.png", hint: "清扫地面" },
      { id: "mop", label: "机器人拖地", icon: "../assets/pages/moop.png", hint: "湿拖清洁" },
      { id: "tea", label: "机器人倒茶", icon: "../assets/pages/tea.png", hint: "递送饮品" },
      { id: "laundry", label: "机器人洗衣", icon: "../assets/pages/laundry.png", hint: "协同洗衣" },
    ];

    el.sceneGrid.innerHTML = "";

    for (const scene of scenes) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "scene-card";
      button.dataset.sceneId = scene.id;
      const selectedIndex = state.selectedSceneIds.indexOf(scene.id);
      button.setAttribute("aria-pressed", selectedIndex >= 0 ? "true" : "false");
      if (selectedIndex >= 0) {
        button.classList.add("scene-card--selected");
      }

      const img = document.createElement("img");
      img.src = scene.icon;
      img.alt = scene.label;
      img.className = "scene-card__img";

      const overlay = document.createElement("div");
      overlay.className = "scene-card__overlay";
      overlay.innerHTML = `<div class="scene-card__title">${scene.label}</div><div class="scene-card__hint">${scene.hint}</div>`;

      const badge = document.createElement("div");
      badge.className = "scene-card__badge";
      badge.textContent = selectedIndex >= 0 ? `#${selectedIndex + 1}` : "点击选择";

      button.appendChild(img);
      button.appendChild(overlay);
      button.appendChild(badge);

      button.addEventListener("click", () => toggleSceneSelection(scene.id));
      el.sceneGrid.appendChild(button);
    }
  }

  function updateSelectedOrderDisplay() {
    if (!state.selectedSceneIds.length) {
      el.selectedOrder.textContent = "已选顺序：未选择";
      return;
    }

    const orderText = state.selectedSceneIds
      .map((id, index) => `${index + 1}. ${getTargetById(id).label}`)
      .join(" / ");
    el.selectedOrder.textContent = `已选顺序：${orderText}`;
  }

  function toggleSceneSelection(sceneId) {
    const index = state.selectedSceneIds.indexOf(sceneId);
    if (index >= 0) {
      state.selectedSceneIds.splice(index, 1);
    } else {
      state.selectedSceneIds.push(sceneId);
    }

    renderSceneGrid();
    updateSelectedOrderDisplay();
    const selected = getSelectedTargets();
    if (selected.length) {
      setLastAction(`已选择场景：${selected.map((item) => item.label).join(" / ")}`);
      updateDecodePanel(selected[0], 0, selected.length > 1 ? "连续控制待命" : "等待开始");
      el.signalCaption.textContent = `当前选择：${selected.map((item) => item.label).join("、")}`;
    } else {
      setLastAction("已清空选择");
      updateDecodePanel(null, 0, "未选择场景");
      el.signalCaption.textContent = "当前未选择任何场景。";
    }
  }

  function createTargetCard(target) {
    const card = document.createElement("div");
    card.className = "target";
    card.dataset.targetId = target.id;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `${target.label} 自动解码候选`);

    const canvas = document.createElement("canvas");
    canvas.className = "target__canvas";

    const badge = document.createElement("div");
    badge.className = "target__badge";
    badge.innerHTML = '<span class="dot" data-dot="1"></span><span>重建候选</span>';

    const icon = document.createElement("img");
    icon.className = "target__icon";
    icon.src = target.icon;
    icon.alt = `${target.label} 图标`;

    const meta = document.createElement("div");
    meta.className = "target__meta";
    meta.innerHTML = `<div class="target__label">${target.label}</div><div class="target__freq">自动解码</div>`;

    card.appendChild(canvas);
    card.appendChild(icon);
    card.appendChild(badge);
    card.appendChild(meta);

    const onManual = () => triggerAction(target, "manual", 1);
    card.addEventListener("click", onManual);
    card.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        onManual();
      }
    });

    return { card, canvas };
  }

  function setupCanvasForTarget(id, canvas) {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.floor(canvas.clientWidth));
    const h = Math.max(1, Math.floor(canvas.clientHeight));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D not supported");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.runtime.set(id, { canvas, ctx, w, h, dpr });
  }

  function buildSignal(target, phaseIndex) {
    const points = [];
    const n = 160;
    for (let i = 0; i < n; i += 1) {
      const x = i / (n - 1);
      const main = Math.sin((x * 18 + target.signature[0] * 4 + phaseIndex * 0.8) * Math.PI * 2) * 0.18;
      const mid = Math.cos((x * 7 + target.signature[1] * 3 + phaseIndex * 0.4) * Math.PI * 2) * 0.1;
      const fine = Math.sin((x * 42 + target.signature[2] * 5 + phaseIndex * 1.2) * Math.PI * 2) * 0.08;
      const envelope = 0.08 + 0.78 * Math.exp(-Math.pow((x - 0.5) / 0.42, 2));
      const value = 0.5 + (main + mid + fine) * envelope + (Math.random() - 0.5) * 0.03;
      points.push(clamp(value, 0.08, 0.92));
    }
    return points;
  }

  function extractFeatures(points) {
    const mean = points.reduce((sum, value) => sum + value, 0) / Math.max(1, points.length);
    let variance = 0;
    let slopeEnergy = 0;
    for (let i = 0; i < points.length; i += 1) {
      variance += Math.pow(points[i] - mean, 2);
      if (i > 0) slopeEnergy += Math.abs(points[i] - points[i - 1]);
    }
    variance /= Math.max(1, points.length);
    slopeEnergy /= Math.max(1, points.length - 1);
    return [mean, clamp(variance * 6, 0, 1), clamp(slopeEnergy * 5, 0, 1)];
  }

  function cosine(a, b) {
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i += 1) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    if (!na || !nb) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }

  function decodeIntent(feature, activeTarget, orderIndex = 0) {
    const selectedIds = state.selectedSceneIds;
    const scored = state.targets
      .filter((target) => selectedIds.includes(target.id))
      .map((target, index) => {
      const sim = Math.max(0, cosine(feature, target.signature));
      const orderBoost = Math.max(0.4, 1.35 - index * 0.15);
      const directBoost = activeTarget && target.id === activeTarget.id ? 0.35 : 0;
      const score = sim * orderBoost + directBoost + (1 - Math.min(orderIndex, 4) * 0.04);
      return { target, score };
      });

    if (!scored.length) {
      return { target: null, confidence: 0 };
    }

    scored.sort((a, b) => b.score - a.score);
    const top = scored[0];
    const total = scored.reduce((sum, item) => sum + item.score, 0.0001);

    for (const item of scored) {
      state.activations.set(item.target.id, clamp(item.score / total, 0, 1));
    }

    return {
      target: top.target,
      confidence: clamp(0.65 + top.score / total * 0.35, 0, 0.98),
    };
  }

  function triggerAction(target, source, confidence) {
    if (!target) return;
    state.highlightId = target.id;
    const confidenceText = `${Math.round(confidence * 100)}%`;
    setLastAction(`${target.action}（${confidenceText}） <- ${source}`);
  }

  function updateDecodePanel(target, confidence, phaseText) {
    el.decodeState.textContent = phaseText;
    el.decodeScene.textContent = target ? `场景：${target.label}` : "场景：未识别";
    el.decodeConfidence.textContent = `置信度：${Math.round(confidence * 100)}%`;
  }

  function renderCommandQueue() {
    el.commandQueue.innerHTML = "";
    const items = state.commandQueue.length ? state.commandQueue : state.commandHistory.slice(-4);

    if (!items.length) {
      el.commandQueue.innerHTML = '<div class="command-queue__empty">等待连续指令...</div>';
      return;
    }

    for (const item of items) {
      const row = document.createElement("div");
      row.className = `command-item${item.executed ? " command-item--done" : ""}`;
      row.innerHTML = `<div class="command-item__scene">${item.label}</div><div class="command-item__action">${item.action}</div><div class="command-item__meta">${item.status}</div>`;
      el.commandQueue.appendChild(row);
    }
  }

  function paintTarget(target, tSeconds) {
    const rt = state.runtime.get(target.id);
    if (!rt) return;

    const { ctx, w, h } = rt;
    const activation = state.activations.get(target.id) || 0;
    const baseLum = 22;

    ctx.fillStyle = rgb(baseLum);
    ctx.fillRect(0, 0, w, h);

    const bandCount = 10;
    for (let i = 0; i < bandCount; i += 1) {
      const y = (h / bandCount) * i;
      const phase = tSeconds * (1.4 + i * 0.05) + i * 0.8;
      const wave = 0.5 + 0.5 * Math.sin(phase);
      const lum = baseLum + wave * 70 + activation * 35;
      ctx.fillStyle = `rgba(${clamp(lum, 0, 255)}, ${clamp(lum + 8, 0, 255)}, ${clamp(lum + 14, 0, 255)}, 0.42)`;
      ctx.fillRect(0, y, w, h / bandCount + 1);
    }

    const centerGlow = ctx.createRadialGradient(w * 0.5, h * 0.5, 16, w * 0.5, h * 0.5, Math.max(w, h));
    centerGlow.addColorStop(0, `rgba(170, 220, 255, ${0.12 + activation * 0.25})`);
    centerGlow.addColorStop(1, "rgba(4, 10, 20, 0.45)");
    ctx.fillStyle = centerGlow;
    ctx.fillRect(0, 0, w, h);

    const focus = target.id === state.highlightId ? 1 : 0;
    const borderAlpha = 0.2 + activation * 0.6 + focus * 0.2;
    const borderLum = 90 + activation * 145 + focus * 20;
    ctx.strokeStyle = `rgba(${clamp(borderLum, 0, 255)}, ${clamp(borderLum, 0, 255)}, 255, ${clamp(borderAlpha, 0.2, 0.95)})`;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, w - 4, h - 4);
  }

  function loop(nowMs) {
    if (!state.running) return;
    if (!state.t0) state.t0 = nowMs;
    const tSeconds = (nowMs - state.t0) / 1000;
    for (const target of state.targets) {
      paintTarget(target, tSeconds);
    }
    state.rafId = requestAnimationFrame(loop);
  }

  function updateDots(on) {
    for (const dot of document.querySelectorAll(".dot")) {
      dot.classList.toggle("dot--on", on);
    }
  }

  function syncSceneSelection() {
    state.selectedSceneId = el.sceneSelect.value;
  }

  function renderTargets() {
    el.targets.innerHTML = "";
    state.runtime.clear();

    for (const target of state.targets) {
      state.activations.set(target.id, 0.25);
      const { card, canvas } = createTargetCard(target);
      el.targets.appendChild(card);
      setupCanvasForTarget(target.id, canvas);
      paintTarget(target, 0);
    }

  }

  function onResize() {
    for (const target of state.targets) {
      const rt = state.runtime.get(target.id);
      if (!rt) continue;
      setupCanvasForTarget(target.id, rt.canvas);
    }
    for (const target of state.targets) {
      paintTarget(target, 0);
    }
  }

  async function runPipeline(token) {
    const selectedTargets = getSelectedTargets();
    state.commandQueue = selectedTargets.map((target) => ({
      id: target.id,
      label: target.label,
      action: target.action,
      status: "等待解码",
      executed: false,
    }));
    renderCommandQueue();

    if (!selectedTargets.length) {
      setPhase("待机中");
      updateDecodePanel(null, 0, "未选择场景");
      el.signalCaption.textContent = "当前未选择场景，系统保持待机。";
      setLastAction("未选择场景，未下达指令");
      await sleep(220);
      state.running = false;
      setStartButtonText();
      if (state.rafId) cancelAnimationFrame(state.rafId);
      state.rafId = 0;
      updateDots(false);
      return;
    }

    setPhase(`已选择场景：${selectedTargets.map((target) => target.label).join(" / ")}`);
    updateDecodePanel(selectedTargets[0], 0, selectedTargets.length > 1 ? "连续控制待命" : "等待采集");
    el.signalCaption.textContent = `已选择 ${selectedTargets.map((target) => target.label).join("、")}，准备连续解码。`;
    await sleep(260);

    while (state.running && token === state.runToken && state.commandQueue.length) {
      for (const item of state.commandQueue) {
        if (!state.running || token !== state.runToken) break;

        const target = getTargetById(item.id);
        setPhase(`脑中想象：${target.label}`);
        updateDots(true);
        item.status = "脑电捕获中";
        renderCommandQueue();
        el.signalCaption.textContent = `正在连续想象 ${target.label}，系统正在重构并识别下一条指令。`;
        await sleep(420);

        const signal = buildSignal(target, state.commandHistory.length);
        const feature = extractFeatures(signal);

        setPhase(`图像重构：${target.label}`);
        item.status = "图像重构中";
        renderCommandQueue();
        await sleep(260);

        const result = decodeIntent(feature, target, state.commandHistory.length);
        setPhase(`解码成功：${result.target.label}`);
        item.status = `已执行，置信度 ${Math.round(result.confidence * 100)}%`;
        item.executed = true;
        state.commandHistory.push({ ...item });
        if (state.commandHistory.length > 6) state.commandHistory.shift();
        state.activations.set(result.target.id, 1);
        triggerAction(result.target, `continuous-${state.commandHistory.length}`, result.confidence);
        updateDecodePanel(result.target, result.confidence, `解码成功 · 第 ${state.commandHistory.length} 条指令`);
        el.signalCaption.textContent = `连续指令 ${state.commandHistory.length}：${result.target.label} 已下达。`;
        renderCommandQueue();
        await sleep(520);

        state.activations.set(result.target.id, 0.42);
        updateDots(false);
        renderSceneGrid();
        updateSelectedOrderDisplay();
      }

      if (state.commandQueue.every((item) => item.executed)) {
        setPhase("连续控制完成");
        setLastAction(`已连续执行 ${state.commandHistory.length} 条指令`);
        el.signalCaption.textContent = `连续决策完成，共执行 ${state.commandHistory.length} 条指令。`;
        await sleep(500);
        state.running = false;
        setStartButtonText();
        if (state.rafId) cancelAnimationFrame(state.rafId);
        state.rafId = 0;
        updateDots(false);
        break;
      }
    }
  }

  function startPipeline() {
    if (state.running) return;
    state.running = true;
    state.t0 = 0;
    state.runToken += 1;
    setStartButtonText();
    const selected = getSelectedTargets();
    setLastAction(selected.length ? `已选择场景：${selected.map((item) => item.label).join(" / ")}` : "未选择场景，待机中");
    renderCommandQueue();
    state.rafId = requestAnimationFrame(loop);
    void runPipeline(state.runToken);
  }

  function stopPipeline() {
    if (!state.running) return;
    state.running = false;
    state.runToken += 1;
    setPhase("未开始");
    setStartButtonText();
    setLastAction("流程已停止");
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.rafId = 0;
    updateDots(false);
    renderCommandQueue();
    const selected = getSelectedTargets();
    updateDecodePanel(selected[0] || null, 0, selected.length ? "等待开始" : "未选择场景");
  }

  function bindUi() {
    el.btnStartStop.addEventListener("click", () => {
      if (state.running) stopPipeline();
      else startPipeline();
    });

    window.addEventListener("resize", onResize);

    window.addEventListener("keydown", (ev) => {
      if (ev.target && /** @type {HTMLElement} */ (ev.target).tagName === "INPUT") return;
      if (ev.key === "1") triggerAction(state.targets[0], "hotkey", 0.95);
      if (ev.key === "2") triggerAction(state.targets[1], "hotkey", 0.95);
      if (ev.key === "3") triggerAction(state.targets[2], "hotkey", 0.95);
      if (ev.key === "4") triggerAction(state.targets[3], "hotkey", 0.95);
      if (ev.key === "Escape" && state.running) stopPipeline();
    });
  }

  function init() {
    renderSceneGrid();
    updateSelectedOrderDisplay();
    renderCommandQueue();
    bindUi();

    for (const target of state.targets) {
      updateFixedTaskLabel(target);
    }

    setPhase("未开始");
    setStartButtonText();
    const selected = getSelectedTargets();
    updateDecodePanel(selected[0] || null, 0, selected.length ? "等待开始" : "未选择场景");
    el.signalCaption.textContent = selected.length ? `当前选择：${selected.map((item) => item.label).join("、")}` : "当前未选择任何场景。";
    setLastAction("系统准备就绪");
  }

  init();
})();
