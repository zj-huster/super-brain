// ========================================
// 运动想象按摩椅控制 - 新版本
// Motor Imagery Massage Chair Control
// ========================================

const state = {
  eegMode: 'idle', // idle, active
  eegBurstUntil: 0,
  activePart: null, // 当前激活的部位
  activeTimer: null
};

const MASSAGE_DURATION_MS = 3000;
const SAMPLE_INTERVAL_MS = 16;

const eegSignal = {
  buffer: [],
  capacity: 0,
  lastSampleAt: 0,
  sampleIndex: 0,
  lastValue: 0,
  spikeCooldown: 0,
  humpRemain: 0,
  humpAmp: 0,
  humpSign: 1,
  chaosPhase: 0
};

// 获取DOM元素
let eegCanvas, eegCtx;
let statusElements = {};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  // 获取EEG canvas
  eegCanvas = document.getElementById('eegCanvas');
  eegCtx = eegCanvas.getContext('2d');
  
  // 获取状态显示元素
  statusElements = {
    eeg: document.getElementById('eegStatus'),
    legs: document.getElementById('statusLegs'),
    arms: document.getElementById('statusArms'),
    neck: document.getElementById('statusNeck')
  };

  // 初始化canvas大小
  resizeEegCanvas();
  window.addEventListener('resize', resizeEegCanvas);

  // 添加按钮点击事件
  const bodyParts = document.querySelectorAll('.body-part');
  bodyParts.forEach(part => {
    part.addEventListener('click', () => {
      const partName = part.dataset.part;
      activateBodyPart(partName, part);
    });
  });

  // 开始EEG渲染循环
  startEegAnimation();
});

// ========================================
// EEG波形渲染
// ========================================

// 激活身体部位
function activateBodyPart(partName, partElement) {
  const prevPart = state.activePart;

  // 点击同一部位时，重新计时
  clearActiveTimer();

  // 确保互斥：切换部位时，先清理之前状态
  if (prevPart && prevPart !== partName) {
    updatePartStatus(prevPart, 'idle');
  }

  document.querySelectorAll('.body-part').forEach(p => {
    p.classList.remove('active');
  });

  partElement.classList.add('active');
  state.activePart = partName;
  state.eegMode = 'active';
  state.eegBurstUntil = Date.now() + MASSAGE_DURATION_MS;

  // 更新状态显示
  const partNames = {
    legs: '大腿按摩',
    arms: '手臂按摩',
    neck: '肩颈按摩'
  };
  
  if (statusElements.eeg) {
    statusElements.eeg.textContent = `激活中(3s) - ${partNames[partName]}`;
  }

  // 更新对应部位的状态
  updatePartStatus(partName, 'active');

  // 2秒后自动取消激活（互斥单任务）
  state.activeTimer = setTimeout(() => {
    if (state.activePart === partName) {
      deactivateBodyPart();
    }
  }, MASSAGE_DURATION_MS);
}

// 取消激活
function deactivateBodyPart() {
  document.querySelectorAll('.body-part').forEach(p => {
    p.classList.remove('active');
  });
  
  const prevPart = state.activePart;
  clearActiveTimer();
  state.activePart = null;
  state.eegMode = 'idle';
  state.eegBurstUntil = 0;
  
  if (statusElements.eeg) {
    statusElements.eeg.textContent = '待命中';
  }

  // 重置所有部位状态
  if (prevPart) {
    updatePartStatus(prevPart, 'idle');
  }
}

function clearActiveTimer() {
  if (state.activeTimer) {
    clearTimeout(state.activeTimer);
    state.activeTimer = null;
  }
}

