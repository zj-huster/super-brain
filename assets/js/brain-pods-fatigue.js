(() => {
  const ids = {
    eegCanvasLeft: document.getElementById("eegCanvasLeft"),
    eegCanvasRight: document.getElementById("eegCanvasRight"),
    fatigueLevel: document.getElementById("fatigueLevel"),
    fatigueScore: document.getElementById("fatigueScore"),
    timeHint: document.getElementById("timeHint"),
    lrSummary: document.getElementById("lrSummary"),
    fatigueSummary: document.getElementById("fatigueSummary"),
    doctorAdvice: document.getElementById("doctorAdvice"),
    deltaActivity: document.getElementById("deltaActivity"),
    thetaActivity: document.getElementById("thetaActivity"),
    alphaActivity: document.getElementById("alphaActivity"),
    betaActivity: document.getElementById("betaActivity"),
    gammaActivity: document.getElementById("gammaActivity"),
  };

  if (
    !ids.eegCanvasLeft ||
    !ids.eegCanvasRight ||
    !ids.fatigueLevel ||
    !ids.fatigueScore ||
    !ids.timeHint ||
    !ids.lrSummary ||
    !ids.fatigueSummary ||
    !ids.doctorAdvice ||
    !ids.deltaActivity ||
    !ids.thetaActivity ||
    !ids.alphaActivity ||
    !ids.betaActivity ||
    !ids.gammaActivity
  ) {
    return;
  }

  const eeg = {
    left: createChannel(ids.eegCanvasLeft),
    right: createChannel(ids.eegCanvasRight),
    fatiguePulse: 0,
  };

  function createChannel(canvas) {
    return {
      canvas,
      ctx: null,
      width: 0,
      height: 0,
      samples: [],
    };
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function resizeCanvas() {
    resizeChannel(eeg.left);
    resizeChannel(eeg.right);
  }

  function resizeChannel(channel) {
    const rect = channel.canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    channel.canvas.width = Math.floor(rect.width * dpr);
    channel.canvas.height = Math.floor(rect.height * dpr);
    channel.width = rect.width;
    channel.height = rect.height;
    channel.ctx = channel.canvas.getContext("2d");
    channel.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cap = Math.max(90, Math.floor(rect.width / 2));
    channel.samples = new Array(cap).fill(0);
  }

  function simulateEegValue(timeSec, side) {
    const hour = new Date().getHours();
    const circadian = hour >= 22 || hour <= 5 ? 0.35 : hour >= 12 && hour <= 14 ? 0.28 : 0.16;
    const sideShift = side === "left" ? 0.12 : -0.12;
    const theta = Math.sin(2 * Math.PI * (4.4 + sideShift) * timeSec + 0.8) * (0.42 + circadian + (side === "right" ? 0.02 : 0));
    const alpha = Math.sin(2 * Math.PI * (10.2 - sideShift * 0.6) * timeSec + 0.3) * (0.36 - circadian * 0.25 + (side === "left" ? 0.015 : -0.005));
    const beta = Math.sin(2 * Math.PI * 17.5 * timeSec + 1.2) * 0.26;
    const noise = (Math.random() - 0.5) * 0.12;
    return theta + alpha + beta + noise;
  }

  function drawGrid(channel) {
    channel.ctx.clearRect(0, 0, channel.width, channel.height);
    channel.ctx.lineWidth = 1;

    for (let x = 0; x <= channel.width; x += 24) {
      channel.ctx.strokeStyle = x % 72 === 0 ? "rgba(59,130,246,0.23)" : "rgba(59,130,246,0.1)";
      channel.ctx.beginPath();
      channel.ctx.moveTo(x, 0);
      channel.ctx.lineTo(x, channel.height);
      channel.ctx.stroke();
    }

    for (let y = 0; y <= channel.height; y += 24) {
      channel.ctx.strokeStyle = y % 72 === 0 ? "rgba(34,197,94,0.16)" : "rgba(34,197,94,0.08)";
      channel.ctx.beginPath();
      channel.ctx.moveTo(0, y);
      channel.ctx.lineTo(channel.width, y);
      channel.ctx.stroke();
    }
  }

  function drawWave(channel, color) {
    const mid = channel.height * 0.5;
    const amp = channel.height * 0.28;

    channel.ctx.lineWidth = 2;
    channel.ctx.strokeStyle = color;
    channel.ctx.beginPath();
    channel.samples.forEach((v, i) => {
      const x = (i / (channel.samples.length - 1)) * channel.width;
      const y = mid - v * amp;
      if (i === 0) channel.ctx.moveTo(x, y);
      else channel.ctx.lineTo(x, y);
    });
    channel.ctx.stroke();
  }

  function updateEeg(nowMs) {
    const timeSec = nowMs / 1000;
    eeg.left.samples.shift();
    eeg.left.samples.push(simulateEegValue(timeSec, "left"));

    eeg.right.samples.shift();
    eeg.right.samples.push(simulateEegValue(timeSec, "right"));

    drawGrid(eeg.left);
    drawWave(eeg.left, "rgba(34,211,238,0.95)");

    drawGrid(eeg.right);
    drawWave(eeg.right, "rgba(96,165,250,0.95)");

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

  function calculateBrainWaveActivities(avgAbs, volatility, asymmetry) {
    // 基于信号特征的频段活跃度估算
    // Delta (0.5-4 Hz): 最低频，与深度睡眠相关，基于低频成分
    const deltaActivity = clamp(
      (1 - volatility) * 30 + (0.3 - avgAbs) * 40,
      0,
      100
    );

    // Theta (4-8 Hz): 困倦/轻度疲劳，基于中等波动和幅度
    const thetaActivity = clamp(
      volatility * 25 + (avgAbs - 0.2) * 50 + (Math.sin(Date.now() / 1000) + 1) * 15,
      0,
      100
    );

    // Alpha (8-13 Hz): 放松/注意力下降，基于中等幅度和对称性
    const alphaActivity = clamp(
      avgAbs * 80 + (1 - asymmetry * 5) * 20,
      0,
      100
    );

    // Beta (13-30 Hz): 清醒/专注，基于高幅度和高波动
    const betaActivity = clamp(
      volatility * 50 + (avgAbs - 0.25) * 60,
      0,
      100
    );

    // Gamma (>30 Hz): 高级认知，基于信号的高频特性
    const gammaActivity = clamp(
      volatility * 30 + (asymmetry * 100),
      0,
      100
    );

    return {
      delta: Math.round(deltaActivity),
      theta: Math.round(thetaActivity),
      alpha: Math.round(alphaActivity),
      beta: Math.round(betaActivity),
      gamma: Math.round(gammaActivity),
    };
  }

  function updateBrainWaveTable(avgAbs, volatility, asymmetry) {
    const activities = calculateBrainWaveActivities(avgAbs, volatility, asymmetry);
    
    ids.deltaActivity.textContent = `${activities.delta}%`;
    ids.thetaActivity.textContent = `${activities.theta}%`;
    ids.alphaActivity.textContent = `${activities.alpha}%`;
    ids.betaActivity.textContent = `${activities.beta}%`;
    ids.gammaActivity.textContent = `${activities.gamma}%`;
  }

  function analyzeFatigue() {
    const hour = new Date().getHours();
    const leftAvgAbs = eeg.left.samples.reduce((sum, v) => sum + Math.abs(v), 0) / eeg.left.samples.length;
    const rightAvgAbs = eeg.right.samples.reduce((sum, v) => sum + Math.abs(v), 0) / eeg.right.samples.length;

    const leftVolatility = eeg.left.samples.reduce((sum, v, i, arr) => {
      if (i === 0) return sum;
      return sum + Math.abs(v - arr[i - 1]);
    }, 0) / (eeg.left.samples.length - 1);

    const rightVolatility = eeg.right.samples.reduce((sum, v, i, arr) => {
      if (i === 0) return sum;
      return sum + Math.abs(v - arr[i - 1]);
    }, 0) / (eeg.right.samples.length - 1);

    const avgAbs = (leftAvgAbs + rightAvgAbs) * 0.5;
    const volatility = (leftVolatility + rightVolatility) * 0.5;
    const asymmetry = Math.abs(leftAvgAbs - rightAvgAbs);

    const base = fatigueByTime(hour);
    const rhythmPenalty = clamp((avgAbs - 0.28) * 70, -8, 16);
    const jitterPenalty = clamp((0.18 - volatility) * 60, -10, 12);
    const asymmetryPenalty = clamp((asymmetry - 0.035) * 120, -4, 12);
    eeg.fatiguePulse = clamp(eeg.fatiguePulse + (Math.random() - 0.5) * 4, -6, 6);

    const fatigue = clamp(Math.round(base + rhythmPenalty + jitterPenalty + asymmetryPenalty + eeg.fatiguePulse), 18, 95);

    let level = "轻度疲劳";
    if (fatigue >= 72) level = "高疲劳";
    else if (fatigue >= 52) level = "中度疲劳";

    ids.fatigueLevel.textContent = level;
    ids.fatigueScore.textContent = `疲劳指数 ${fatigue} / 100`;
    ids.timeHint.textContent = getTimeReminder(hour);

    let sideTrend = "左右脑节律较为平衡";
    if (leftAvgAbs - rightAvgAbs > 0.045) {
      sideTrend = "左脑通道慢节律负荷更高";
    } else if (rightAvgAbs - leftAvgAbs > 0.045) {
      sideTrend = "右脑通道慢节律负荷更高";
    }

    ids.lrSummary.textContent = `左右脑综合：左脑活跃度 ${(leftAvgAbs * 100).toFixed(1)}，右脑活跃度 ${(rightAvgAbs * 100).toFixed(1)}，${sideTrend}。`;
    ids.fatigueSummary.textContent = `分析结果：双侧 Theta/Alpha/Beta 混合节律${fatigue >= 60 ? "出现疲劳相关波动" : "总体稳定"}，左右差异系数 ${(asymmetry * 100).toFixed(1)}。`;
    ids.doctorAdvice.textContent = doctorAdvice(level);
    updateBrainWaveTable(avgAbs, volatility, asymmetry);
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
  analyzeFatigue();
  setInterval(analyzeFatigue, 2200);
  requestAnimationFrame(updateEeg);
})();
