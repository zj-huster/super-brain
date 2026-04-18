(() => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  const state = {
    listening: false,
    lang: "zh-CN",
    devices: {
      lightsBrightness: 50,
      curtainLight: 50,
      temp: 26,
      musicDb: 50,
    },
  };

  const el = {
    btnMic: document.getElementById("btnMic"),
    micStatus: document.getElementById("micStatus"),
    voiceStatus: document.getElementById("voiceStatus"),
    voiceWave: document.getElementById("voiceWave"),
    selectLang: document.getElementById("selectLang"),
    chatList: document.getElementById("chatList"),
    chatPlaceholder: document.getElementById("chatPlaceholder"),
    statusLights: document.getElementById("statusLights"),
    statusCurtains: document.getElementById("statusCurtains"),
    statusTemp: document.getElementById("statusTemp"),
    statusMusic: document.getElementById("statusMusic"),
    videoWrap: document.getElementById("videoWrap"),
    curtainVideo: document.getElementById("curtainVideo"),
    videoCaption: document.getElementById("videoCaption"),
    btnLightsOn: document.getElementById("btnLightsOn"),
    btnLightsOff: document.getElementById("btnLightsOff"),
    btnCurtainsOpen: document.getElementById("btnCurtainsOpen"),
    btnCurtainsClose: document.getElementById("btnCurtainsClose"),
    btnTempUp: document.getElementById("btnTempUp"),
    btnTempDown: document.getElementById("btnTempDown"),
    btnMusicPlay: document.getElementById("btnMusicPlay"),
    btnMusicStop: document.getElementById("btnMusicStop"),
    textCommandForm: document.getElementById("textCommandForm"),
    textCommandInput: document.getElementById("textCommandInput"),
    btnTextSend: document.getElementById("btnTextSend"),
  };

  let recognition = null;
  let thinkingBubble = null;

  function setStatus(text, variant) {
    el.voiceStatus.textContent = text;
    el.voiceStatus.classList.remove("status-pill--active", "status-pill--error");
    if (variant) {
      el.voiceStatus.classList.add(variant);
    }
  }

  function setMicUi(listening) {
    state.listening = listening;
    el.btnMic.classList.toggle("is-listening", listening);
    el.voiceWave.classList.toggle("is-idle", !listening);
    el.btnMic.innerHTML = listening ? "正在<br />监听" : "按下<br />聆听";
    el.micStatus.textContent = listening ? "识别中..." : "点击开始语音识别";
    setStatus(listening ? "识别中" : "待机", listening ? "status-pill--active" : "");
  }

  function addMessage(role, text) {
    if (el.chatPlaceholder) {
      el.chatPlaceholder.remove();
    }

    const bubble = document.createElement("div");
    bubble.className = `bubble bubble--${role}`;

    const content = document.createElement("div");
    content.textContent = text;

    const meta = document.createElement("div");
    meta.className = "bubble__meta";
    meta.textContent = new Date().toLocaleTimeString();

    bubble.appendChild(content);
    bubble.appendChild(meta);
    el.chatList.appendChild(bubble);
    el.chatList.scrollTop = el.chatList.scrollHeight;

    return bubble;
  }

  function showThinking() {
    if (thinkingBubble) return thinkingBubble;
    thinkingBubble = document.createElement("div");
    thinkingBubble.className = "bubble bubble--assistant bubble--thinking";
    thinkingBubble.textContent = "管家正在分析...";
    el.chatList.appendChild(thinkingBubble);
    el.chatList.scrollTop = el.chatList.scrollHeight;
    return thinkingBubble;
  }

  function hideThinking() {
    if (!thinkingBubble) return;
    thinkingBubble.remove();
    thinkingBubble = null;
  }

  function renderDevices() {
    el.statusLights.textContent = `${state.devices.lightsBrightness}%`;
    el.statusCurtains.textContent = `${state.devices.curtainLight}%`;
    el.statusTemp.textContent = `${state.devices.temp}°C`;
    el.statusMusic.textContent = `${state.devices.musicDb} dB`;
  }

  function playVideo(videoFile, captionText) {
    if (!el.curtainVideo || !el.videoWrap) return;
    
    el.curtainVideo.src = videoFile;
    el.videoWrap.classList.add("is-visible");
    if (el.videoCaption) {
      el.videoCaption.textContent = captionText || "智能管家执行中：正在同步更新设备状态。";
    }
    
    el.curtainVideo.play().catch(err => {
      console.error("视频播放失败：", err);
    });
    
    // 视频播放结束后隐藏
    el.curtainVideo.onended = () => {
      el.videoWrap.classList.remove("is-visible");
    };
  }

  function isMatch(text, keywords) {
    return keywords.some((key) => text.includes(key));
  }

  // 检查文本是否同时包含所有关键词（任意顺序）
  function hasAllKeywords(text, keywords) {
    return keywords.every((key) => text.includes(key));
  }

  function formatTime() {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  }

  function parseSpokenNumber(value) {
    if (!value) return Number.NaN;
    const token = String(value).trim();
    if (/^\d+$/.test(token)) {
      return Number(token);
    }

    const normalized = token.replace(/〇/g, "零");
    const digitMap = {
      零: 0,
      一: 1,
      二: 2,
      两: 2,
      三: 3,
      四: 4,
      五: 5,
      六: 6,
      七: 7,
      八: 8,
      九: 9,
    };

    if (normalized === "十") return 10;

    if (normalized.includes("十")) {
      const parts = normalized.split("十");
      const tens = parts[0] === "" ? 1 : digitMap[parts[0]];
      const ones = parts[1] === "" ? 0 : digitMap[parts[1]];
      if (Number.isInteger(tens) && Number.isInteger(ones)) {
        return tens * 10 + ones;
      }
      return Number.NaN;
    }

    if (normalized.length === 1 && Number.isInteger(digitMap[normalized])) {
      return digitMap[normalized];
    }

    return Number.NaN;
  }

  function generateReply(text) {
    const raw = text.trim();

    if (raw.length === 0) {
      return "我没有听清，请再说一次。";
    }

    const lightsUp = hasAllKeywords(raw, ["客厅灯"]) && isMatch(raw, ["调亮10%", "调亮一些", "调亮一点", "亮一些", "亮一点"]);
    const lightsDown = hasAllKeywords(raw, ["客厅灯"]) && isMatch(raw, ["调暗10%", "调暗一些", "调暗一点", "暗一些", "暗一点"]);
    const curtainMore = hasAllKeywords(raw, ["窗帘", "透光"]) && isMatch(raw, ["增加10%", "多10%", "透光多一些", "透光多一点", "透光多"]);
    const curtainLess = hasAllKeywords(raw, ["窗帘", "透光"]) && isMatch(raw, ["减少10%", "少10%", "透光少一些", "透光少一点", "透光少"]);
    const musicUp = hasAllKeywords(raw, ["音量"]) && isMatch(raw, ["调高1分贝", "调高一些", "调高一点", "高一些", "高一点"]);
    const musicDown = hasAllKeywords(raw, ["音量"]) && isMatch(raw, ["调低1分贝", "调低一些", "调低一点", "低一些", "低一点"]);
    const acUp = hasAllKeywords(raw, ["空调"]) && isMatch(raw, ["调高1度", "升高1度", "高1度"]);
    const acDown = hasAllKeywords(raw, ["空调"]) && isMatch(raw, ["调低1度", "降低1度", "低1度"]);

    if (lightsUp) {
      state.devices.lightsBrightness = Math.min(100, state.devices.lightsBrightness + 10);
      playVideo("turn on.mp4", "客厅灯亮度 +10%，空间照明更清晰。");
      return `好的，客厅灯已调亮10%，当前亮度 ${state.devices.lightsBrightness}%。`;
    }

    if (lightsDown) {
      state.devices.lightsBrightness = Math.max(0, state.devices.lightsBrightness - 10);
      playVideo("turn off.mp4", "客厅灯亮度 -10%，氛围更柔和。");
      return `好的，客厅灯已调暗10%，当前亮度 ${state.devices.lightsBrightness}%。`;
    }

    if (curtainMore) {
      state.devices.curtainLight = Math.min(100, state.devices.curtainLight + 10);
      playVideo("open.mp4", "窗帘透光 +10%，室内采光增强。");
      return `已将窗帘透光增加10%，当前透光 ${state.devices.curtainLight}%。`;
    }

    if (curtainLess) {
      state.devices.curtainLight = Math.max(0, state.devices.curtainLight - 10);
      playVideo("close.mp4", "窗帘透光 -10%，减少外部光线干扰。");
      return `已将窗帘透光减少10%，当前透光 ${state.devices.curtainLight}%。`;
    }

    if (musicUp) {
      state.devices.musicDb = Math.min(100, state.devices.musicDb + 1);
      playVideo("music on.mp4", "音量 +1 dB，声音更清晰饱满。");
      return `已将音量调高1分贝，当前 ${state.devices.musicDb} dB。`;
    }

    if (musicDown) {
      state.devices.musicDb = Math.max(0, state.devices.musicDb - 1);
      playVideo("music off.mp4", "音量 -1 dB，听感更安静舒适。");
      return `已将音量调低1分贝，当前 ${state.devices.musicDb} dB。`;
    }

    if (acUp) {
      state.devices.temp = Math.min(30, state.devices.temp + 1);
      playVideo("turn on.mp4", "空调温度 +1°C，环境更温暖。");
      return `已将空调调高1度，当前 ${state.devices.temp}°C。`;
    }

    if (acDown) {
      state.devices.temp = Math.max(16, state.devices.temp - 1);
      playVideo("turn off.mp4", "空调温度 -1°C，环境更清凉。");
      return `已将空调调低1度，当前 ${state.devices.temp}°C。`;
    }

    if (isMatch(raw, ["现在几点", "时间", "几点"])) {
      return `现在时间是 ${formatTime()}。`;
    }

    return `已记录你的指令：“${raw}”。可尝试：客厅灯调亮一些、窗帘透光少一些、音乐音量调高一些、空调不变。`;
  }

  function handleUtterance(text, source = "voice") {
    const userText = source === "text" ? `[文字] ${text}` : text;
    addMessage("user", userText);
    showThinking();

    setTimeout(() => {
      const reply = generateReply(text);
      hideThinking();
      addMessage("assistant", reply);
      renderDevices();
    }, 500 + Math.random() * 400);
  }

  function submitTextCommand() {
    if (!el.textCommandInput) return;
    const text = el.textCommandInput.value.trim();
    if (!text) {
      el.textCommandInput.focus();
      return;
    }
    handleUtterance(text, "text");
    el.textCommandInput.value = "";
    el.textCommandInput.focus();
  }

  function ensureRecognition() {
    if (!SpeechRecognition) {
      setStatus("当前浏览器不支持语音识别", "status-pill--error");
      el.micStatus.textContent = "请使用最新版 Chrome 或 Edge";
      el.btnMic.disabled = true;
      return false;
    }

    if (recognition) return true;

    recognition = new SpeechRecognition();
    recognition.lang = state.lang;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      console.log("语音识别已开始监听");
      setMicUi(true);
    };

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();
        if (result.isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }

      if (interimText) {
        console.log("识别中（临时）：", interimText);
        el.micStatus.textContent = `识别中：${interimText}`;
      }

      if (finalText) {
        console.log("识别完成（最终）：", finalText);
        el.micStatus.textContent = "识别完成";
        handleUtterance(finalText);
      }
    };

    recognition.onend = () => {
      console.log("语音识别已结束");
      setMicUi(false);
    };

    recognition.onerror = (event) => {
      console.error("语音识别错误：", event.error);
      setMicUi(false);
      
      let errorMsg = "识别发生错误";
      if (event.error === "no-speech") {
        errorMsg = "未检测到语音，请重试";
      } else if (event.error === "not-allowed") {
        errorMsg = "麦克风权限被拒绝，请允许麦克风访问";
      } else if (event.error === "network") {
        errorMsg = "网络错误，请检查连接";
      } else {
        errorMsg = `错误：${event.error}`;
      }
      
      setStatus(errorMsg, "status-pill--error");
      el.micStatus.textContent = errorMsg;
    };

    return true;
  }

  function startListening() {
    if (!ensureRecognition()) return;
    if (state.listening) return; // 防止重复启动
    
    recognition.lang = state.lang;
    try {
      recognition.start();
      console.log("语音识别已启动，语言：", state.lang);
    } catch (error) {
      console.error("启动识别失败：", error);
      setStatus("无法启动识别", "status-pill--error");
      el.micStatus.textContent = "识别启动失败，请稍后重试";
    }
  }

  function stopListening() {
    if (!recognition) return;
    recognition.stop();
    setMicUi(false);
  }

  el.btnMic.addEventListener("click", () => {
    if (state.listening) {
      stopListening();
    } else {
      startListening();
    }
  });

  el.selectLang.addEventListener("change", (event) => {
    state.lang = event.target.value;
    if (recognition) {
      recognition.lang = state.lang;
    }
  });

  if (el.textCommandForm) {
    el.textCommandForm.addEventListener("submit", (event) => {
      event.preventDefault();
      submitTextCommand();
    });
  }

  // 按钮控制事件
  el.btnLightsOn.addEventListener("click", () => {
    state.devices.lightsBrightness = Math.min(100, state.devices.lightsBrightness + 10);
    playVideo("turn on.mp4", "客厅灯亮度 +10%，空间照明更清晰。");
    addMessage("user", "[按钮] 客厅灯调亮10%");
    addMessage("assistant", `好的，客厅灯已调亮10%，当前亮度 ${state.devices.lightsBrightness}%。`);
    renderDevices();
  });

  el.btnLightsOff.addEventListener("click", () => {
    state.devices.lightsBrightness = Math.max(0, state.devices.lightsBrightness - 10);
    playVideo("turn off.mp4", "客厅灯亮度 -10%，氛围更柔和。");
    addMessage("user", "[按钮] 客厅灯调暗10%");
    addMessage("assistant", `好的，客厅灯已调暗10%，当前亮度 ${state.devices.lightsBrightness}%。`);
    renderDevices();
  });

  el.btnCurtainsOpen.addEventListener("click", () => {
    state.devices.curtainLight = Math.min(100, state.devices.curtainLight + 10);
    playVideo("open.mp4", "窗帘透光 +10%，室内采光增强。");
    addMessage("user", "[按钮] 窗帘透光增加10%");
    addMessage("assistant", `已将窗帘透光增加10%，当前透光 ${state.devices.curtainLight}%。`);
    renderDevices();
  });

  el.btnCurtainsClose.addEventListener("click", () => {
    state.devices.curtainLight = Math.max(0, state.devices.curtainLight - 10);
    playVideo("close.mp4", "窗帘透光 -10%，减少外部光线干扰。");
    addMessage("user", "[按钮] 窗帘透光减少10%");
    addMessage("assistant", `已将窗帘透光减少10%，当前透光 ${state.devices.curtainLight}%。`);
    renderDevices();
  });

  el.btnTempUp.addEventListener("click", () => {
    state.devices.temp = Math.min(30, state.devices.temp + 1);
    playVideo("turn on.mp4", "空调温度 +1°C，环境更温暖。");
    addMessage("user", "[按钮] 空调调高1度");
    addMessage("assistant", `已将空调调高1度，当前 ${state.devices.temp}°C。`);
    renderDevices();
  });

  el.btnTempDown.addEventListener("click", () => {
    state.devices.temp = Math.max(16, state.devices.temp - 1);
    playVideo("turn off.mp4", "空调温度 -1°C，环境更清凉。");
    addMessage("user", "[按钮] 空调调低1度");
    addMessage("assistant", `已将空调调低1度，当前 ${state.devices.temp}°C。`);
    renderDevices();
  });

  el.btnMusicPlay.addEventListener("click", () => {
    state.devices.musicDb = Math.min(100, state.devices.musicDb + 1);
    playVideo("music on.mp4", "音量 +1 dB，声音更清晰饱满。");
    addMessage("user", "[按钮] 音量调高1分贝");
    addMessage("assistant", `已将音量调高1分贝，当前 ${state.devices.musicDb} dB。`);
    renderDevices();
  });

  el.btnMusicStop.addEventListener("click", () => {
    state.devices.musicDb = Math.max(0, state.devices.musicDb - 1);
    playVideo("music off.mp4", "音量 -1 dB，听感更安静舒适。");
    addMessage("user", "[按钮] 音量调低1分贝");
    addMessage("assistant", `已将音量调低1分贝，当前 ${state.devices.musicDb} dB。`);
    renderDevices();
  });

  renderDevices();
  setMicUi(false);
  
  // 初始检测浏览器支持
  if (!SpeechRecognition) {
    setStatus("浏览器不支持语音识别", "status-pill--error");
    el.micStatus.textContent = "请使用 Chrome 或 Edge 浏览器";
    el.btnMic.disabled = true;
    console.error("Web Speech API 不被支持");
  } else {
    console.log("Web Speech API 可用，点击麦克风按钮开始识别");
  }
})();