// 更新部位状态显示
function updatePartStatus(partName, status) {
  const element = statusElements[partName];
  if (!element) return;

  const valueSpan = element.querySelector('.feedback-value');
  if (!valueSpan) return;

  // 移除所有状态类
  element.classList.remove('active');

  if (status === 'active') {
    valueSpan.textContent = '按摩中';
    element.classList.add('active');
    
    // 更新脑电状态显示样式
    if (statusElements.eeg) {
      statusElements.eeg.style.background = 'rgba(99, 102, 241, 0.3)';
      statusElements.eeg.style.borderColor = 'rgba(99, 102, 241, 0.6)';
      statusElements.eeg.style.color = '#e0e7ff';
      statusElements.eeg.style.boxShadow = '0 0 20px rgba(99, 102, 241, 0.4)';
    }
  } else {
    valueSpan.textContent = '待机';
    
    // 恢复脑电状态显示样式
    if (statusElements.eeg) {
      statusElements.eeg.style.background = 'rgba(99, 102, 241, 0.15)';
      statusElements.eeg.style.borderColor = 'rgba(99, 102, 241, 0.3)';
      statusElements.eeg.style.color = '#c7d2fe';
      statusElements.eeg.style.boxShadow = 'none';
    }
  }
}

function resizeEegCanvas() {
  if (!eegCanvas) return;
  const rect = eegCanvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  eegCanvas.width = Math.max(1, Math.floor(rect.width * ratio));
  eegCanvas.height = Math.max(1, Math.floor(rect.height * ratio));
  eegCtx.setTransform(1, 0, 0, 1, 0, 0);
  eegCtx.scale(ratio, ratio);

  eegSignal.capacity = Math.max(80, Math.floor(rect.width / 2));
  eegSignal.buffer = new Array(eegSignal.capacity).fill(0);
  eegSignal.lastSampleAt = performance.now();
  eegSignal.sampleIndex = 0;
  eegSignal.lastValue = 0;
  eegSignal.spikeCooldown = 0;
  eegSignal.humpRemain = 0;
  eegSignal.humpAmp = 0;
  eegSignal.humpSign = 1;
  eegSignal.chaosPhase = 0;
  eegSignal.dcOffset = 0;
}

function nextSmallHump(isActive) {
  if (eegSignal.humpRemain > 0) {
    const phase = 1 - eegSignal.humpRemain / 6;
    const envelope = Math.sin(phase * Math.PI);
    eegSignal.humpRemain -= 1;
    return envelope * eegSignal.humpAmp * eegSignal.humpSign;
  }

  const chance = isActive ? 0.004 : 0.003;
  if (Math.random() < chance) {
    eegSignal.humpRemain = 6;
    eegSignal.humpAmp = isActive ? 0.12 : 0.06;
    eegSignal.humpSign = Math.random() > 0.35 ? 1 : -1;
  }

  return 0;
}

function drawEegGrid(width, height, isActive) {
  // 绘制主网格
  const mainStep = 40;
  const subStep = 10;
  
  // 子网格（更细腻）
  eegCtx.strokeStyle = isActive ? 'rgba(99, 102, 241, 0.08)' : 'rgba(71, 85, 105, 0.08)';
  eegCtx.lineWidth = 0.5;
  
  for (let x = 0; x <= width; x += subStep) {
    if (x % mainStep !== 0) {
      eegCtx.beginPath();
      eegCtx.moveTo(x, 0);
      eegCtx.lineTo(x, height);
      eegCtx.stroke();
    }
  }
  
  for (let y = 0; y <= height; y += subStep) {
    if (y % mainStep !== 0) {
      eegCtx.beginPath();
      eegCtx.moveTo(0, y);
      eegCtx.lineTo(width, y);
      eegCtx.stroke();
    }
  }
  
  // 主网格（更明显）
  eegCtx.strokeStyle = isActive ? 'rgba(99, 102, 241, 0.2)' : 'rgba(71, 85, 105, 0.15)';
  eegCtx.lineWidth = 1;
  
  for (let x = 0; x <= width; x += mainStep) {
    eegCtx.beginPath();
    eegCtx.moveTo(x, 0);
    eegCtx.lineTo(x, height);
    eegCtx.stroke();
  }
  
  for (let y = 0; y <= height; y += mainStep) {
    eegCtx.beginPath();
    eegCtx.moveTo(0, y);
    eegCtx.lineTo(width, y);
    eegCtx.stroke();
  }
}

