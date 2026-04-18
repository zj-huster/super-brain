(() => {
  const ids = {
    riskBadge: document.getElementById("riskBadge"),
    riskList: document.getElementById("riskList"),
    riskNote: document.getElementById("riskNote"),
    weekTable: document.getElementById("weekTable"),
    healthAnalysisCanvas: document.getElementById("healthAnalysisCanvas"),
  };

  if (!ids.riskBadge || !ids.riskList || !ids.riskNote || !ids.weekTable || !ids.healthAnalysisCanvas) {
    return;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function avg(list, key) {
    return list.reduce((sum, item) => sum + item[key], 0) / list.length;
  }

  function createWeekHealthData() {
    const result = [];
    const now = new Date();

    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);

      const stress = clamp(Math.round(48 + Math.random() * 36 + (i < 2 ? 8 : 0)), 30, 95);
      const emotion = clamp(Math.round(76 - stress * 0.38 + (Math.random() - 0.5) * 12), 22, 94);
      const sleepScore = clamp(Math.round(82 - stress * 0.34 + (Math.random() - 0.5) * 10), 35, 96);
      const eegActivity = clamp(Math.round(68 - stress * 0.24 + (Math.random() - 0.5) * 14), 35, 94);
      const rhythmStability = clamp(Math.round(72 - stress * 0.18 + (Math.random() - 0.5) * 10), 42, 96);

      result.push({
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        emotion,
        eegActivity,
        sleepScore,
        rhythmStability,
      });
    }

    return result;
  }

  function sleepLabel(score) {
    if (score >= 80) return "良好";
    if (score >= 65) return "一般";
    return "欠佳";
  }

  function renderWeekTable(weekData) {
    const tbody = ids.weekTable.querySelector("tbody");
    if (!tbody) return;

    tbody.innerHTML = "";
    weekData.forEach((item) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.date}</td>
        <td>${item.emotion} / 100</td>
        <td>${item.eegActivity} / 100</td>
        <td>${item.sleepScore}（${sleepLabel(item.sleepScore)}）</td>
        <td>${item.rhythmStability} / 100</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function drawRadarChart(weekData) {
    const canvas = ids.healthAnalysisCanvas;
    const ctx = canvas.getContext("2d");
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const width = Math.max(280, Math.floor(canvas.clientWidth));
    const height = Math.max(220, Math.floor(canvas.clientHeight));
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = width * 0.5;
    const cy = height * 0.52;
    const radius = Math.min(width, height) * 0.35;

    const metrics = [
      { label: "情感", value: avg(weekData, "emotion") },
      { label: "活跃", value: avg(weekData, "eegActivity") },
      { label: "睡眠", value: avg(weekData, "sleepScore") },
      { label: "稳定", value: avg(weekData, "rhythmStability") },
    ];

    const normalBaseline = [
      { label: "情感", value: 75 },
      { label: "活跃", value: 72 },
      { label: "睡眠", value: 78 },
      { label: "稳定", value: 74 },
    ];

    ctx.clearRect(0, 0, width, height);

    for (let level = 1; level <= 5; level += 1) {
      const r = (radius / 5) * level;
      ctx.beginPath();
      metrics.forEach((_, i) => {
        const angle = -Math.PI / 2 + (i * Math.PI * 2) / metrics.length;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.strokeStyle = "rgba(148,163,184,0.22)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    metrics.forEach((m, i) => {
      const angle = -Math.PI / 2 + (i * Math.PI * 2) / metrics.length;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.strokeStyle = "rgba(96,165,250,0.28)";
      ctx.stroke();

      const labelX = cx + Math.cos(angle) * (radius + 18);
      const labelY = cy + Math.sin(angle) * (radius + 18);
      ctx.fillStyle = "rgba(226,232,240,0.92)";
      ctx.font = "12px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(m.label, labelX, labelY);
    });

    ctx.save();
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    normalBaseline.forEach((m, i) => {
      const valueR = (clamp(m.value, 0, 100) / 100) * radius;
      const angle = -Math.PI / 2 + (i * Math.PI * 2) / normalBaseline.length;
      const x = cx + Math.cos(angle) * valueR;
      const y = cy + Math.sin(angle) * valueR;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = "rgba(134, 239, 172, 0.95)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "rgba(134, 239, 172, 0.96)";
    ctx.font = "11px 'Segoe UI', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("虚线：正常人参考", 12, 18);

    ctx.beginPath();
    metrics.forEach((m, i) => {
      const valueR = (clamp(m.value, 0, 100) / 100) * radius;
      const angle = -Math.PI / 2 + (i * Math.PI * 2) / metrics.length;
      const x = cx + Math.cos(angle) * valueR;
      const y = cy + Math.sin(angle) * valueR;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(56,189,248,0.28)";
    ctx.strokeStyle = "rgba(56,189,248,0.95)";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    metrics.forEach((m, i) => {
      const valueR = (clamp(m.value, 0, 100) / 100) * radius;
      const angle = -Math.PI / 2 + (i * Math.PI * 2) / metrics.length;
      const x = cx + Math.cos(angle) * valueR;
      const y = cy + Math.sin(angle) * valueR;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(125,211,252,0.98)";
      ctx.fill();
    });
  }

  function evaluateRisk(weekData) {
    const avgEmotion = Math.round(avg(weekData, "emotion"));
    const avgActivity = Math.round(avg(weekData, "eegActivity"));
    const avgSleep = Math.round(avg(weekData, "sleepScore"));
    const avgStability = Math.round(avg(weekData, "rhythmStability"));

    const lowEmotionDays = weekData.filter((d) => d.emotion < 45).length;
    const lowActivityDays = weekData.filter((d) => d.eegActivity < 50).length;
    const poorSleepDays = weekData.filter((d) => d.sleepScore < 65).length;
    const lowStabilityDays = weekData.filter((d) => d.rhythmStability < 55).length;

    let riskScore = 0;
    riskScore += lowEmotionDays >= 3 ? 3 : lowEmotionDays >= 1 ? 1 : 0;
    riskScore += lowActivityDays >= 3 ? 3 : lowActivityDays >= 1 ? 1 : 0;
    riskScore += poorSleepDays >= 3 ? 2 : poorSleepDays >= 1 ? 1 : 0;
    riskScore += lowStabilityDays >= 3 ? 2 : lowStabilityDays >= 1 ? 1 : 0;

    let riskLevel = "低风险";
    let riskClass = "risk-low";
    if (riskScore >= 7) {
      riskLevel = "高风险";
      riskClass = "risk-high";
    } else if (riskScore >= 4) {
      riskLevel = "中风险";
      riskClass = "risk-medium";
    }

    const findings = [];
    if (lowEmotionDays > 0) findings.push(`情感指数偏低天数 ${lowEmotionDays} 天（平均 ${avgEmotion}/100）。`);
    if (lowActivityDays > 0) findings.push(`脑电活跃度偏低天数 ${lowActivityDays} 天（平均 ${avgActivity}/100）。`);
    if (poorSleepDays > 0) findings.push(`睡眠质量欠佳天数 ${poorSleepDays} 天（平均 ${avgSleep} 分）。`);
    if (lowStabilityDays > 0) findings.push(`脑电节律稳定度偏低天数 ${lowStabilityDays} 天（平均 ${avgStability}/100）。`);
    if (findings.length === 0) findings.push("四项指标本周波动处于相对可控范围。");

    ids.riskBadge.textContent = `风险等级：${riskLevel}`;
    ids.riskBadge.className = `risk-badge ${riskClass}`;
    document.querySelector(".risk-box").className = `risk-box ${riskClass}`;
    ids.riskList.innerHTML = findings.map((text) => `<li>${text}</li>`).join("");
    ids.riskNote.textContent = "说明：本评估基于连续 7 天趋势，属于健康筛查建议，不替代医生面对面诊疗。";
  }

  const weekData = createWeekHealthData();
  renderWeekTable(weekData);
  drawRadarChart(weekData);
  evaluateRisk(weekData);

  window.addEventListener("resize", () => {
    drawRadarChart(weekData);
  });
})();
