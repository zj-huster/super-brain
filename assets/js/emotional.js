(() => {
  // 12通道EEG位置（10-20系统精简）
  const CHANNEL_NAMES = [
    // 额叶
    'Fp1', 'Fp2', 'F3', 'F4',
    // 中央
    'C3', 'C4',
    // 顶叶
    'P3', 'P4',
    // 枕叶
    'O1', 'O2',
    // 颞叶
    'T7', 'T8'
  ];

  const EMOTION_STATES = {
    calm: {
      name: '放松 / 平静',
      class: 'emotion-calm',
      emoji: '😌',
      medical: {
        title: '医学说明',
        description: '在放松或冥想状态下，脑电表现出如下特征：',
        points: [
          'Alpha 波 (8-13Hz) 增强，特别是在后头部区域',
          '前额叶区域的 Beta 波活动相对较低',
          'Theta 波 (4-8Hz) 轻微升高，表示放松的警觉状态',
          '整体脑电活动呈现规律、对称的节律性'
        ]
      }
    },
    neutral: {
      name: '中性 / 清醒',
      class: 'emotion-neutral',
      emoji: '😐',
      medical: {
        title: '医学说明',
        description: '在清醒、专注的正常状态下，脑电特征为：',
        points: [
          'Beta 波 (13-30Hz) 占优，表示认知活动活跃',
          'Alpha 波相对降低，反映注意力集中',
          '前额叶和中央区域的 Beta 活动增加',
          '脑电活动频率相对较快，振幅适中'
        ]
      }
    },
    anxious: {
      name: '焦虑 / 紧张',
      class: 'emotion-anxious',
      emoji: '😰',
      medical: {
        title: '医学说明',
        description: '在焦虑或紧张状态下，脑电出现以下特征：',
        points: [
          'Beta 波（特别是高 Beta 13-30Hz）显著增强',
          'Alpha 波减弱，反映警惕性升高',
          '前额叶皮层激活度明显增加',
          '脑电波形不规则，振幅易波动',
          '可能出现肌肉紧张伪迹 (EMG artifact)'
        ]
      }
    },
    stressed: {
      name: '压力 / 疲劳',
      class: 'emotion-stressed',
      emoji: '😩',
      medical: {
        title: '医学说明',
        description: '在高压力或疲劳状态下，脑电表现：',
        points: [
          'Theta 波 (4-8Hz) 显著增强，特别是在颞叶和中线区域',
          'Alpha 波减弱或消失',
          '脑电整体振幅下降，节律性变差',
          '可能出现 Delta 波 (1-4Hz) 的异常增加',
          '反映认知资源耗尽和疲劳程度'
        ]
      }
    }
  };

  // 状态管理
  const state = {
    running: false,
    channels: new Map(),
    emotionHistory: [],
    bandPowers: { alpha: 0, beta: 0, theta: 0, delta: 0 },
    currentEmotion: 'neutral',
    sampleRate: 250, // Hz
    bufferSize: 4096, // 样本数 - 大幅延长波形显示
    t: 0,
    // 生命体征数据
    vitals: {
      spo2: 98,
      sys: 112,
      dia: 72,
      hr: 78,
      lastVitalsUpdate: 0
    }
  };

  // UI 元素
  const el = {
    channels: document.getElementById('channels'),
    emotionState: document.getElementById('emotionState'),
    medicalInfo: document.getElementById('medicalInfo'),
    alphaVal: document.getElementById('alphaVal'),
    betaVal: document.getElementById('betaVal'),
    thetaVal: document.getElementById('thetaVal'),
    deltaVal: document.getElementById('deltaVal'),
    status: document.getElementById('status'),
    btnStart: document.getElementById('btnStart'),
    btnStop: document.getElementById('btnStop'),
    // 生命体征
    spo2Val: document.getElementById('spo2Val'),
    bpVal: document.getElementById('bpVal'),
    hrVal: document.getElementById('hrVal'),
    spo2Badge: document.getElementById('spo2Badge'),
    bpBadge: document.getElementById('bpBadge'),
    hrBadge: document.getElementById('hrBadge')
  };

  // 初始化通道 - 使用 canvas 绘制波形
  function initChannels() {
    el.channels.innerHTML = '';
    state.channels.clear();

    // 获取容器宽度用于计算canvas宽度
    const containerWidth = el.channels.clientWidth;
    // 预留标签宽度(38px) + 间距(6px) + padding(12px) + 滚动条(8px) = 64px
    const canvasWidth = Math.max(220, containerWidth - 64);

    for (const name of CHANNEL_NAMES) {
      const container = document.createElement('div');
      container.className = 'channel';

      const nameEl = document.createElement('div');
      nameEl.className = 'channel__name';
      nameEl.textContent = name;

      const canvas = document.createElement('canvas');
      canvas.className = 'channel__canvas';
      canvas.width = canvasWidth;
      canvas.height = 34;

      container.appendChild(nameEl);
      container.appendChild(canvas);

      el.channels.appendChild(container);

      // 初始化该通道的缓冲区 - 使用更大的缓冲区以显示更长的波形
      const buffer = new Float32Array(state.bufferSize);
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = 0;
      }

      state.channels.set(name, {
        container,
        canvas,
        ctx: canvas.getContext('2d'),
        buffer,
        writePtr: 0,
        currentValue: 0
      });
    }
  }

  // 绘制单个通道波形
  function drawChannelWaveform(channelData) {
    const { canvas, ctx, buffer, writePtr } = channelData;

    const w = canvas.width;
    const h = canvas.height;
    const centerY = h / 2;

    // 清空
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, w, h);

    // 绘制中轴线
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(w, centerY);
    ctx.stroke();

    // 绘制波形
    ctx.strokeStyle = '#6ff0c1';
    ctx.lineWidth = 1.8;
    ctx.beginPath();

    // 从缓冲区绘制波形 (从最旧到最新)
    const step = Math.max(1, Math.floor(buffer.length / w));
    let first = true;

    for (let i = 0; i < w; i++) {
      const bufIdx = (writePtr + i * step) % buffer.length;
      const val = buffer[bufIdx];
      // 略微增强振幅，使波形更清晰
      const amplitude = centerY - 1.5;
      const y = centerY - (val / 24) * amplitude;
      const x = i;

      if (first) {
        ctx.moveTo(x, Math.max(2, Math.min(h - 2, y)));
        first = false;
      } else {
        ctx.lineTo(x, Math.max(2, Math.min(h - 2, y)));
      }
    }
    ctx.stroke();
  }

  // ========== 生命体征相关函数 ==========
  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function stepValue(current, min, max) {
    const delta = Math.random() < 0.5 ? -1 : 1;
    return clamp(current + delta, min, max);
  }

  function updateVitals() {
    // 每隔大约0.5秒更新一次活力值
    state.vitals.spo2 = stepValue(state.vitals.spo2, 92, 100);
    state.vitals.sys = stepValue(state.vitals.sys, 100, 135);
    state.vitals.dia = stepValue(state.vitals.dia, 60, 90);
    state.vitals.hr = stepValue(state.vitals.hr, 50, 110);

    // 更新UI
    el.spo2Val.textContent = state.vitals.spo2;
    el.bpVal.textContent = `${state.vitals.sys}/${state.vitals.dia}`;
    el.hrVal.textContent = state.vitals.hr;

    // 评估状态并更新badge
    evaluateAndUpdateVitalsBadges();
  }

  function evaluateSpO2(spo2) {
    if (spo2 >= 95) return { label: '正常', class: 'vital-badge-ok' };
    if (spo2 >= 90) return { label: '偏低', class: 'vital-badge-warn' };
    return { label: '低氧', class: 'vital-badge-alert' };
  }

  function evaluateBP(sys, dia) {
    if (sys < 90 || dia < 60) return { label: '偏低', class: 'vital-badge-warn' };
    if (sys <= 120 && dia <= 80) return { label: '正常', class: 'vital-badge-ok' };
    if (sys <= 139 || dia <= 89) return { label: '偏高', class: 'vital-badge-warn' };
    return { label: '高血压', class: 'vital-badge-alert' };
  }

  function evaluateHR(hr) {
    if (hr < 60) return { label: '偏慢', class: 'vital-badge-warn' };
    if (hr <= 100) return { label: '正常', class: 'vital-badge-ok' };
    return { label: '偏快', class: 'vital-badge-warn' };
  }

  function evaluateAndUpdateVitalsBadges() {
    const spo2Eval = evaluateSpO2(state.vitals.spo2);
    const bpEval = evaluateBP(state.vitals.sys, state.vitals.dia);
    const hrEval = evaluateHR(state.vitals.hr);

    // 更新badge
    el.spo2Badge.className = `vital-badge ${spo2Eval.class}`;
    el.spo2Badge.textContent = spo2Eval.label;

    el.bpBadge.className = `vital-badge ${bpEval.class}`;
    el.bpBadge.textContent = bpEval.label;

    el.hrBadge.className = `vital-badge ${hrEval.class}`;
    el.hrBadge.textContent = hrEval.label;
  }

  // 模拟多通道 EEG 数据
  function generateChannelAmplitude(channelName, baseAmp, theta, alpha, beta, delta) {
    // 不同脑区对不同频率波的响应差异加大
    let signal = 0;

    if (channelName.includes('p') || channelName.includes('P')) {
      // Parietal/Posterior: Alpha主导（高响应）
      signal = alpha * 1.2 + beta * 0.15 + theta * 0.1 + delta * 0.05;
    } else if (channelName.includes('f') || channelName.includes('F')) {
      // Frontal: Beta主导（高响应）
      signal = beta * 1.3 + alpha * 0.2 + theta * 0.4 + delta * 0.1;
    } else if (channelName.includes('c') || channelName.includes('C') || channelName.includes('z')) {
      // Central: Theta主导（中等响应）
      signal = theta * 0.8 + beta * 0.5 + alpha * 0.4 + delta * 0.2;
    } else if (channelName.includes('t') || channelName.includes('T')) {
      // Temporal: Delta/Theta混合
      signal = delta * 0.7 + theta * 0.7 + beta * 0.3 + alpha * 0.3;
    } else if (channelName.includes('o') || channelName.includes('O')) {
      // Occipital: Alpha极度主导
      signal = alpha * 1.5 + beta * 0.1 + theta * 0.1 + delta * 0.05;
    }

    // 增加噪声幅度与通道特异性调制
    const noise = (Math.random() - 0.5) * 5.5;
    const channelModulation = Math.sin(state.t * (10 + Math.abs(Math.random() * 20))) * 0.3;
    return signal + noise + channelModulation;
  }

  let smoothAlpha = 20;
  let smoothBeta = 15;
  let smoothTheta = 10;
  let smoothDelta = 5;
  let updateCounter = 0;

  function updateEEG() {
    if (!state.running) return;

    // 每个样本间隔时间 (ms)
    const sampleInterval = 1000 / state.sampleRate;

    // 加速更新速度：每帧更新3个样本，提升3倍波形显示速度
    const updateInterval = 3;

    for (let frame = 0; frame < updateInterval; frame++) {
      state.t += sampleInterval / 1000; // 转换为秒

      // 根据当前情感状态模拟不同的频率分布
      const emotionProfile = {
        calm: { alpha: 25, beta: 12, theta: 10, delta: 5 },
        neutral: { alpha: 15, beta: 20, theta: 8, delta: 5 },
        anxious: { alpha: 8, beta: 28, theta: 12, delta: 6 },
        stressed: { alpha: 5, beta: 15, theta: 25, delta: 10 }
      };

      const currentProfile = emotionProfile[state.currentEmotion];

      // 使用高频率振荡 (4Hz) 实现快速变化
      const slowMod = 0.7 + 0.3 * Math.sin(state.t * Math.PI * 4);

      // 频率成分（大幅加速）
      const theta = currentProfile.theta * slowMod * (0.7 + 0.3 * Math.sin(state.t * 30));
      const alpha = currentProfile.alpha * slowMod * (0.6 + 0.4 * Math.cos(state.t * 45));
      const beta = currentProfile.beta * slowMod * (0.5 + 0.5 * Math.sin(state.t * 80));
      const delta = currentProfile.delta * slowMod * (0.8 + 0.2 * Math.sin(state.t * 15));

      // 平滑更新 - 更快速响应
      smoothAlpha = smoothAlpha * 0.75 + alpha * 0.25;
      smoothBeta = smoothBeta * 0.75 + beta * 0.25;
      smoothTheta = smoothTheta * 0.75 + theta * 0.25;
      smoothDelta = smoothDelta * 0.75 + delta * 0.25;

      // 更新所有通道样本
      for (const [name, channel] of state.channels) {
        const sample = generateChannelAmplitude(name, 10, smoothTheta, smoothAlpha, smoothBeta, smoothDelta);
        
        // 添加到缓冲区
        channel.buffer[channel.writePtr] = sample;
        channel.writePtr = (channel.writePtr + 1) % state.bufferSize;
        channel.currentValue = sample;
      }
    }

    // 保存频率功率
    state.bandPowers = {
      alpha: Math.round(smoothAlpha * 10) / 10,
      beta: Math.round(smoothBeta * 10) / 10,
      theta: Math.round(smoothTheta * 10) / 10,
      delta: Math.round(smoothDelta * 10) / 10
    };

    // 更新所有通道的画布
    for (const [name, channel] of state.channels) {
      drawChannelWaveform(channel);
    }

    // 更新统计信息
    el.alphaVal.textContent = state.bandPowers.alpha.toFixed(1);
    el.betaVal.textContent = state.bandPowers.beta.toFixed(1);
    el.thetaVal.textContent = state.bandPowers.theta.toFixed(1);
    el.deltaVal.textContent = state.bandPowers.delta.toFixed(1);

    // 每隔约 1 秒更新一次生命体征数据
    updateCounter++;
    if (updateCounter % 60 === 0) {
      updateVitals();
    }

    // 每隔 1.5 秒判定情感状态（加速判定）
    if (updateCounter % 90 === 0) {
      classifyEmotion();
    }

    requestAnimationFrame(updateEEG);
  }

  // 情感分类算法 - 降低非健康情感状态的概率
  function classifyEmotion() {
    const { alpha, beta, theta, delta } = state.bandPowers;

    let emotion = 'neutral';

    // 放松: Alpha 高，Beta 低 - 提高倾向，加偏移量
    const calmScore = alpha * 2.0 - beta * 0.4 + 8;

    // 焦虑: Beta 高，Alpha 低 - 提高阈值，降低倾向
    const anxiousScore = beta * 2.2 - alpha * 0.8 - theta * 0.4 - 5;

    // 压力/疲劳: Theta 高，Alpha 低 - 提高阈值，降低倾向
    const stressedScore = theta * 1.9 + delta * 0.9 - alpha * 0.7 - 5;

    // 判定主要情感 - 加大阈值差距，优先健康状态
    if (calmScore > 18 && calmScore > anxiousScore + 3 && calmScore > stressedScore + 3) {
      emotion = 'calm';
    } else if (anxiousScore > 25 && anxiousScore > stressedScore + 2) {
      emotion = 'anxious';
    } else if (stressedScore > 20) {
      emotion = 'stressed';
    } else {
      emotion = 'neutral';
    }

    // 只有当新情感不同时才更新UI
    if (emotion !== state.currentEmotion) {
      state.currentEmotion = emotion;
      updateEmotionDisplay();
    }
  }

  // 更新情感显示
  function updateEmotionDisplay() {
    const emotionData = EMOTION_STATES[state.currentEmotion];

    el.emotionState.className = 'emotion-state ' + emotionData.class;
    el.emotionState.innerHTML = `
      <h3>${emotionData.emoji} ${emotionData.name}</h3>
      <p id="confidence" style="margin-top: 4px; font-size: 12px; opacity: 0.7;">置信度: --</p>
    `;

    // 医学说明
    el.medicalInfo.innerHTML = `
      <h4>${emotionData.medical.title}</h4>
      <p style="margin: 6px 0;">${emotionData.medical.description}</p>
      <ul>
        ${emotionData.medical.points.map(p => `<li>${p}</li>`).join('')}
      </ul>
    `;
  }

  // 开始/停止
  function start() {
    state.running = true;
    el.btnStart.disabled = true;
    el.btnStop.disabled = false;
    el.status.textContent = '运行中...';
    updateCounter = 0;
    updateEEG();
  }

  function stop() {
    state.running = false;
    el.btnStart.disabled = false;
    el.btnStop.disabled = true;
    el.status.textContent = '已停止';
  }

  // 处理窗口resize事件
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (state.running) {
        // 如果正在运行，重新初始化以适应新的窗口大小
        initChannels();
      }
    }, 500);
  });

  // 绑定事件
  el.btnStart.addEventListener('click', start);
  el.btnStop.addEventListener('click', stop);

  // 初始化
  initChannels();
  updateEmotionDisplay();
  evaluateAndUpdateVitalsBadges();
  // 初始显示生命体征
  el.spo2Val.textContent = state.vitals.spo2;
  el.bpVal.textContent = `${state.vitals.sys}/${state.vitals.dia}`;
  el.hrVal.textContent = state.vitals.hr;
  el.btnStop.disabled = true;
})();