function clampValue(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function generateEegSample(timeSec, isActive) {
  let sampleRaw;
  const hump = nextSmallHump(isActive);

  if (isActive) {
    // 触发态：高频率 + 剧烈振幅变化 + 对称居中
    const phaseJitter = (Math.random() - 0.5) * 0.6;
    
    // 剧烈变化的振幅调制（1.5-2.5倍变化）
    const ampModFast = 1.0 + 0.75 * Math.sin(2 * Math.PI * 2.8 * timeSec + 0.3);
    const ampModSlow = 1.0 + 0.5 * Math.sin(2 * Math.PI * 0.8 * timeSec + 1.2);
    const ampMod = ampModFast * ampModSlow;

    eegSignal.chaosPhase += (Math.random() - 0.5) * 0.2;
    eegSignal.chaosPhase = clampValue(eegSignal.chaosPhase, -2.0, 2.0);

    // 增加频率：alpha 10.2→15Hz, beta 18.6→28Hz, gamma 28.4→42Hz
    const alpha = Math.sin(2 * Math.PI * 15 * timeSec + 0.2 + phaseJitter) * 1.2;
    const beta = Math.sin(2 * Math.PI * 28 * timeSec + 0.6 - phaseJitter * 0.7) * 0.65;
    const gamma = Math.sin(2 * Math.PI * 42 * timeSec + eegSignal.chaosPhase) * 0.45;
    const theta = Math.sin(2 * Math.PI * 7.5 * timeSec + 1.1 + phaseJitter * 0.5) * 0.3;
    const highFreq = Math.sin(2 * Math.PI * 35 * timeSec + eegSignal.chaosPhase * 1.5) * 0.35;
    
    // 基础波形（所有分量相加后自然居中于0）
    const base = (alpha + beta + theta + gamma + highFreq) * ampMod;

    // 增强峰值变化：非线性放大（更剧烈）
    const peakBoost = Math.sign(base) * Math.pow(Math.abs(base), 1.35) * 0.8;
    
    // 小噪声
    const noise = (Math.random() - 0.5) * 0.06;

    // 随机尖峰（更剧烈，但保持对称性）
    let artifact = 0;
    if (eegSignal.spikeCooldown <= 0 && Math.random() < 0.005) {
      artifact = (Math.random() > 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.4);
      eegSignal.spikeCooldown = 12;
    }

    // 所有分量相加（自然居中）
    sampleRaw = base + peakBoost + noise + artifact + hump;
    
    // 确保居中：减去移动平均来消除直流偏移
    if (!eegSignal.dcOffset) eegSignal.dcOffset = 0;
    eegSignal.dcOffset = eegSignal.dcOffset * 0.995 + sampleRaw * 0.005;
    sampleRaw = sampleRaw - eegSignal.dcOffset;
  } else {
    // 待命态：整体平缓，仅少量毛刺
    const alpha = Math.sin(2 * Math.PI * 9 * timeSec + 0.4) * 0.22;
    const theta = Math.sin(2 * Math.PI * 5 * timeSec + 1.2) * 0.14;
    const beta = Math.sin(2 * Math.PI * 16 * timeSec + 0.9) * 0.06;
    const noise = (Math.random() - 0.5) * 0.018;

    let artifact = 0;
    if (eegSignal.spikeCooldown <= 0 && Math.random() < 0.0015) {
      artifact = (Math.random() > 0.5 ? 1 : -1) * 0.22;
      eegSignal.spikeCooldown = 24;
    }

    sampleRaw = alpha + theta + beta + noise + artifact + hump;
    
    // 待机态也保持居中
    if (!eegSignal.dcOffset) eegSignal.dcOffset = 0;
    eegSignal.dcOffset = eegSignal.dcOffset * 0.998 + sampleRaw * 0.002;
    sampleRaw = sampleRaw - eegSignal.dcOffset;
  }

  if (eegSignal.spikeCooldown > 0) {
    eegSignal.spikeCooldown -= 1;
  }

  // 平滑滤波：激活态更直接（更低平滑=更剧烈变化），待命态更平缓
  const smoothFactor = isActive ? 0.08 : 0.17;
  const sample = eegSignal.lastValue + (sampleRaw - eegSignal.lastValue) * smoothFactor;
  eegSignal.lastValue = sample;

  return sample;
}

function updateEegBuffer(nowMs) {
  if (!eegSignal.capacity) return;

  if (!eegSignal.lastSampleAt) {
    eegSignal.lastSampleAt = nowMs;
  }

  const elapsed = nowMs - eegSignal.lastSampleAt;
  const steps = Math.max(1, Math.floor(elapsed / SAMPLE_INTERVAL_MS));
  const isActive = state.eegMode === 'active' && nowMs < state.eegBurstUntil;

  for (let i = 0; i < steps; i++) {
    const t = (eegSignal.sampleIndex * SAMPLE_INTERVAL_MS) / 1000;
    const sample = generateEegSample(t, isActive);
    eegSignal.buffer.push(sample);
    if (eegSignal.buffer.length > eegSignal.capacity) {
      eegSignal.buffer.shift();
    }
    eegSignal.sampleIndex += 1;
  }

  eegSignal.lastSampleAt = nowMs;
}

function drawEegWave(nowMs) {
  const rect = eegCanvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  const mid = height / 2;
  const isActive = state.eegMode === 'active' && nowMs < state.eegBurstUntil;

  // 背景渐变
  const bgGradient = eegCtx.createLinearGradient(0, 0, 0, height);
  if (isActive) {
    bgGradient.addColorStop(0, 'rgba(30, 27, 75, 1)');
    bgGradient.addColorStop(0.5, 'rgba(15, 23, 42, 1)');
    bgGradient.addColorStop(1, 'rgba(30, 27, 75, 1)');
  } else {
    bgGradient.addColorStop(0, 'rgba(15, 23, 42, 1)');
    bgGradient.addColorStop(0.5, 'rgba(2, 6, 23, 1)');
    bgGradient.addColorStop(1, 'rgba(15, 23, 42, 1)');
  }
  eegCtx.fillStyle = bgGradient;
  eegCtx.fillRect(0, 0, width, height);

  // 绘制网格
  drawEegGrid(width, height, isActive);

  // 中线（基线）
  eegCtx.strokeStyle = isActive ? 'rgba(139, 92, 246, 0.5)' : 'rgba(100, 116, 139, 0.4)';
  eegCtx.lineWidth = 1.5;
  eegCtx.setLineDash([6, 4]);
  eegCtx.beginPath();
  eegCtx.moveTo(0, mid);
  eegCtx.lineTo(width, mid);
  eegCtx.stroke();
  eegCtx.setLineDash([]);

  const amplitudePx = height * 0.24;
  const data = eegSignal.buffer;
  if (!data.length) return;

  // 准备波形数据
  const stepX = data.length > 1 ? width / (data.length - 1) : width;
  const points = [];
  for (let i = 0; i < data.length; i++) {
    const x = i * stepX;
    const y = clampValue(mid - data[i] * amplitudePx, 2, height - 2);
    points.push({ x, y });
  }

  // 绘制波形阴影（发光效果）
  if (isActive) {
    eegCtx.shadowColor = 'rgba(99, 102, 241, 0.8)';
    eegCtx.shadowBlur = 12;
    eegCtx.strokeStyle = 'rgba(129, 140, 248, 0.6)';
    eegCtx.lineWidth = 3;
    eegCtx.beginPath();
    points.forEach((p, i) => {
      if (i === 0) eegCtx.moveTo(p.x, p.y);
      else eegCtx.lineTo(p.x, p.y);
    });
    eegCtx.stroke();
  }

  // 绘制主波形
  eegCtx.shadowColor = 'transparent';
  eegCtx.shadowBlur = 0;
  
  // 渐变波形颜色
  const waveGradient = eegCtx.createLinearGradient(0, 0, width, 0);
  if (isActive) {
    waveGradient.addColorStop(0, 'rgba(147, 51, 234, 0.95)');
    waveGradient.addColorStop(0.3, 'rgba(99, 102, 241, 1)');
    waveGradient.addColorStop(0.7, 'rgba(59, 130, 246, 1)');
    waveGradient.addColorStop(1, 'rgba(14, 165, 233, 0.95)');
  } else {
    waveGradient.addColorStop(0, 'rgba(148, 163, 184, 0.85)');
    waveGradient.addColorStop(0.5, 'rgba(100, 116, 139, 0.9)');
    waveGradient.addColorStop(1, 'rgba(148, 163, 184, 0.85)');
  }
  
  eegCtx.strokeStyle = waveGradient;
  eegCtx.lineWidth = isActive ? 2.5 : 2;
  eegCtx.lineCap = 'round';
  eegCtx.lineJoin = 'round';
  
  eegCtx.beginPath();
  points.forEach((p, i) => {
    if (i === 0) eegCtx.moveTo(p.x, p.y);
    else eegCtx.lineTo(p.x, p.y);
  });
  eegCtx.stroke();

  // 填充区域（波形下方）
  if (isActive) {
    const fillGradient = eegCtx.createLinearGradient(0, mid, 0, 0);
    fillGradient.addColorStop(0, 'rgba(99, 102, 241, 0)');
    fillGradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.08)');
    fillGradient.addColorStop(1, 'rgba(147, 51, 234, 0.15)');
    
    eegCtx.fillStyle = fillGradient;
    eegCtx.beginPath();
    eegCtx.moveTo(0, mid);
    points.forEach((p) => eegCtx.lineTo(p.x, p.y));
    eegCtx.lineTo(width, mid);
    eegCtx.closePath();
    eegCtx.fill();
    
    // 镜像填充（下方）
    const fillGradient2 = eegCtx.createLinearGradient(0, mid, 0, height);
    fillGradient2.addColorStop(0, 'rgba(99, 102, 241, 0)');
    fillGradient2.addColorStop(0.5, 'rgba(99, 102, 241, 0.08)');
    fillGradient2.addColorStop(1, 'rgba(14, 165, 233, 0.15)');
    
    eegCtx.fillStyle = fillGradient2;
    eegCtx.beginPath();
    eegCtx.moveTo(0, mid);
    points.forEach((p) => eegCtx.lineTo(p.x, 2 * mid - p.y));
    eegCtx.lineTo(width, mid);
    eegCtx.closePath();
    eegCtx.fill();
  }

  // 顶部活跃指示条
  if (isActive) {
    const indicatorGradient = eegCtx.createLinearGradient(0, 0, width, 0);
    indicatorGradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
    indicatorGradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.6)');
    indicatorGradient.addColorStop(1, 'rgba(99, 102, 241, 0.3)');
    eegCtx.fillStyle = indicatorGradient;
    eegCtx.fillRect(0, 0, width, 3);
    eegCtx.fillRect(0, height - 3, width, 3);
  }
  
  // 添加扫描线效果
  const scanLinePosition = (nowMs / 20) % width;
  const scanGradient = eegCtx.createLinearGradient(scanLinePosition - 30, 0, scanLinePosition + 30, 0);
  scanGradient.addColorStop(0, 'rgba(99, 102, 241, 0)');
  scanGradient.addColorStop(0.5, isActive ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.06)');
  scanGradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
  eegCtx.fillStyle = scanGradient;
  eegCtx.fillRect(scanLinePosition - 30, 0, 60, height);
}

// ========================================
// 动画循环
// ========================================

let eegAnimationId = null;

function startEegAnimation() {
  function animate() {
    const now = performance.now();
    const nowDate = Date.now();

    // 如果时间到了但状态还是active，重置状态
    if (state.eegMode === 'active' && nowDate >= state.eegBurstUntil) {
      deactivateBodyPart();
    }

    updateEegBuffer(now);
    drawEegWave(nowDate);
    
    eegAnimationId = requestAnimationFrame(animate);
  }

  eegAnimationId = requestAnimationFrame(animate);
}
