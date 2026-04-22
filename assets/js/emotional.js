(() => {
  const { createApp } = Vue;

  const CHANNEL_NAMES = [
    'Fp1', 'Fp2', 'F7', 'F3', 'Fz', 'F4', 'F8',
    'T7', 'C3', 'Cz', 'C4', 'T8',
    'P7', 'P3', 'Pz', 'P4', 'P8',
    'O1', 'Oz', 'O2',
    'FC5', 'FC6', 'CP5', 'CP6'
  ];

  const APP_CONFIG = {
    eeg: {
      sampleRate: 250,
      bufferSize: 4096,
      frameSamples: 3,
      emotionIntervalFrames: 90,
      vitalsIntervalFrames: 60
    },
    vitals: {
      spo2: { min: 92, max: 100, initial: 98, normalLow: 95 },
      hr: { min: 50, max: 110, initial: 78, normalLow: 60, normalHigh: 100 }
    },
    environment: {
      stateMap: {
        calm: '清醒',
        neutral: '清醒',
        anxious: '疲劳',
        stressed: '疲劳'
      },
      presets: {
        清醒: {
          light: { from: 80, to: 100 },
          temp: { from: 26, to: 24 },
          message: '环境已优化：提升专注力'
        },
        疲劳: {
          light: { from: 80, to: 40 },
          temp: { from: 24, to: 27 },
          message: '环境已调整：进入放松模式'
        }
      },
      transitionMs: 780
    }
  };

  const EMOTION_STATES = {
    calm: {
      name: '放松 / 平静',
      class: 'emotion-calm',
      emoji: '😌',
      description: '状态稳定，建议保持当前任务节奏。',
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
      description: '认知负荷正常，注意力处于可用水平。',
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
      description: '系统检测到较高警觉，建议短时休息。',
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
      description: '出现疲劳趋势，系统建议切换放松模式。',
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

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function stepValue(current, min, max) {
    const delta = Math.random() < 0.5 ? -1 : 1;
    return clamp(current + delta, min, max);
  }

  function getEnvironmentStrategy(state, config = APP_CONFIG.environment) {
    const preset = config.presets[state] || config.presets['清醒'];
    return {
      state,
      light: { ...preset.light },
      temp: { ...preset.temp },
      message: preset.message
    };
  }

  window.getEnvironmentStrategy = getEnvironmentStrategy;

  const VitalRingGauge = {
    props: {
      value: { type: Number, required: true },
      min: { type: Number, required: true },
      max: { type: Number, required: true },
      unit: { type: String, required: true }
    },
    computed: {
      normalizedPercent() {
        const span = Math.max(1, this.max - this.min);
        const bounded = clamp(this.value, this.min, this.max);
        return Math.round(((bounded - this.min) / span) * 100);
      },
      radius() {
        return 36;
      },
      circumference() {
        return 2 * Math.PI * this.radius;
      },
      dashOffset() {
        return this.circumference * (1 - this.normalizedPercent / 100);
      }
    },
    template: `
      <div class="vital-ring-wrap" role="img" :aria-label="'当前值 ' + value + unit">
        <svg class="vital-ring" viewBox="0 0 88 88" aria-hidden="true">
          <circle class="vital-ring-bg" cx="44" cy="44" :r="radius"></circle>
          <circle
            class="vital-ring-fg"
            cx="44"
            cy="44"
            :r="radius"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="dashOffset"
          ></circle>
        </svg>
        <div class="vital-ring-center">
          <div class="vital-ring-center-number">{{ normalizedPercent }}%</div>
          <div class="vital-ring-center-unit">进度</div>
        </div>
      </div>
    `
  };

  const VitalPhotoCard = {
    template: `
      <article class="vital-panel-card vital-photo-card">
        <div class="vital-photo-media">
          <img src="../assets/pages/health.png" alt="用户实时监测与脑电采集" />
          <div class="vital-photo-overlay"></div>
        </div>
        <div class="vital-photo-copy">
          <h3 class="vital-photo-title">用户实时监测</h3>
          <p class="vital-photo-subtitle">脑电信号采集与分析中</p>
        </div>
      </article>
    `
  };

  const VitalMetricCard = {
    components: {
      VitalRingGauge
    },
    props: {
      title: { type: String, required: true },
      value: { type: Number, required: true },
      unit: { type: String, required: true },
      range: { type: String, required: true },
      badge: { type: Object, required: true },
      gaugeMin: { type: Number, required: true },
      gaugeMax: { type: Number, required: true }
    },
    template: `
      <article class="vital-panel-card vital-metric-card">
        <div>
          <h3 class="vital-metric-label">{{ title }}</h3>
          <div class="vital-metric-value">
            <div class="vital-metric-value-number">{{ value }}</div>
            <div class="vital-metric-unit">{{ unit }}</div>
          </div>
          <div class="vital-metric-range">{{ range }}</div>
          <div :class="['vital-badge', badge.class]">{{ badge.label }}</div>
        </div>
        <vital-ring-gauge :value="value" :unit="unit" :min="gaugeMin" :max="gaugeMax"></vital-ring-gauge>
      </article>
    `
  };

  const VitalSignsPanel = {
    components: {
      VitalPhotoCard,
      VitalMetricCard
    },
    props: {
      vitals: { type: Object, required: true },
      badges: { type: Object, required: true }
    },
    template: `
      <section class="vital-signs-panel">
        <div class="vitals-section-title">生命体征</div>
        <div class="vital-signs-grid">
          <vital-photo-card></vital-photo-card>
          <vital-metric-card
            title="血氧饱和度 SpO₂"
            :value="vitals.spo2"
            unit="%"
            range="正常: 95 - 100%"
            :badge="badges.spo2"
            :gauge-min="90"
            :gauge-max="100"
          ></vital-metric-card>
          <vital-metric-card
            title="心率 Heart Rate"
            :value="vitals.hr"
            unit="bpm"
            range="正常: 60 - 100"
            :badge="badges.hr"
            :gauge-min="50"
            :gauge-max="110"
          ></vital-metric-card>
        </div>
      </section>
    `
  };

  createApp({
    components: {
      VitalSignsPanel,
      SmartHomePanel: {
        props: {
          strategy: { type: Object, required: true },
          view: { type: Object, required: true },
          animating: { type: Boolean, required: true }
        },
        template: `
          <div class="smart-home-card" :class="{ 'fade-pulse': animating }">
            <h3 class="smart-home-title">智能家居联动控制</h3>
            <div class="smart-home-state">当前策略状态：{{ strategy.state }}</div>
            <div class="env-rows">
              <div class="env-row">
                <div>💡 灯光亮度</div>
                <div class="env-value">{{ view.lightFrom }}% → {{ view.lightTo }}%</div>
              </div>
              <div class="env-row">
                <div>❄️ 空调温度</div>
                <div class="env-value">{{ view.tempFrom }}℃ → {{ view.tempTo }}℃</div>
              </div>
            </div>
            <div class="env-message">提示：{{ view.message }}</div>
          </div>
        `
      }
    },
    data() {
      return {
        channelNames: CHANNEL_NAMES,
        running: false,
        statusText: '准备就绪',
        currentEmotion: 'neutral',
        bandPowers: { alpha: 20, beta: 15, theta: 10, delta: 5 },
        vitals: {
          spo2: APP_CONFIG.vitals.spo2.initial,
          hr: APP_CONFIG.vitals.hr.initial
        },
        vitalBadges: {
          spo2: { label: '正常', class: 'vital-badge-ok' },
          hr: { label: '正常', class: 'vital-badge-ok' }
        },
        environmentStrategy: getEnvironmentStrategy('清醒'),
        environmentView: {
          lightFrom: 80,
          lightTo: 100,
          tempFrom: 26,
          tempTo: 24,
          message: '环境已优化：提升专注力'
        },
        environmentAnimating: false,
        eegState: {
          sampleRate: APP_CONFIG.eeg.sampleRate,
          bufferSize: APP_CONFIG.eeg.bufferSize,
          t: 0,
          channels: new Map(),
          updateCounter: 0,
          smoothAlpha: 20,
          smoothBeta: 15,
          smoothTheta: 10,
          smoothDelta: 5,
          rafId: null
        },
        resizeTimer: null
      };
    },
    computed: {
      currentEmotionData() {
        return EMOTION_STATES[this.currentEmotion] || EMOTION_STATES.neutral;
      }
    },
    methods: {
      initChannels() {
        const container = this.$refs.channelsContainer;
        if (!container) return;

        const containerWidth = container.clientWidth;
        const canvasWidth = Math.max(220, containerWidth - 64);
        this.eegState.channels.clear();

        const canvases = container.querySelectorAll('canvas.channel__canvas');
        canvases.forEach((canvas) => {
          const name = canvas.dataset.channel;
          canvas.width = canvasWidth;
          canvas.height = 34;
          const buffer = new Float32Array(this.eegState.bufferSize);
          this.eegState.channels.set(name, {
            canvas,
            ctx: canvas.getContext('2d'),
            buffer,
            writePtr: 0
          });
        });
      },
      drawChannelWaveform(channelData) {
        const { canvas, ctx, buffer, writePtr } = channelData;
        const w = canvas.width;
        const h = canvas.height;
        const centerY = h / 2;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(w, centerY);
        ctx.stroke();

        ctx.strokeStyle = '#6ff0c1';
        ctx.lineWidth = 1.8;
        ctx.beginPath();

        const step = Math.max(1, Math.floor(buffer.length / w));
        let first = true;
        for (let i = 0; i < w; i++) {
          const bufIdx = (writePtr + i * step) % buffer.length;
          const val = buffer[bufIdx];
          const y = centerY - (val / 24) * (centerY - 1.5);
          const clampedY = Math.max(2, Math.min(h - 2, y));
          if (first) {
            ctx.moveTo(i, clampedY);
            first = false;
          } else {
            ctx.lineTo(i, clampedY);
          }
        }
        ctx.stroke();
      },
      generateChannelAmplitude(channelName, theta, alpha, beta, delta) {
        let signal = 0;
        if (channelName.includes('p') || channelName.includes('P')) {
          signal = alpha * 1.2 + beta * 0.15 + theta * 0.1 + delta * 0.05;
        } else if (channelName.includes('f') || channelName.includes('F')) {
          signal = beta * 1.3 + alpha * 0.2 + theta * 0.4 + delta * 0.1;
        } else if (channelName.includes('c') || channelName.includes('C') || channelName.includes('z')) {
          signal = theta * 0.8 + beta * 0.5 + alpha * 0.4 + delta * 0.2;
        } else if (channelName.includes('t') || channelName.includes('T')) {
          signal = delta * 0.7 + theta * 0.7 + beta * 0.3 + alpha * 0.3;
        } else if (channelName.includes('o') || channelName.includes('O')) {
          signal = alpha * 1.5 + beta * 0.1 + theta * 0.1 + delta * 0.05;
        }
        const noise = (Math.random() - 0.5) * 5.5;
        const mod = Math.sin(this.eegState.t * (10 + Math.abs(Math.random() * 20))) * 0.3;
        return signal + noise + mod;
      },
      updateVitals() {
        const { spo2, hr } = APP_CONFIG.vitals;
        this.vitals.spo2 = stepValue(this.vitals.spo2, spo2.min, spo2.max);
        this.vitals.hr = stepValue(this.vitals.hr, hr.min, hr.max);
        this.vitalBadges.spo2 = this.evaluateSpO2(this.vitals.spo2);
        this.vitalBadges.hr = this.evaluateHR(this.vitals.hr);
      },
      evaluateSpO2(value) {
        if (value >= APP_CONFIG.vitals.spo2.normalLow) {
          return { label: '正常', class: 'vital-badge-ok' };
        }
        if (value >= 90) {
          return { label: '偏低', class: 'vital-badge-warn' };
        }
        return { label: '低氧', class: 'vital-badge-alert' };
      },
      evaluateHR(value) {
        const range = APP_CONFIG.vitals.hr;
        if (value < range.normalLow) return { label: '偏慢', class: 'vital-badge-warn' };
        if (value <= range.normalHigh) return { label: '正常', class: 'vital-badge-ok' };
        return { label: '偏快', class: 'vital-badge-warn' };
      },
      classifyEmotion() {
        const { alpha, beta, theta, delta } = this.bandPowers;
        const calmScore = alpha * 2.0 - beta * 0.4 + 8;
        const anxiousScore = beta * 2.2 - alpha * 0.8 - theta * 0.4 - 5;
        const stressedScore = theta * 1.9 + delta * 0.9 - alpha * 0.7 - 5;

        let emotion = 'neutral';
        if (calmScore > 18 && calmScore > anxiousScore + 3 && calmScore > stressedScore + 3) {
          emotion = 'calm';
        } else if (anxiousScore > 25 && anxiousScore > stressedScore + 2) {
          emotion = 'anxious';
        } else if (stressedScore > 20) {
          emotion = 'stressed';
        }

        if (emotion !== this.currentEmotion) {
          this.currentEmotion = emotion;
          this.applyEnvironmentByEmotion(emotion);
        }
      },
      applyEnvironmentByEmotion(emotion) {
        const mappedState = APP_CONFIG.environment.stateMap[emotion] || '清醒';
        const strategy = getEnvironmentStrategy(mappedState, APP_CONFIG.environment);
        this.environmentStrategy = strategy;
        this.animateEnvironment(strategy);
      },
      animateEnvironment(strategy) {
        this.environmentAnimating = true;

        const from = {
          lightFrom: this.environmentView.lightFrom,
          lightTo: this.environmentView.lightTo,
          tempFrom: this.environmentView.tempFrom,
          tempTo: this.environmentView.tempTo
        };
        const to = {
          lightFrom: strategy.light.from,
          lightTo: strategy.light.to,
          tempFrom: strategy.temp.from,
          tempTo: strategy.temp.to
        };

        const duration = APP_CONFIG.environment.transitionMs;
        const start = performance.now();

        const tick = (now) => {
          const progress = clamp((now - start) / duration, 0, 1);
          this.environmentView.lightFrom = Math.round(from.lightFrom + (to.lightFrom - from.lightFrom) * progress);
          this.environmentView.lightTo = Math.round(from.lightTo + (to.lightTo - from.lightTo) * progress);
          this.environmentView.tempFrom = Math.round(from.tempFrom + (to.tempFrom - from.tempFrom) * progress);
          this.environmentView.tempTo = Math.round(from.tempTo + (to.tempTo - from.tempTo) * progress);

          if (progress < 1) {
            requestAnimationFrame(tick);
          } else {
            this.environmentView.message = strategy.message;
            setTimeout(() => {
              this.environmentAnimating = false;
            }, 120);
          }
        };

        this.environmentView.message = strategy.message;
        requestAnimationFrame(tick);
      },
      updateEEG() {
        if (!this.running) return;

        const profileMap = {
          calm: { alpha: 25, beta: 12, theta: 10, delta: 5 },
          neutral: { alpha: 15, beta: 20, theta: 8, delta: 5 },
          anxious: { alpha: 8, beta: 28, theta: 12, delta: 6 },
          stressed: { alpha: 5, beta: 15, theta: 25, delta: 10 }
        };

        const interval = 1000 / this.eegState.sampleRate;

        for (let frame = 0; frame < APP_CONFIG.eeg.frameSamples; frame++) {
          this.eegState.t += interval / 1000;

          const profile = profileMap[this.currentEmotion];
          const slowMod = 0.7 + 0.3 * Math.sin(this.eegState.t * Math.PI * 4);
          const theta = profile.theta * slowMod * (0.7 + 0.3 * Math.sin(this.eegState.t * 30));
          const alpha = profile.alpha * slowMod * (0.6 + 0.4 * Math.cos(this.eegState.t * 45));
          const beta = profile.beta * slowMod * (0.5 + 0.5 * Math.sin(this.eegState.t * 80));
          const delta = profile.delta * slowMod * (0.8 + 0.2 * Math.sin(this.eegState.t * 15));

          this.eegState.smoothAlpha = this.eegState.smoothAlpha * 0.75 + alpha * 0.25;
          this.eegState.smoothBeta = this.eegState.smoothBeta * 0.75 + beta * 0.25;
          this.eegState.smoothTheta = this.eegState.smoothTheta * 0.75 + theta * 0.25;
          this.eegState.smoothDelta = this.eegState.smoothDelta * 0.75 + delta * 0.25;

          for (const [name, channel] of this.eegState.channels) {
            const sample = this.generateChannelAmplitude(
              name,
              this.eegState.smoothTheta,
              this.eegState.smoothAlpha,
              this.eegState.smoothBeta,
              this.eegState.smoothDelta
            );
            channel.buffer[channel.writePtr] = sample;
            channel.writePtr = (channel.writePtr + 1) % this.eegState.bufferSize;
          }
        }

        this.bandPowers = {
          alpha: Math.round(this.eegState.smoothAlpha * 10) / 10,
          beta: Math.round(this.eegState.smoothBeta * 10) / 10,
          theta: Math.round(this.eegState.smoothTheta * 10) / 10,
          delta: Math.round(this.eegState.smoothDelta * 10) / 10
        };

        for (const channel of this.eegState.channels.values()) {
          this.drawChannelWaveform(channel);
        }

        this.eegState.updateCounter += 1;
        if (this.eegState.updateCounter % APP_CONFIG.eeg.vitalsIntervalFrames === 0) {
          this.updateVitals();
        }
        if (this.eegState.updateCounter % APP_CONFIG.eeg.emotionIntervalFrames === 0) {
          this.classifyEmotion();
        }

        this.eegState.rafId = requestAnimationFrame(this.updateEEG);
      },
      start() {
        if (this.running) return;
        this.running = true;
        this.statusText = '运行中...';
        this.eegState.updateCounter = 0;
        this.updateEEG();
      },
      stop() {
        this.running = false;
        this.statusText = '已停止';
        if (this.eegState.rafId) {
          cancelAnimationFrame(this.eegState.rafId);
          this.eegState.rafId = null;
        }
      },
      handleResize() {
        clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => {
          this.initChannels();
        }, 300);
      }
    },
    mounted() {
      this.$nextTick(() => {
        this.initChannels();
        this.vitalBadges.spo2 = this.evaluateSpO2(this.vitals.spo2);
        this.vitalBadges.hr = this.evaluateHR(this.vitals.hr);
        this.applyEnvironmentByEmotion(this.currentEmotion);
      });
      window.addEventListener('resize', this.handleResize);
    },
    beforeUnmount() {
      this.stop();
      window.removeEventListener('resize', this.handleResize);
      clearTimeout(this.resizeTimer);
    }
  }).mount('#emotionApp');
})();
