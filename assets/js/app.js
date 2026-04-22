// EEG image reconstruction -> scene recognition -> smart-home sequential execution demo

(() => {
  const SCENES = [
    {
      id: "morning-living-room",
      image: "../assets/pages/morning.jpeg",
      label: "早晨客厅",
      roomType: "客厅",
      timeOfDay: "早晨",
      confidence: 96,
      actions: ["打开窗帘", "打开空气加湿器", "扫地机器人开始工作", "电视打开播放新闻"],
    },
    {
      id: "night-living-room",
      image: "../assets/pages/night.jpeg",
      label: "夜晚客厅",
      roomType: "客厅",
      timeOfDay: "夜晚",
      confidence: 94,
      actions: ["关闭窗帘", "电视打开播放娱乐节目", "打开空调"],
    },
    {
      id: "morning-bedroom",
      image: "../assets/pages/morning_2.jpeg",
      label: "早晨卧室",
      roomType: "卧室",
      timeOfDay: "早晨",
      confidence: 95,
      actions: ["打开窗帘", "扫地机器人开始工作", "打开空气加湿器"],
    },
    {
      id: "night-bedroom",
      image: "../assets/pages/night_2.jpeg",
      label: "夜晚卧室",
      roomType: "卧室",
      timeOfDay: "夜晚",
      confidence: 97,
      actions: ["关闭窗帘", "打开空调", "打开小夜灯"],
    },
  ];

  const SCENE_MAP = new Map(SCENES.map((scene) => [scene.id, scene]));

  const state = {
    selectedSceneId: "",
    processStatus: "未开始",
    currentStepIndex: -1,
    completedSteps: [],
    isRunning: false,
    runToken: 0,
    lastAction: "系统准备就绪",
  };

  const $ = (id) => document.getElementById(id);

  const el = {
    btnStartStop: $("btnStartStop"),
    btnStop: $("btnStop"),
    sceneGrid: $("sceneGrid"),
    stimState: $("stimState"),
    lastAction: $("lastAction"),
    decodeState: $("decodeState"),
    decodeScene: $("decodeScene"),
    decodeMeta: $("decodeMeta"),
    decodeConfidence: $("decodeConfidence"),
    signalCaption: $("signalCaption"),
    commandQueue: $("commandQueue"),
    selectedOrder: $("selectedOrder"),
  };

  if (
    !el.btnStartStop ||
    !el.btnStop ||
    !el.sceneGrid ||
    !el.stimState ||
    !el.lastAction ||
    !el.decodeState ||
    !el.decodeScene ||
    !el.decodeMeta ||
    !el.decodeConfidence ||
    !el.signalCaption ||
    !el.commandQueue ||
    !el.selectedOrder
  ) {
    return;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function getSelectedScene() {
    return SCENE_MAP.get(state.selectedSceneId) || null;
  }

  function formatSelectedSummary(scene) {
    if (!scene) return "当前识别场景：未选择";

    if (state.isRunning && state.currentStepIndex >= 0) {
      return `当前识别场景：${scene.label} · 当前执行：第 ${state.currentStepIndex + 1} / ${scene.actions.length} 步`;
    }

    if (state.processStatus === "已完成") {
      return `当前识别场景：${scene.label} · 执行完成，共 ${scene.actions.length} 条指令`;
    }

    return `当前识别场景：${scene.label} · ${scene.actions.length} 条指令待执行`;
  }

  function setStatus(text) {
    state.processStatus = text;
    el.stimState.textContent = text;
  }

  function setLastAction(text) {
    state.lastAction = text;
    el.lastAction.textContent = text;
  }

  function updateStartButton() {
    el.btnStartStop.textContent = state.isRunning ? "执行中" : "开始模拟";
    el.btnStartStop.disabled = state.isRunning || !state.selectedSceneId;
  }

  function updateStopButton() {
    el.btnStop.textContent = "停止";
    el.btnStop.disabled = !state.isRunning;
  }

  function updateDecodePanel() {
    const scene = getSelectedScene();

    if (!scene) {
      el.decodeState.textContent = state.processStatus === "未开始" ? "等待开始" : state.processStatus;
      el.decodeScene.textContent = "未选择场景";
      el.decodeMeta.textContent = "类型：— | 时间：—";
      el.decodeConfidence.textContent = "置信度：0%";
      return;
    }

    if (state.processStatus === "识别中") {
      el.decodeState.textContent = "识别中";
    } else if (state.processStatus === "执行中") {
      el.decodeState.textContent = "执行中";
    } else if (state.processStatus === "已完成") {
      el.decodeState.textContent = "执行完成";
    } else {
      el.decodeState.textContent = "已识别";
    }

    el.decodeScene.textContent = `场景：${scene.label}`;
    el.decodeMeta.textContent = `类型：${scene.roomType} | 时间：${scene.timeOfDay}`;
    el.decodeConfidence.textContent = `置信度：${scene.confidence}%`;
  }

  function updateSelectedSummary() {
    el.selectedOrder.textContent = formatSelectedSummary(getSelectedScene());
  }

  function updateCaption() {
    const scene = getSelectedScene();

    if (!scene) {
      el.signalCaption.textContent = "等待选择重构图像。";
      return;
    }

    if (state.isRunning && state.processStatus === "识别中") {
      el.signalCaption.textContent = `正在对 ${scene.label} 进行场景识别，请稍候。`;
      return;
    }

    if (state.isRunning && state.processStatus === "执行中") {
      const currentAction = scene.actions[state.currentStepIndex] || "等待下一步指令";
      el.signalCaption.textContent = `系统正在按顺序执行 ${scene.label} 的家居控制指令：${currentAction}。`;
      return;
    }

    if (state.processStatus === "已完成") {
      el.signalCaption.textContent = `${scene.label} 对应的家居控制指令已全部执行完成。`;
      return;
    }

    el.signalCaption.textContent = `已加载 ${scene.label} 的重构结果，点击“开始模拟”即可执行。`;
  }

  function renderSceneGrid() {
    el.sceneGrid.innerHTML = "";

    for (const scene of SCENES) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "scene-card";
      button.setAttribute("aria-pressed", scene.id === state.selectedSceneId ? "true" : "false");
      if (scene.id === state.selectedSceneId) {
        button.classList.add("scene-card--selected");
      }

      const image = document.createElement("img");
      image.className = "scene-card__img";
      image.src = scene.image;
      image.alt = scene.label;

      const overlay = document.createElement("div");
      overlay.className = "scene-card__overlay";
      overlay.innerHTML = `<div class="scene-card__title">${scene.label}</div><div class="scene-card__hint">${scene.timeOfDay} · ${scene.roomType}</div>`;

      button.append(image, overlay);
      button.addEventListener("click", () => selectScene(scene.id));
      el.sceneGrid.appendChild(button);
    }
  }

  function renderCommandQueue() {
    el.commandQueue.innerHTML = "";
    const scene = getSelectedScene();

    if (!scene) {
      el.commandQueue.innerHTML = '<div class="command-queue__empty">等待选择重构图像</div>';
      return;
    }

    scene.actions.forEach((action, index) => {
      const done = state.completedSteps.includes(index);
      const active = state.isRunning && state.currentStepIndex === index && !done;
      const status = done ? "done" : active ? "active" : "waiting";

      const item = document.createElement("div");
      item.className = `command-item command-item--${status}`;
      item.innerHTML = `
        <div class="command-item__scene">步骤 ${index + 1}</div>
        <div class="command-item__action">${action}</div>
        <div class="command-item__meta"><span>${scene.label}</span><span>${done ? "已完成" : active ? "执行中" : "等待执行"}</span></div>
      `;
      el.commandQueue.appendChild(item);
    });
  }

  function renderAll() {
    updateStartButton();
    updateStopButton();
    updateDecodePanel();
    updateSelectedSummary();
    updateCaption();
    renderSceneGrid();
    renderCommandQueue();
    el.stimState.textContent = state.processStatus;
    el.lastAction.textContent = state.lastAction;
  }

  function stopExecution(message = "流程已停止") {
    state.runToken += 1;
    state.isRunning = false;
    state.currentStepIndex = -1;
    state.processStatus = state.selectedSceneId ? "待执行" : "未开始";
    setLastAction(message);
    renderAll();
  }

  function selectScene(sceneId) {
    const scene = SCENE_MAP.get(sceneId);
    if (!scene) return;

    if (state.isRunning) {
      stopExecution("已停止当前流程，切换到新场景");
    }

    state.selectedSceneId = scene.id;
    state.currentStepIndex = -1;
    state.completedSteps = [];
    state.processStatus = "待执行";
    state.lastAction = `已识别场景：${scene.label}`;
    renderAll();
  }

  async function startSimulation() {
    const scene = getSelectedScene();
    if (!scene || state.isRunning) return;

    state.runToken += 1;
    const token = state.runToken;
    state.isRunning = true;
    state.currentStepIndex = -1;
    state.completedSteps = [];
    state.processStatus = "识别中";
    setLastAction(`正在识别场景：${scene.label}`);
    renderAll();

    await sleep(1100);
    if (token !== state.runToken || !state.isRunning) return;

    state.processStatus = "执行中";
    setLastAction(`识别完成：${scene.label}`);
    renderAll();

    await sleep(360);

    for (let index = 0; index < scene.actions.length; index += 1) {
      if (token !== state.runToken || !state.isRunning) return;

      state.currentStepIndex = index;
      state.processStatus = "执行中";
      setLastAction(`执行第 ${index + 1} 步：${scene.actions[index]}`);
      renderAll();

      await sleep(1200);
      if (token !== state.runToken || !state.isRunning) return;

      if (!state.completedSteps.includes(index)) {
        state.completedSteps.push(index);
      }
      renderAll();

      if (index < scene.actions.length - 1) {
        await sleep(250);
      }
    }

    if (token !== state.runToken) return;

    state.isRunning = false;
    state.currentStepIndex = -1;
    state.processStatus = "已完成";
    setLastAction(`执行完成：${scene.label}`);
    renderAll();
  }

  function bindUi() {
    el.btnStartStop.addEventListener("click", () => {
      void startSimulation();
    });

    el.btnStop.addEventListener("click", () => {
      stopExecution("流程已停止");
    });

    window.addEventListener("keydown", (ev) => {
      if (ev.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(ev.target.tagName)) {
        return;
      }

      if (ev.key === "1") selectScene(SCENES[0].id);
      if (ev.key === "2") selectScene(SCENES[1].id);
      if (ev.key === "3") selectScene(SCENES[2].id);
      if (ev.key === "4") selectScene(SCENES[3].id);
      if (ev.key === "Enter" && !state.isRunning && state.selectedSceneId) void startSimulation();
      if (ev.key === "Escape") stopExecution("流程已停止");
    });
  }

  function init() {
    bindUi();
    renderAll();

    state.processStatus = state.selectedSceneId ? "待执行" : "未开始";
    state.lastAction = "系统准备就绪";
    renderAll();
  }

  init();
})();
