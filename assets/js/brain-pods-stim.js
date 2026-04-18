(() => {
  const ids = {
    stimModeSleep: document.getElementById("stimModeSleep"),
    stimModeFocus: document.getElementById("stimModeFocus"),
    stimEmbedBlock: document.getElementById("stimEmbedBlock"),
    focusSubSwitch: document.getElementById("focusSubSwitch"),
    focusTypeStudy: document.getElementById("focusTypeStudy"),
    focusTypeMeditation: document.getElementById("focusTypeMeditation"),
    stimLevelLow: document.getElementById("stimLevelLow"),
    stimLevelMedium: document.getElementById("stimLevelMedium"),
    stimLevelHigh: document.getElementById("stimLevelHigh"),
    stimIntensityValue: document.getElementById("stimIntensityValue"),
    stimPlan: document.getElementById("stimPlan"),
    stimEffect: document.getElementById("stimEffect"),
    stimGuide: document.getElementById("stimGuide"),
    stimModeImage: document.getElementById("stimModeImage"),
    stimImageOverlay: document.getElementById("stimImageOverlay"),
    comparisonTitle: document.getElementById("comparisonTitle"),
    beforeMetrics: document.getElementById("beforeMetrics"),
    afterMetrics: document.getElementById("afterMetrics"),
  };

  if (
    !ids.stimModeSleep ||
    !ids.stimModeFocus ||
    !ids.stimEmbedBlock ||
    !ids.focusSubSwitch ||
    !ids.focusTypeStudy ||
    !ids.focusTypeMeditation ||
    !ids.stimLevelLow ||
    !ids.stimLevelMedium ||
    !ids.stimLevelHigh ||
    !ids.stimIntensityValue ||
    !ids.stimPlan ||
    !ids.stimEffect ||
    !ids.stimGuide ||
    !ids.stimModeImage ||
    !ids.stimImageOverlay ||
    !ids.comparisonTitle ||
    !ids.beforeMetrics ||
    !ids.afterMetrics
  ) {
    return;
  }

  const stimState = {
    mode: "sleep",
    focusType: "study",
    level: "low",
  };

  const levelMeta = {
    low: "低强度（20-30 uA，模拟值）",
    medium: "中强度（31-45 uA，模拟值）",
    high: "高强度（46-60 uA，模拟值）",
  };

  const modeProfiles = {
    sleep: {
      low: {
        plan: "方案：低频 0.75-1.5Hz 慢波引导，刺激量最温和。",
        effect: "预期效果：缓解睡前紧张，帮助平稳过渡到放松状态。",
        guide: "建议初次使用者或对刺激敏感人群优先选择；每次 15-20 分钟，建议睡前 30 分钟内使用。",
      },
      medium: {
        plan: "方案：低频 1-2Hz 节律引导，提升慢波同步概率。",
        effect: "预期效果：有助于缩短入睡潜伏期并提高前半夜睡眠连续性。",
        guide: "建议有轻中度入睡困难者使用；每次 20 分钟，每日 1 次，连续 5-7 天观察再调整。",
      },
      high: {
        plan: "方案：低频 1.5-2.5Hz 强化引导，适用于短期状态干预。",
        effect: "预期效果：可进一步降低睡前过度觉醒，但个体差异更明显。",
        guide: "仅建议已耐受低/中挡人群短期使用；每次不超过 15 分钟，出现刺痛、头痛或心悸应立即停止并咨询医生。",
      },
    },
    focus: {
      study: {
        low: {
          plan: "方案：8-10Hz 轻刺激，维持平稳注意状态。",
          effect: "预期效果：降低分心频率，适合日常学习与任务启动阶段。",
          guide: "建议学习开始前或午后轻疲劳时使用；每次 10-15 分钟，搭配 45 分钟工作-10 分钟休息节律。",
        },
        medium: {
          plan: "方案：10-12Hz 中等刺激，增强前额叶执行控制。",
          effect: "预期效果：提升持续注意力与任务切换效率。",
          guide: "建议认知负荷较高任务（阅读、编码、解题）使用；每次 15-20 分钟，每日 1-2 次。",
        },
        high: {
          plan: "方案：12-14Hz 强刺激，强化短时警觉与专注驱动。",
          effect: "预期效果：短时专注提升更明显，但疲劳累积风险上升。",
          guide: "仅建议考试冲刺或高强度任务短时使用；单次不超过 12 分钟，每日最多 1 次，避免晚间使用以免影响入睡。",
        },
      },
      meditation: {
        low: {
          plan: "方案：6-8Hz 温和节律刺激，辅助呼吸放松与内在专注。",
          effect: "预期效果：降低心理噪声，帮助更快进入冥想沉浸状态。",
          guide: "建议冥想前 5 分钟启用；每次 10-15 分钟，搭配 4-6 次/分钟缓慢呼吸。",
        },
        medium: {
          plan: "方案：7-9Hz 中等节律刺激，增强身心同步与稳定觉察。",
          effect: "预期效果：提升冥想连续性，减少中途走神与思绪漂移。",
          guide: "建议有一定冥想基础者使用；每次 15-20 分钟，每日 1 次为宜。",
        },
        high: {
          plan: "方案：8-10Hz 强化节律引导，短时提高沉浸深度。",
          effect: "预期效果：短时静心提升明显，但过强可能导致轻微不适。",
          guide: "仅建议短时使用并避免空腹、疲劳或晚间过晚使用；单次不超过 12 分钟，若不适立即停止。",
        },
      },
    },
  };

  const comparisonData = {
    sleep: {
      low: {
        title: "效能对比 · 使用前后 (助眠模式-低强度)",
        before: [
          { name: "睡眠质量", value: "28%" },
          { name: "脑电活跃度", value: "42%" },
          { name: "δ/θ 波频率", value: "8-12%" },
        ],
        after: [
          { name: "睡眠质量", value: "68%" },
          { name: "脑电活跃度", value: "58%" },
          { name: "δ/θ 波频率", value: "24-36%" },
        ],
      },
      medium: {
        title: "效能对比 · 使用前后 (助眠模式-中强度)",
        before: [
          { name: "睡眠质量", value: "28%" },
          { name: "脑电活跃度", value: "42%" },
          { name: "δ/θ 波频率", value: "8-12%" },
        ],
        after: [
          { name: "睡眠质量", value: "78%" },
          { name: "脑电活跃度", value: "68%" },
          { name: "δ/θ 波频率", value: "32-48%" },
        ],
      },
      high: {
        title: "效能对比 · 使用前后 (助眠模式-高强度)",
        before: [
          { name: "睡眠质量", value: "28%" },
          { name: "脑电活跃度", value: "42%" },
          { name: "δ/θ 波频率", value: "8-12%" },
        ],
        after: [
          { name: "睡眠质量", value: "83%" },
          { name: "脑电活跃度", value: "72%" },
          { name: "δ/θ 波频率", value: "38-54%" },
        ],
      },
    },
    focus: {
      study: {
        low: {
          title: "效能对比 · 使用前后 (专注-学习-低强度)",
          before: [
            { name: "专注度", value: "32%" },
            { name: "脑电活跃度", value: "48%" },
            { name: "α/β 波频率", value: "12-16%" },
          ],
          after: [
            { name: "专注度", value: "70%" },
            { name: "脑电活跃度", value: "62%" },
            { name: "α/β 波频率", value: "28-40%" },
          ],
        },
        medium: {
          title: "效能对比 · 使用前后 (专注-学习-中强度)",
          before: [
            { name: "专注度", value: "32%" },
            { name: "脑电活跃度", value: "48%" },
            { name: "α/β 波频率", value: "12-16%" },
          ],
          after: [
            { name: "专注度", value: "82%" },
            { name: "脑电活跃度", value: "76%" },
            { name: "α/β 波频率", value: "38-54%" },
          ],
        },
        high: {
          title: "效能对比 · 使用前后 (专注-学习-高强度)",
          before: [
            { name: "专注度", value: "32%" },
            { name: "脑电活跃度", value: "48%" },
            { name: "α/β 波频率", value: "12-16%" },
          ],
          after: [
            { name: "专注度", value: "88%" },
            { name: "脑电活跃度", value: "81%" },
            { name: "α/β 波频率", value: "44-60%" },
          ],
        },
      },
      meditation: {
        low: {
          title: "效能对比 · 使用前后 (专注-冥想-低强度)",
          before: [
            { name: "身心放松度", value: "30%" },
            { name: "脑电同步度", value: "44%" },
            { name: "θ/α 波频率", value: "10-14%" },
          ],
          after: [
            { name: "身心放松度", value: "72%" },
            { name: "脑电同步度", value: "64%" },
            { name: "θ/α 波频率", value: "26-38%" },
          ],
        },
        medium: {
          title: "效能对比 · 使用前后 (专注-冥想-中强度)",
          before: [
            { name: "身心放松度", value: "30%" },
            { name: "脑电同步度", value: "44%" },
            { name: "θ/α 波频率", value: "10-14%" },
          ],
          after: [
            { name: "身心放松度", value: "80%" },
            { name: "脑电同步度", value: "73%" },
            { name: "θ/α 波频率", value: "34-50%" },
          ],
        },
        high: {
          title: "效能对比 · 使用前后 (专注-冥想-高强度)",
          before: [
            { name: "身心放松度", value: "30%" },
            { name: "脑电同步度", value: "44%" },
            { name: "θ/α 波频率", value: "10-14%" },
          ],
          after: [
            { name: "身心放松度", value: "85%" },
            { name: "脑电同步度", value: "78%" },
            { name: "θ/α 波频率", value: "40-56%" },
          ],
        },
      },
    },
  };

  function getCurrentProfile() {
    if (stimState.mode === "focus") {
      return modeProfiles.focus[stimState.focusType][stimState.level];
    }
    return modeProfiles.sleep[stimState.level];
  }

  function getCurrentComparison() {
    if (stimState.mode === "focus") {
      return comparisonData.focus[stimState.focusType][stimState.level];
    }
    return comparisonData.sleep[stimState.level];
  }

  function updateComparison() {
    const data = getCurrentComparison();
    ids.comparisonTitle.textContent = data.title;

    ids.beforeMetrics.innerHTML = data.before
      .map(
        (item) =>
          `<div class="metric-row"><span class="metric-name">${item.name}</span><span class="metric-value">${item.value}</span></div>`
      )
      .join("");

    ids.afterMetrics.innerHTML = data.after
      .map(
        (item) =>
          `<div class="metric-row"><span class="metric-name">${item.name}</span><span class="metric-value">${item.value}</span></div>`
      )
      .join("");
  }

  function updateFocusSubtypeUI() {
    const isFocus = stimState.mode === "focus";
    ids.focusSubSwitch.style.display = isFocus ? "block" : "none";
    ids.stimEmbedBlock.classList.toggle("is-tabbed", isFocus);
    ids.focusTypeStudy.classList.toggle("is-active", stimState.focusType === "study");
    ids.focusTypeMeditation.classList.toggle("is-active", stimState.focusType === "meditation");
  }

  function updateModeImage() {
    if (stimState.mode === "sleep") {
      ids.stimModeImage.src = "../assets/pages/brain_sleep.png";
      ids.stimImageOverlay.textContent = "Brain Sleep 非侵入式调节设备 · 示意图";
      return;
    }

    if (stimState.focusType === "meditation") {
      ids.stimModeImage.src = "../assets/pages/brain thinking.png";
      ids.stimImageOverlay.textContent = "Brain Thinking 冥想引导装置 · 示意图";
      return;
    }

    ids.stimModeImage.src = "../assets/pages/brain_working.jpeg";
    ids.stimImageOverlay.textContent = "Brain Working 专注强化装置 · 示意图";
  }

  function updateStimView() {
    updateFocusSubtypeUI();
    ids.stimLevelLow.classList.toggle("is-active", stimState.level === "low");
    ids.stimLevelMedium.classList.toggle("is-active", stimState.level === "medium");
    ids.stimLevelHigh.classList.toggle("is-active", stimState.level === "high");

    const profile = getCurrentProfile();
    ids.stimIntensityValue.textContent = `当前挡位：${levelMeta[stimState.level]}`;
    ids.stimPlan.textContent = profile.plan;
    ids.stimEffect.textContent = profile.effect;
    ids.stimGuide.textContent = profile.guide;
    updateComparison();
  }

  function setStimMode(mode) {
    stimState.mode = mode;
    ids.stimModeSleep.classList.toggle("is-active", mode === "sleep");
    ids.stimModeFocus.classList.toggle("is-active", mode === "focus");
    updateModeImage();
    updateStimView();
  }

  function setFocusType(type) {
    stimState.focusType = type;
    updateModeImage();
    updateStimView();
  }

  function setStimLevel(level) {
    stimState.level = level;
    updateStimView();
  }

  function confirmHighLevel() {
    const modeLabel =
      stimState.mode === "sleep"
        ? "助眠"
        : stimState.focusType === "meditation"
        ? "专注-冥想"
        : "专注-学习";
    const warning =
      `医学警告：你即将进入${modeLabel}模式的高强度刺激。\n\n` +
      "高强度仅建议已适应低/中强度的人群短时使用，可能出现刺痛、头痛、心悸、烦躁或入睡延迟。\n" +
      "如存在癫痫史、心脏起搏器、颅脑损伤、妊娠或正在接受神经精神科治疗，请勿自行使用并先咨询医生。\n\n" +
      "是否确认继续使用高强度刺激？";
    return window.confirm(warning);
  }

  ids.stimModeSleep.addEventListener("click", () => setStimMode("sleep"));
  ids.stimModeFocus.addEventListener("click", () => setStimMode("focus"));
  ids.focusTypeStudy.addEventListener("click", () => setFocusType("study"));
  ids.focusTypeMeditation.addEventListener("click", () => setFocusType("meditation"));
  ids.stimLevelLow.addEventListener("click", () => setStimLevel("low"));
  ids.stimLevelMedium.addEventListener("click", () => setStimLevel("medium"));
  ids.stimLevelHigh.addEventListener("click", () => {
    if (stimState.level === "high") {
      return;
    }
    if (confirmHighLevel()) {
      setStimLevel("high");
    }
  });

  setStimMode("sleep");
})();
