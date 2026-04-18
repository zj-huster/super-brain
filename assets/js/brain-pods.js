(() => {
  const ids = {
    eegCanvas: document.getElementById("eegCanvas"),
    fatigueLevel: document.getElementById("fatigueLevel"),
    fatigueScore: document.getElementById("fatigueScore"),
    timeHint: document.getElementById("timeHint"),
    fatigueSummary: document.getElementById("fatigueSummary"),
    doctorAdvice: document.getElementById("doctorAdvice"),
    avgHeartRate: document.getElementById("avgHeartRate"),
    avgBloodPressure: document.getElementById("avgBloodPressure"),
    avgSpo2: document.getElementById("avgSpo2"),
    avgMood: document.getElementById("avgMood"),
    reportText: document.getElementById("reportText"),
    riskBadge: document.getElementById("riskBadge"),
    riskList: document.getElementById("riskList"),
    riskNote: document.getElementById("riskNote"),
    stimModeSleep: document.getElementById("stimModeSleep"),
    stimModeFocus: document.getElementById("stimModeFocus"),
    stimIntensity: document.getElementById("stimIntensity"),
    stimIntensityValue: document.getElementById("stimIntensityValue"),
    stimPlan: document.getElementById("stimPlan"),
    stimEffect: document.getElementById("stimEffect"),
    weekTable: document.getElementById("weekTable"),
  };

  if (!ids.eegCanvas || !ids.weekTable) {
    return;
  }

  const eeg = {
    ctx: null,
    width: 0,
    height: 0,
    samples: [],
    lastFatigue: 50,
    fatiguePulse: 0,
  };

  const stimState = {
    mode: "sleep",
    intensity: 28,
  };

  const weekData = createWeekHealthData();

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function resizeCanvas() {
    const canvas = ids.eegCanvas;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    eeg.width = rect.width;
    eeg.height = rect.height;
    eeg.ctx = canvas.getContext("2d");
    eeg.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cap = Math.max(90, Math.floor(rect.width / 2));
    eeg.samples = new Array(cap).fill(0);
  }

  function simulateEegValue(timeSec) {
    const hour = new Date().getHours();
    const circadian = hour >= 22 || hour <= 5 ? 0.35 : hour >= 12 && hour <= 14 ? 0.28 : 0.16;
    const theta = Math.sin(2 * Math.PI * 4.5 * timeSec + 0.8) * (0.42 + circadian);
    const alpha = Math.sin(2 * Math.PI * 10.2 * timeSec + 0.3) * (0.36 - circadian * 0.25);
    const beta = Math.sin(2 * Math.PI * 17.5 * timeSec + 1.2) * 0.26;
    const noise = (Math.random() - 0.5) * 0.12;
    return theta + alpha + beta + noise;
  }

  function drawGrid() {
    const { ctx, width, height } = eeg;
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1;

    for (let x = 0; x <= width; x += 24) {
      ctx.strokeStyle = x % 72 === 0 ? "rgba(59,130,246,0.23)" : "rgba(59,130,246,0.1)";
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += 24) {
      ctx.strokeStyle = y % 72 === 0 ? "rgba(34,197,94,0.16)" : "rgba(34,197,94,0.08)";
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  function drawWave() {
    const { ctx, width, height, samples } = eeg;
    const mid = height * 0.5;
    const amp = height * 0.28;

    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(56,189,248,0.95)";
    ctx.beginPath();
    samples.forEach((v, i) => {
      const x = (i / (samples.length - 1)) * width;
      const y = mid - v * amp;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  function updateEeg(nowMs) {
    const timeSec = nowMs / 1000;
    eeg.samples.shift();
    eeg.samples.push(simulateEegValue(timeSec));

    drawGrid();
    drawWave();

    requestAnimationFrame(updateEeg);
  }

  function fatigueByTime(hour) {
    if (hour >= 22 || hour <= 5) return 72;
    if (hour >= 12 && hour <= 14) return 64;
    if (hour >= 6 && hour <= 10) return 42;
    return 51;
  }

  function getTimeReminder(hour) {
    if (hour >= 6 && hour <= 10) {
      return "早晨提醒：当前为早间时段，可饮用 1 杯咖啡（避免空腹）提升警觉度。";
    }
    if (hour >= 11 && hour <= 14) {
      return "中午提醒：建议安排 20-30 分钟午休，优先补偿注意力与反应速度。";
    }
    if (hour >= 22 || hour <= 2) {
      return "夜间提醒：检测到熬夜时段，建议尽早停止高强度学习并准备入睡。";
    }
    return "日间提醒：保持每 50 分钟休息 5-10 分钟，避免持续过载。";
  }

  function doctorAdvice(level) {
    if (level === "高疲劳") {
      return "医生建议：参考睡眠医学门诊建议，连续 3 天高疲劳应减少熬夜，固定作息；若伴随心悸、注意力严重下降，请至神经内科或睡眠专科评估。";
    }
    if (level === "中度疲劳") {
      return "医生建议：适当降低任务密度，增加白天日照和轻度运动，避免下午 3 点后摄入大量咖啡因。";
    }
    return "医生建议：当前疲劳水平可控，保持规律作息与补水，继续观察一周趋势变化。";
  }

  function analyzeFatigue() {
    const hour = new Date().getHours();
    const avgAbs = eeg.samples.reduce((sum, v) => sum + Math.abs(v), 0) / eeg.samples.length;
    const volatility = eeg.samples.reduce((sum, v, i, arr) => {
      if (i === 0) return sum;
      return sum + Math.abs(v - arr[i - 1]);
    }, 0) / (eeg.samples.length - 1);

    const base = fatigueByTime(hour);
    const rhythmPenalty = clamp((avgAbs - 0.28) * 70, -8, 16);
    const jitterPenalty = clamp((0.18 - volatility) * 60, -10, 12);
    eeg.fatiguePulse = clamp(eeg.fatiguePulse + (Math.random() - 0.5) * 4, -6, 6);

    const fatigue = clamp(Math.round(base + rhythmPenalty + jitterPenalty + eeg.fatiguePulse), 18, 95);
    eeg.lastFatigue = fatigue;

    let level = "轻度疲劳";
    if (fatigue >= 72) level = "高疲劳";
    else if (fatigue >= 52) level = "中度疲劳";

    ids.fatigueLevel.textContent = level;
    ids.fatigueScore.textContent = `疲劳指数 ${fatigue} / 100`;
    ids.timeHint.textContent = getTimeReminder(hour);
    ids.fatigueSummary.textContent = `分析结果：当前 Theta 活跃度偏高、节律稳定性${fatigue >= 60 ? "下降" : "良好"}，建议结合作息进行干预。`;
    ids.doctorAdvice.textContent = doctorAdvice(level);
  }

  function createWeekHealthData() {
    const result = [];
    const now = new Date();

    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);

      const stress = clamp(Math.round(52 + Math.random() * 36 + (i < 2 ? 8 : 0)), 35, 95);
      const mood = clamp(Math.round(72 - stress * 0.35 + (Math.random() - 0.5) * 10), 20, 92);
      const social = clamp(Math.round(58 + (Math.random() - 0.5) * 30 - (stress > 75 ? 15 : 0)), 15, 88);

      result.push({
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        hr: clamp(Math.round(72 + (Math.random() - 0.5) * 20 + stress * 0.07), 56, 112),
        bpSys: clamp(Math.round(112 + (Math.random() - 0.5) * 14 + stress * 0.12), 96, 156),
        bpDia: clamp(Math.round(72 + (Math.random() - 0.5) * 10 + stress * 0.08), 58, 102),
        spo2: clamp(Math.round(98 - Math.random() * 3), 93, 100),
        mood,
        stress,
        social,
      });
    }

    return result;
  }

  function avg(list, key) {
    return list.reduce((sum, item) => sum + item[key], 0) / list.length;
  }

  function renderWeekTable() {
    const tbody = ids.weekTable.querySelector("tbody");
    if (!tbody) return;

    tbody.innerHTML = "";
    weekData.forEach((item) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.date}</td>
        <td>${item.hr} bpm</td>
        <td>${item.bpSys}/${item.bpDia}</td>
        <td>${item.spo2}%</td>
        <td>${item.mood}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderHealthReport() {
    const heartRate = Math.round(avg(weekData, "hr"));
    const bpSys = Math.round(avg(weekData, "bpSys"));
    const bpDia = Math.round(avg(weekData, "bpDia"));
    const spo2 = Math.round(avg(weekData, "spo2"));
    const mood = Math.round(avg(weekData, "mood"));
    const stress = Math.round(avg(weekData, "stress"));
    const social = Math.round(avg(weekData, "social"));
    const highStressDays = weekData.filter((d) => d.stress >= 75).length;

    ids.avgHeartRate.textContent = `${heartRate} bpm`;
    ids.avgBloodPressure.textContent = `${bpSys} / ${bpDia}`;
    ids.avgSpo2.textContent = `${spo2}%`;
    ids.avgMood.textContent = `${mood} / 100`;

    ids.reportText.textContent = `周报结论：本周平均压力指数 ${stress}，高压力天数 ${highStressDays} 天。建议优先优化睡眠时长与学习任务分配，必要时进行心理咨询。`;

    const riskItems = [];
    let riskLevel = "低风险";

    if (stress >= 72 || highStressDays >= 4) {
      riskItems.push("压力过大风险：连续高压状态可能导致睡眠受损和注意力下降。");
      riskLevel = "中风险";
    }

    if (mood <= 45) {
      riskItems.push("抑郁倾向风险：持续低情绪与兴趣减退信号偏高，建议尽快进行专业心理评估。");
      riskLevel = "中高风险";
    }

    if (social <= 35 && mood <= 55) {
      riskItems.push("孤独谱系相关风险信号：社交回避与情绪受限特征偏高（仅为筛查提示，需专科进一步评估）。");
      riskLevel = "中高风险";
    }

    if (riskItems.length === 0) {
      riskItems.push("目前未见明显心理高风险信号，建议继续每周追踪情绪与社交指标。");
    }

    ids.riskBadge.textContent = `风险等级：${riskLevel}`;
    ids.riskList.innerHTML = riskItems.map((text) => `<li>${text}</li>`).join("");
    ids.riskNote.textContent = "临床提示：若出现连续两周情绪低落、睡眠障碍或社交退缩，请尽快联系精神心理专科门诊。";
  }

  function updateStimView() {
    const v = Number(ids.stimIntensity.value);
    stimState.intensity = v;
    ids.stimIntensityValue.textContent = `当前强度：${v} uA（微安）`;

    if (stimState.mode === "sleep") {
      ids.stimPlan.textContent = "方案：低频 0.75-1.5Hz 引导慢波节律，建议睡前 20 分钟使用。";
      const settle = clamp(Math.round(16 + v * 0.18), 14, 32);
      ids.stimEffect.textContent = `预期效果：降低过度觉醒，预计入睡准备时间可缩短约 ${settle} 分钟。`;
      return;
    }

    ids.stimPlan.textContent = "方案：中频 8-12Hz 轻刺激，提升前额叶执行功能与持续注意力。";
    const focusBoost = clamp(Math.round(8 + v * 0.22), 10, 28);
    ids.stimEffect.textContent = `预期效果：专注稳定窗口可提升约 ${focusBoost}%（建议每 45 分钟休息）。`;
  }

  function setStimMode(mode) {
    stimState.mode = mode;
    ids.stimModeSleep.classList.toggle("is-active", mode === "sleep");
    ids.stimModeFocus.classList.toggle("is-active", mode === "focus");
    updateStimView();
  }

  function bindEvents() {
    window.addEventListener("resize", resizeCanvas);

    ids.stimModeSleep.addEventListener("click", () => setStimMode("sleep"));
    ids.stimModeFocus.addEventListener("click", () => setStimMode("focus"));
    ids.stimIntensity.addEventListener("input", updateStimView);
  }

  resizeCanvas();
  renderWeekTable();
  renderHealthReport();
  setStimMode("sleep");
  bindEvents();
  analyzeFatigue();
  setInterval(analyzeFatigue, 2200);
  requestAnimationFrame(updateEeg);
})();
