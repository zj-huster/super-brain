const path = require("path");
const fs = require("fs");
const pptxgen = require("pptxgenjs");

const pptx = new pptxgen();
pptx.layout = "LAYOUT_16x9";
pptx.author = "SSVEP Smart Home Team";
pptx.subject = "Brain-computer-interface smart home defense";
pptx.title = "鑴戞満鎺ュ彛鏅鸿兘瀹跺眳绯荤粺绛旇京";
pptx.lang = "zh-CN";

const C = {
  dark: "EAF3FF",
  primary: "00C2FF",
  secondary: "19E3D1",
  light: "101A33",
  text: "DDEBFF",
  muted: "9CB3D9",
  white: "162744",
  accent: "7CFF6B"
};

const media = {
  brainCover: "brain pods.jpeg",
  cap: "brain-cap.png",
  sleep: "brain_sleep.png",
  work: "brain_working.jpeg",
  robot: "robot.png",
  sweep: "sweep.png",
  mop: "moop.png",
  tea: "tea.png",
  laundry: "laundry.png",
  chair: "chair.png",
  health: "health.png",
  vOpen: "open.mp4",
  vClose: "close.mp4",
  vLightOn: "turn on.mp4",
  vLightOff: "turn off.mp4",
  vMusicOn: "music on.mp4",
  vMusicOff: "music off.mp4"
};

function p(file) {
  return path.join(__dirname, file);
}

function exists(file) {
  return fs.existsSync(p(file));
}

function addBg(slide, dark = false) {
  slide.background = { color: dark ? "0B1226" : C.light };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 10,
    h: 5.625,
    line: { color: "0B1226", transparency: 100 },
    fill: { color: dark ? "0B1226" : "101A33" }
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.28,
    line: { color: "1B2A4A", width: 0 },
    fill: { color: "1B2A4A" }
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 0.45,
    y: 0.95,
    w: 9.1,
    h: 0,
    line: { color: "1F355F", width: 0.8 }
  });
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 8.55,
    y: 0.2,
    w: 1.2,
    h: 1.2,
    fill: { color: C.primary, transparency: 72 },
    line: { color: C.primary, transparency: 100 }
  });
}

function addTitle(slide, title, subtitle, dark = false) {
  const titleColor = C.dark;
  const subColor = C.muted;
  slide.addText(title, {
    x: 0.6,
    y: 0.35,
    w: 8,
    h: 0.65,
    fontFace: "Cambria",
    fontSize: 34,
    bold: true,
    color: titleColor,
    margin: 0
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.6,
      y: 1.02,
      w: 8.5,
      h: 0.38,
      fontFace: "Calibri",
      fontSize: 14,
      italic: true,
      color: subColor,
      margin: 0
    });
  }
}

function addBulletList(slide, items, x, y, w, h) {
  const arr = items.map((t, i) => ({
    text: t,
    options: { bullet: true, breakLine: i !== items.length - 1 }
  }));
  slide.addText(arr, {
    x,
    y,
    w,
    h,
    fontFace: "Calibri",
    fontSize: 16,
    color: C.text,
    paraSpaceAfterPt: 10,
    margin: 0.04,
    valign: "top"
  });
}

function addImageIf(slide, file, opts) {
  if (exists(file)) {
    slide.addImage({ path: p(file), ...opts });
  }
}

function addVideoIf(slide, file, posterFile, opts) {
  if (!exists(file)) return;
  if (typeof slide.addMedia === "function") {
    const conf = { path: p(file), ...opts };
    if (posterFile && exists(posterFile)) conf.cover = p(posterFile);
    try {
      slide.addMedia(conf);
      return;
    } catch (err) {
      // Fallback to hyperlink block below when addMedia is unsupported in current renderer
    }
  }
  slide.addShape(pptx.ShapeType.roundRect, {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h,
    fill: { color: "163454" },
    line: { color: C.secondary, width: 1 }
  });
  if (posterFile && exists(posterFile)) {
    slide.addImage({
      path: p(posterFile),
      x: opts.x + 0.06,
      y: opts.y + 0.06,
      w: opts.w - 0.12,
      h: opts.h - 0.28,
      sizing: { type: "cover", w: opts.w - 0.12, h: opts.h - 0.28 }
    });
  }
  slide.addShape(pptx.ShapeType.rect, {
    x: opts.x + 0.06,
    y: opts.y + opts.h - 0.34,
    w: opts.w - 0.12,
    h: 0.22,
    fill: { color: "142D4A", transparency: 10 },
    line: { color: "142D4A", width: 0 }
  });
  slide.addText("鐐瑰嚮鎾斁", {
    x: opts.x + 0.1,
    y: opts.y + opts.h - 0.325,
    w: opts.w - 0.2,
    h: 0.18,
    fontFace: "Calibri",
    fontSize: 11,
    bold: true,
    color: C.dark,
    align: "center",
    margin: 0,
    hyperlink: { url: `file:///${p(file).replace(/\\/g, "/")}` }
  });
}

// 1. Cover
{
  const s = pptx.addSlide();
  addBg(s, true);
  addTitle(s, "鑴戞満鎺ュ彛鏅鸿兘瀹跺眳绯荤粺", "SSVEP + MI + 鎯呮劅 + 璇煶 + Brain Pods", true);
  s.addText("澶氭ā鎬佽剳鏈轰氦浜掗棴鐜師鍨?, {
    x: 0.6,
    y: 1.55,
    w: 4.8,
    h: 0.6,
    fontFace: "Calibri",
    fontSize: 23,
    bold: true,
    color: "E6FFFB"
  });
  s.addText("鍥㈤槦锛歑XX    鎸囧鑰佸笀锛歑XX\n璧涗簨锛氫汉宸ユ櫤鑳藉垱鎰忚禌    鏃ユ湡锛?026.04", {
    x: 0.6,
    y: 4.55,
    w: 5,
    h: 0.7,
    fontFace: "Calibri",
    fontSize: 13,
    color: "CADCFC",
    valign: "bottom"
  });
  addImageIf(s, media.brainCover, { x: 5.3, y: 0.4, w: 4.4, h: 4.9, sizing: { type: "cover", w: 4.4, h: 4.9 } });
}

// 2. 鑳屾櫙涓庣棝鐐?
{
  const s = pptx.addSlide();
  addBg(s, false);
  addTitle(s, "鑳屾櫙涓庣棝鐐?, "浠庤澶囨帶鍒惰蛋鍚戠敤鎴风姸鎬佺悊瑙?, false);
  addBulletList(s, [
    "浼犵粺鏅鸿兘瀹跺眳渚濊禆鎵嬪姩鎴栬闊筹紝鍙楃幆澧冧笌鍦烘櫙鍣０闄愬埗銆?,
    "浣庡姩浣滆兘鍔涚敤鎴峰湪澶嶆潅鍦烘櫙涓粛瀛樺湪鎿嶄綔闂ㄦ銆?,
    "鐜版湁鏂规缂哄皯瀵圭柌鍔炽€佹儏缁瓑鑴戝仴搴风姸鎬佺殑鑱斿姩鎰熺煡銆?,
    "琛屼笟鐥涚偣锛氭帶鍒朵笌鍋ュ悍鐘舵€佺鐞嗗線寰€鍓茶锛岀己灏戠粺涓€绯荤粺銆?
  ], 0.7, 1.55, 5.4, 2.7);
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.7,
    y: 4.42,
    w: 5.8,
    h: 0.7,
    fill: { color: "142D4A" },
    line: { color: C.secondary, width: 0.8 }
  });
  s.addText("鎴戜滑涓嶄粎瑙ｅ喅鈥滄€庝箞鎺у埗璁惧鈥濓紝杩樿В鍐斥€滃浣曠悊瑙ｇ敤鎴风姸鎬佲€濄€?, {
    x: 0.9,
    y: 4.62,
    w: 5.4,
    h: 0.3,
    fontFace: "Calibri",
    fontSize: 15,
    bold: true,
    color: C.dark,
    align: "left"
  });
  addImageIf(s, media.cap, { x: 6.35, y: 1.45, w: 3.2, h: 3.6, sizing: { type: "contain", w: 3.2, h: 3.6 } });
}

// 3. 鐩爣涓庡畾浣?
{
  const s = pptx.addSlide();
  addBg(s, false);
  addTitle(s, "椤圭洰鐩爣涓庡畾浣?, "姣旇禌绾ф蹇甸獙璇佸钩鍙帮紝鑰岄潪鍗曠偣Demo", false);
  const cards = [
    ["鐩爣 1", "鏋勫缓娉ㄨ銆佹剰蹇点€佹儏缁€佽闊冲洓妯℃€佷氦浜掍綋绯?],
    ["鐩爣 2", "瀹炵幇鍙紨绀恒€佸彲瑙ｉ噴銆佸彲鎵╁睍鐨勫墠绔師鍨?],
    ["鐩爣 3", "灏嗗灞呮帶鍒跺欢浼稿埌鑴戝仴搴疯瘎浼颁笌璋冭妭"],
    ["椤圭洰瀹氫綅", "澶氭ā鍧楄В鑰?+ 缁熶竴浣撻獙鍏ュ彛 + 鍙鐢ㄦ紨绀烘祦绋?]
  ];
  cards.forEach((c, i) => {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const x = 0.75 + col * 4.55;
    const y = 1.5 + row * 1.8;
    s.addShape(pptx.ShapeType.rect, {
      x,
      y,
      w: 4.1,
      h: 1.45,
      fill: { color: "162744" },
      line: { color: "2A4D73", width: 1 }
    });
    s.addShape(pptx.ShapeType.rect, {
      x,
      y,
      w: 0.12,
      h: 1.45,
      fill: { color: C.primary },
      line: { color: C.primary, width: 0 }
    });
    s.addText(c[0], {
      x: x + 0.2,
      y: y + 0.14,
      w: 3.6,
      h: 0.28,
      fontFace: "Cambria",
      fontSize: 18,
      bold: true,
      color: C.dark,
      margin: 0
    });
    s.addText(c[1], {
      x: x + 0.2,
      y: y + 0.52,
      w: 3.7,
      h: 0.78,
      fontFace: "Calibri",
      fontSize: 13,
      color: C.text,
      margin: 0
    });
  });
}

// 4. 鎬讳綋鏋舵瀯
{
  const s = pptx.addSlide();
  addBg(s, false);
  addTitle(s, "鎬讳綋鏂规涓庣郴缁熸灦鏋?, "杈撳叆 -> 璇嗗埆/鍒ゅ畾 -> 鐘舵€佹満 -> 鍙嶉灞曠ず", false);

  s.addShape(pptx.ShapeType.roundRect, { x: 0.7, y: 1.7, w: 1.6, h: 0.8, fill: { color: "163454" }, line: { color: C.secondary, width: 1 } });
  s.addText("澶氭ā鎬佽緭鍏?, { x: 0.85, y: 1.98, w: 1.3, h: 0.22, fontFace: "Calibri", fontSize: 13, bold: true, color: C.dark, align: "center" });

  s.addShape(pptx.ShapeType.chevron, { x: 2.45, y: 1.82, w: 0.6, h: 0.54, fill: { color: "9ADDD4" }, line: { color: "9ADDD4", width: 1 } });

  s.addShape(pptx.ShapeType.roundRect, { x: 3.2, y: 1.7, w: 1.8, h: 0.8, fill: { color: "14304B" }, line: { color: C.secondary, width: 1 } });
  s.addText("璇嗗埆/瑙勫垯鍒ゅ畾", { x: 3.35, y: 1.98, w: 1.45, h: 0.22, fontFace: "Calibri", fontSize: 13, bold: true, color: C.dark, align: "center" });

  s.addShape(pptx.ShapeType.chevron, { x: 5.2, y: 1.82, w: 0.6, h: 0.54, fill: { color: "9ADDD4" }, line: { color: "9ADDD4", width: 1 } });

  s.addShape(pptx.ShapeType.roundRect, { x: 5.95, y: 1.7, w: 1.6, h: 0.8, fill: { color: "163454" }, line: { color: C.secondary, width: 1 } });
  s.addText("鐘舵€佹満", { x: 6.15, y: 1.98, w: 1.2, h: 0.22, fontFace: "Calibri", fontSize: 13, bold: true, color: C.dark, align: "center" });

  s.addShape(pptx.ShapeType.chevron, { x: 7.75, y: 1.82, w: 0.6, h: 0.54, fill: { color: "9ADDD4" }, line: { color: "9ADDD4", width: 1 } });

  s.addShape(pptx.ShapeType.roundRect, { x: 8.45, y: 1.7, w: 1.0, h: 0.8, fill: { color: "14304B" }, line: { color: C.secondary, width: 1 } });
  s.addText("鍙嶉", { x: 8.55, y: 1.98, w: 0.8, h: 0.22, fontFace: "Calibri", fontSize: 13, bold: true, color: C.dark, align: "center" });

  const modules = ["SSVEP", "MI", "鎯呮劅妫€娴?, "璇煶绠″", "Brain pods"];
  modules.forEach((m, i) => {
    const x = 0.75 + i * 1.86;
    s.addShape(pptx.ShapeType.rect, {
      x,
      y: 3.05,
      w: 1.58,
      h: 1.9,
      fill: { color: i % 2 === 0 ? "162744" : "F0FCFA" },
      line: { color: "2A4D73", width: 1 }
    });
    s.addText(m, {
      x: x + 0.1,
      y: 3.2,
      w: 1.35,
      h: 0.25,
      fontFace: "Cambria",
      fontSize: 15,
      bold: true,
      color: C.dark,
      align: "center"
    });
    s.addText("妯″潡瑙ｈ€n浣撻獙缁熶竴", {
      x: x + 0.15,
      y: 3.8,
      w: 1.25,
      h: 0.9,
      fontFace: "Calibri",
      fontSize: 11,
      color: C.text,
      align: "center",
      valign: "middle"
    });
  });
}

// 5. 鍒涙柊鐐规€昏
{
  const s = pptx.addSlide();
  addBg(s, false);
  addTitle(s, "鍒涙柊鐐规€昏", "6 椤瑰垱鏂扮粍鎴愬畬鏁撮棴鐜?, false);
  const list = [
    "澶氭ā鎬佽剳鏈轰氦浜掍竴浣撳寲",
    "SSVEP 鍙皟鍒烘縺寮曟搸",
    "MI 鍗曚换鍔′簰鏂ユ剰蹇佃Е鍙?,
    "鎯呮劅 + 鐢熷懡浣撳緛铻嶅悎鍒ゅ畾",
    "璇煶璇箟瑙ｆ瀽涓庡灞呰仈鍔?,
    "Brain pods 鍋ュ悍绠＄悊闂幆"
  ];
  list.forEach((t, i) => {
    const y = 1.5 + i * 0.62;
    s.addShape(pptx.ShapeType.ellipse, { x: 0.85, y: y + 0.1, w: 0.26, h: 0.26, fill: { color: C.secondary }, line: { color: C.secondary, width: 1 } });
    s.addText(String(i + 1), { x: 0.85, y: y + 0.1, w: 0.26, h: 0.26, fontFace: "Calibri", fontSize: 11, bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
    s.addShape(pptx.ShapeType.rect, { x: 1.25, y, w: 5.2, h: 0.45, fill: { color: i % 2 ? "162744" : "132840" }, line: { color: "2A4D73", width: 0.6 } });
    s.addText(t, { x: 1.45, y: y + 0.12, w: 4.7, h: 0.2, fontFace: "Calibri", fontSize: 14, color: C.text, margin: 0 });
  });
  addImageIf(s, media.robot, { x: 6.7, y: 1.55, w: 2.9, h: 3.5, sizing: { type: "contain", w: 2.9, h: 3.5 } });
}

// 6. SSVEP
{
  const s = pptx.addSlide();
  addBg(s, false);
  addTitle(s, "SSVEP 瑙嗚璇卞彂鎺у埗妯″潡", "鍥涚洰鏍囧埡婵€ + 鍙傛暟鍙皟 + 鐘舵€佸疄鏃跺弽棣?, false);

  const items = [
    [media.sweep, "1Hz 鎵湴"],
    [media.mop, "2Hz 鎷栧湴"],
    [media.tea, "5Hz 鍊掕尪"],
    [media.laundry, "8Hz 娲楄。"]
  ];
  items.forEach((it, i) => {
    const x = 0.7 + (i % 2) * 2.45;
    const y = 1.6 + Math.floor(i / 2) * 1.8;
    s.addShape(pptx.ShapeType.rect, { x, y, w: 2.2, h: 1.5, fill: { color: "162744" }, line: { color: "2A4D73", width: 1 } });
    addImageIf(s, it[0], { x: x + 0.12, y: y + 0.12, w: 0.9, h: 0.9, sizing: { type: "contain", w: 0.9, h: 0.9 } });
    s.addText(it[1], { x: x + 1.05, y: y + 0.35, w: 1.0, h: 0.4, fontFace: "Cambria", fontSize: 14, bold: true, color: C.dark, margin: 0 });
    s.addText("鍙儹閿Е鍙?, { x: x + 1.05, y: y + 0.76, w: 1.0, h: 0.24, fontFace: "Calibri", fontSize: 11, color: C.muted, margin: 0 });
  });

  s.addShape(pptx.ShapeType.roundRect, { x: 5.35, y: 1.65, w: 4.0, h: 3.15, fill: { color: "132840" }, line: { color: C.secondary, width: 1 } });
  addBulletList(s, [
    "requestAnimationFrame 楂橀娓叉煋锛屼繚闅滈棯鐑佺ǔ瀹氭€?,
    "棰戠巼鑼冨洿 0.5~20Hz锛屽彲鎸夊疄楠岄渶姹傚疄鏃惰皟鑺?,
    "闈炵嚎鎬у姣斿害澧炲己锛岄€傞厤涓嶅悓鐜浜害",
    "鍏ㄥ睆/鎬ュ仠/鏈€杩戣Е鍙戝姩浣滅姸鎬佷竴浣撳睍绀?
  ], 5.55, 1.95, 3.6, 2.4);
}

// 7. MI
{
  const s = pptx.addSlide();
  addBg(s, false);
  addTitle(s, "MI 杩愬姩鎯宠薄妯″潡", "鏃犺闊炽€佹棤鍔ㄤ綔锛屼粎鎰忓康椹卞姩鎸夋懇妞呰Е鍙?, false);
  addImageIf(s, media.chair, { x: 0.75, y: 1.5, w: 3.7, h: 3.7, sizing: { type: "contain", w: 3.7, h: 3.7 } });
  s.addShape(pptx.ShapeType.roundRect, { x: 4.85, y: 1.65, w: 4.45, h: 3.25, fill: { color: "162744" }, line: { color: "2A4D73", width: 1 } });
  addBulletList(s, [
    "瑙﹀彂閮ㄤ綅锛氬ぇ鑵?/ 鎵嬭噦 / 鑲╅",
    "浜掓枼绛栫暐锛氬悓涓€鏃跺埢浠呭厑璁稿崟閮ㄤ綅婵€娲?,
    "鑷姩鍥為€€锛氭瘡娆℃縺娲?3 绉掑悗鍥炲埌寰呮満",
    "EEG 娉㈠舰鑱斿姩锛氭縺娲绘€佹尟骞呫€侀鐜囥€佸彂鍏夊寮?
  ], 5.05, 1.95, 4.0, 2.4);
  s.addText("浜や簰浠峰€硷細璁┾€滄兂璞″姩浣溾€濊浆鍖栦负鍙銆佸彲鎺с€佸彲瑙ｉ噴鐨勫灞呭弽棣堛€?, {
    x: 4.95,
    y: 4.5,
    w: 4.2,
    h: 0.35,
    fontFace: "Calibri",
    fontSize: 12,
    italic: true,
    color: C.primary
  });
}

// 8. 鎯呮劅妫€娴?
{
  const s = pptx.addSlide();
  addBg(s, false);
  addTitle(s, "鎯呮劅妫€娴嬫ā鍧?, "12 閫氶亾鑴戞尝 + 棰戞鍔熺巼 + 鐢熷懡浣撳緛铻嶅悎", false);

  const labels = ["Alpha", "Beta", "Theta", "Delta"];
  const values = [72, 58, 63, 40];
  s.addChart(pptx.ChartType.bar, [{ name: "鍔熺巼", labels, values }], {
    x: 0.75,
    y: 1.65,
    w: 4.7,
    h: 2.9,
    barDir: "col",
    chartColors: ["028090", "00A896", "84DCC6", "2F3C7E"],
    showLegend: false,
    catAxisLabelColor: "AFC6E8",
    valAxisLabelColor: "AFC6E8",
    valGridLine: { color: "2A4D73", size: 0.5 },
    catGridLine: { style: "none" },
    showValue: true,
    dataLabelColor: "1F2937"
  });

  s.addShape(pptx.ShapeType.roundRect, { x: 5.7, y: 1.65, w: 3.6, h: 2.9, fill: { color: "162744" }, line: { color: "2A4D73", width: 1 } });
  s.addText("鎯呮劅鐘舵€佸垽瀹?, { x: 5.9, y: 1.85, w: 3.0, h: 0.3, fontFace: "Cambria", fontSize: 18, bold: true, color: C.dark });
  s.addText("鏀炬澗 / 涓€?/ 鐒﹁檻 / 鍘嬪姏", { x: 5.9, y: 2.22, w: 3.1, h: 0.3, fontFace: "Calibri", fontSize: 13, color: C.text });
  s.addText("鐢熷懡浣撳緛鑱斿姩锛歋pO2銆佽鍘嬨€佸績鐜嘰n鎻愰珮绯荤粺鍙В閲婃€т笌椋庨櫓鎻愮ず鑳藉姏", {
    x: 5.9,
    y: 2.72,
    w: 3.2,
    h: 0.95,
    fontFace: "Calibri",
    fontSize: 13,
    color: C.text
  });
  addImageIf(s, media.health, { x: 5.9, y: 3.75, w: 3.2, h: 0.7, sizing: { type: "contain", w: 3.2, h: 0.7 } });
}

// 9. 璇煶妯″潡
{
  const s = pptx.addSlide();
  addBg(s, false);
  addTitle(s, "璇煶鏅鸿兘绠″妯″潡", "璇煶璇嗗埆 + 鏂囨湰鍥為€€ + 瀹跺眳鐘舵€佽仈鍔?, false);

  s.addShape(pptx.ShapeType.rect, { x: 0.8, y: 1.7, w: 4.35, h: 3.15, fill: { color: "162744" }, line: { color: "2A4D73", width: 1 } });
  addBulletList(s, [
    "Web Speech API 瀹炴椂璇嗗埆锛屾敮鎸佸璇█鍒囨崲",
    "涓枃鏁板瓧瑙ｆ瀽锛氭敮鎸佲€滀竴搴︺€佸崄搴︹€濈瓑鍙ｈ娓╁害琛ㄨ揪",
    "璁惧鎺у埗锛氱伅鍏夈€佺獥甯樸€佺┖璋冦€侀煶涔?,
    "鍦烘櫙妯″紡锛氬洖瀹?/ 绂诲 / 鐫＄湢"
  ], 1.0, 1.98, 3.95, 2.35);

  s.addShape(pptx.ShapeType.rect, { x: 5.35, y: 1.7, w: 4.0, h: 1.45, fill: { color: "132840" }, line: { color: C.secondary, width: 1 } });
  s.addText("鍙岄€氶亾鍏滃簳", { x: 5.6, y: 1.95, w: 2.0, h: 0.3, fontFace: "Cambria", fontSize: 17, bold: true, color: C.dark });
  s.addText("璇煶涓嶅彲鐢ㄦ椂鑷姩鍥為€€鏂囨湰杈撳叆锛屼繚璇佹紨绀虹ǔ瀹氭€с€?, { x: 5.6, y: 2.35, w: 3.5, h: 0.45, fontFace: "Calibri", fontSize: 12.5, color: C.text });

  addVideoIf(s, media.vLightOn, media.robot, { x: 5.35, y: 3.35, w: 1.9, h: 1.35 });
  addVideoIf(s, media.vLightOff, media.robot, { x: 7.45, y: 3.35, w: 1.9, h: 1.35 });
}

// 10. Brain pods
{
  const s = pptx.addSlide();
  addBg(s, false);
  addTitle(s, "Brain Pods 瀛愮郴缁?, "浠庢帶鍒剁郴缁熷崌绾т负鍋ュ悍绠＄悊涓庤皟鑺傚钩鍙?, false);

  const cols = [
    ["鐤插姵妫€娴?, "宸﹀彸鑴戞洸绾?+ 鐤插姵鎸囨暟 + 鍖荤敓寤鸿", media.work],
    ["鍋ュ悍妫€娴?, "7 鏃ュ洓缁存寚鏍?+ 闆疯揪鍥?+ 椋庨櫓绛夌骇", media.health],
    ["鍔╃湢/涓撴敞", "妯″紡 + 寮哄害绛栫暐 + 楂樺己搴﹀畨鍏ㄧ‘璁?, media.sleep]
  ];
  cols.forEach((c, i) => {
    const x = 0.7 + i * 3.15;
    s.addShape(pptx.ShapeType.rect, { x, y: 1.55, w: 2.9, h: 3.85, fill: { color: "162744" }, line: { color: "2A4D73", width: 1 } });
    addImageIf(s, c[2], { x: x + 0.15, y: 1.72, w: 2.6, h: 1.45, sizing: { type: "cover", w: 2.6, h: 1.45 } });
    s.addText(c[0], { x: x + 0.2, y: 3.32, w: 2.5, h: 0.32, fontFace: "Cambria", fontSize: 18, bold: true, color: C.dark, align: "center" });
    s.addText(c[1], { x: x + 0.24, y: 3.72, w: 2.4, h: 1.0, fontFace: "Calibri", fontSize: 12, color: C.text, align: "center" });
  });
}

// 11. 鍏抽敭鎶€鏈疄鐜?
{
  const s = pptx.addSlide();
  addBg(s, false);
  addTitle(s, "鍏抽敭鎶€鏈疄鐜?, "绾墠绔疄鐜板鏉備氦浜掍笌鍙鍖?, false);

  s.addTable([
    [{ text: "鎶€鏈煙", options: { bold: true, color: "162744", fill: { color: C.primary }, align: "center" } }, { text: "瀹炵幇缁嗚妭", options: { bold: true, color: "162744", fill: { color: C.primary }, align: "center" } }],
    ["鍓嶇鎶€鏈爤", "HTML / CSS / 鍘熺敓 JS / Canvas / Web Speech API"],
    ["鐘舵€佺鐞?, "鍚勬ā鍧楃嫭绔?state 瀵硅薄锛岄伩鍏嶈€﹀悎"],
    ["鍒锋柊鏈哄埗", "requestAnimationFrame 椹卞姩楂橀鍥惧舰娓叉煋"],
    ["瑙勫垯鍒ゅ畾", "鎯呮劅鍒嗙被銆佺柌鍔宠瘎鍒嗐€侀闄╄瘎浼拌鍒欏紩鎿?]
  ], {
    x: 0.8,
    y: 1.6,
    w: 8.4,
    h: 2.8,
    colW: [2.0, 6.4],
    fontFace: "Calibri",
    fontSize: 13,
    border: { pt: 0.6, color: "2A4D73" },
    fill: { color: "162744" },
    valign: "middle"
  });

  s.addShape(pptx.ShapeType.roundRect, { x: 0.8, y: 4.55, w: 8.4, h: 0.7, fill: { color: "142D4A" }, line: { color: "2A4D73", width: 1 } });
  s.addText("宸ョ▼浼樺娍锛氶浂鍚庣渚濊禆銆侀儴缃茶交閲忋€佹紨绀虹ǔ瀹氥€佸彲蹇€熻縼绉昏嚦鐪熷疄纭欢閾捐矾銆?, {
    x: 1.0,
    y: 4.77,
    w: 8.0,
    h: 0.3,
    fontFace: "Calibri",
    fontSize: 14,
    bold: true,
    color: C.dark
  });
}

// 12. 婕旂ず娴佺▼
{
  const s = pptx.addSlide();
  addBg(s, false);
  addTitle(s, "婕旂ず娴佺▼锛堟椂闂磋酱锛?, "10 鍒嗛挓绛旇京涓殑鎺ㄨ崘涓茶仈鑺傚", false);

  const steps = [
    "杩涘叆 SSVEP锛氳皟瀵规瘮搴﹀苟瑙﹀彂鐩爣鍔ㄤ綔",
    "鍒囨崲 MI锛氳Е鍙戦儴浣嶆寜鎽╁苟瑙傚療 EEG 婵€娲?,
    "鍒囨崲鎯呮劅锛氬睍绀虹姸鎬佷笌鐢熷懡浣撳緛鑱斿姩",
    "鍒囨崲璇煶锛氫笅杈惧彛浠ゅ苟瑙傚療璁惧鐘舵€佸彉鍖?,
    "杩涘叆 Brain pods锛氬睍绀虹柌鍔?>鍋ュ悍->璋冭妭闂幆"
  ];

  steps.forEach((t, i) => {
    const y = 1.5 + i * 0.78;
    s.addShape(pptx.ShapeType.ellipse, { x: 0.9, y: y + 0.12, w: 0.24, h: 0.24, fill: { color: C.primary }, line: { color: C.primary, width: 1 } });
    s.addText(String(i + 1), { x: 0.9, y: y + 0.12, w: 0.24, h: 0.24, fontFace: "Calibri", fontSize: 10, bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
    s.addShape(pptx.ShapeType.rect, { x: 1.25, y, w: 6.2, h: 0.5, fill: { color: i % 2 ? "162744" : "132840" }, line: { color: "2A4D73", width: 0.6 } });
    s.addText(t, { x: 1.42, y: y + 0.15, w: 5.8, h: 0.22, fontFace: "Calibri", fontSize: 13, color: C.text, margin: 0 });
  });

  addVideoIf(s, media.vOpen, media.robot, { x: 7.65, y: 1.65, w: 1.55, h: 1.1 });
  addVideoIf(s, media.vClose, media.robot, { x: 7.65, y: 2.95, w: 1.55, h: 1.1 });
  addVideoIf(s, media.vMusicOn, media.robot, { x: 7.65, y: 4.25, w: 1.55, h: 1.1 });
}

// 13. 鎴愭灉涓庝环鍊?
{
  const s = pptx.addSlide();
  addBg(s, false);
  addTitle(s, "椤圭洰鎴愭灉涓庝环鍊?, "鍔熻兘瀹屾垚搴?+ 灞曠ず浠峰€?+ 搴旂敤娼滃姏", false);

  const stats = [
    ["4", "涓讳氦浜掓ā鍧?],
    ["3", "Brain Pods 瀛愮郴缁?],
    ["16", "寤鸿绛旇京椤垫暟"],
    ["1", "澶氭ā鎬侀棴鐜钩鍙?]
  ];
  stats.forEach((st, i) => {
    const x = 0.85 + i * 2.25;
    s.addShape(pptx.ShapeType.roundRect, { x, y: 1.7, w: 2.0, h: 1.55, fill: { color: i % 2 ? "162744" : "132840" }, line: { color: "2A4D73", width: 1 } });
    s.addText(st[0], { x, y: 2.03, w: 2.0, h: 0.5, fontFace: "Cambria", fontSize: 42, bold: true, color: C.primary, align: "center" });
    s.addText(st[1], { x, y: 2.72, w: 2.0, h: 0.2, fontFace: "Calibri", fontSize: 12, color: C.text, align: "center" });
  });

  addBulletList(s, [
    "灞曠ず浠峰€硷細鍙鍖栧己銆佽矾寰勬竻鏅般€佺瓟杈╁弸濂?,
    "搴旂敤浠峰€硷細闈㈠悜鐗规畩浜虹兢杈呭姪浜や簰涓庤剳鍋ュ悍绠＄悊",
    "宸ョ▼浠峰€硷細涓虹湡瀹?EEG + 鏅鸿兘瀹跺眳鍗忚鎺ュ叆棰勭暀鏋舵瀯"
  ], 0.95, 3.65, 6.1, 1.6);
  addImageIf(s, media.robot, { x: 7.15, y: 3.35, w: 2.15, h: 1.85, sizing: { type: "contain", w: 2.15, h: 1.85 } });
}

// 14. 灞€闄愪笌椋庨櫓
{
  const s = pptx.addSlide();
  addBg(s, false);
  addTitle(s, "灞€闄愭€т笌椋庨櫓杈圭晫", "涓诲姩澹版槑杈圭晫锛屾彁鍗囦笓涓氬彲淇″害", false);

  const warnings = [
    "褰撳墠浣跨敤妯℃嫙 EEG/鐢熺悊鏁版嵁锛屼笉鐢ㄤ簬鍖荤枟璇婃柇",
    "灏氭湭鎺ュ叆鐪熷疄 EEG 纭欢涓庡湪绾垮垎绫绘ā鍨?,
    "璇煶璇嗗埆鍙楁祻瑙堝櫒鐗堟湰涓庣綉缁滅姸鎬佸奖鍝?,
    "SSVEP 闀挎椂闂存敞瑙嗗彲鑳藉紩鍙戣瑙夌柌鍔?
  ];
  warnings.forEach((w, i) => {
    const y = 1.65 + i * 0.88;
    s.addShape(pptx.ShapeType.roundRect, { x: 0.8, y, w: 8.6, h: 0.62, fill: { color: i % 2 ? "162744" : "FFF8EE" }, line: { color: "F7D6A8", width: 0.8 } });
    s.addText("椋庨櫓 " + (i + 1), { x: 1.0, y: y + 0.2, w: 0.8, h: 0.22, fontFace: "Calibri", fontSize: 12, bold: true, color: "B45309" });
    s.addText(w, { x: 1.75, y: y + 0.19, w: 7.3, h: 0.25, fontFace: "Calibri", fontSize: 13, color: C.text });
  });
}

// 15. 鏈潵宸ヤ綔
{
  const s = pptx.addSlide();
  addBg(s, false);
  addTitle(s, "鏈潵宸ヤ綔", "浠庡師鍨嬭蛋鍚戝伐绋嬪寲涓庤惤鍦板寲", false);

  const plan = [
    "鎺ュ叆鐪熷疄 EEG 璁惧涓庡湪绾胯В鐮佺畻娉?,
    "寮曞叆鏈哄櫒瀛︿範妯″瀷鎻愬崌鎯呮劅/鐤插姵鍒ゅ畾绮惧害",
    "鎺ュ叆 MQTT / Matter / Home Assistant 瀹炵幇鐪熸満鑱旀帶",
    "寤虹珛闀挎湡鐢ㄦ埛鐢诲儚涓庝釜鎬у寲寤鸿绯荤粺",
    "鏂板瀹為獙璁板綍瀵煎嚭涓庨噺鍖栬瘎浼扮湅鏉?
  ];

  addBulletList(s, plan, 0.85, 1.55, 5.8, 3.0);
  addImageIf(s, media.work, { x: 6.85, y: 1.6, w: 2.6, h: 1.45, sizing: { type: "cover", w: 2.6, h: 1.45 } });
  addImageIf(s, media.sleep, { x: 6.85, y: 3.25, w: 2.6, h: 1.45, sizing: { type: "cover", w: 2.6, h: 1.45 } });
}

// 16. 缁撴潫椤?
{
  const s = pptx.addSlide();
  addBg(s, true);
  addTitle(s, "璋㈣阿鑱嗗惉", "Q&A", true);
  s.addText("浠庢帶鍒跺埌鎰熺煡锛屽啀鍒拌皟鑺俓n鎴戜滑鏋勫缓浜嗕竴涓妯℃€佽剳鏈烘櫤鑳藉灞呴棴鐜師鍨嬨€?, {
    x: 0.8,
    y: 2.0,
    w: 5.4,
    h: 1.3,
    fontFace: "Calibri",
    fontSize: 25,
    bold: true,
    color: "E8F8FF"
  });
  s.addText("娆㈣繋鎻愰棶", {
    x: 0.8,
    y: 4.35,
    w: 2.2,
    h: 0.5,
    fontFace: "Cambria",
    fontSize: 20,
    color: "2A4D73",
    italic: true
  });
  addImageIf(s, media.brainCover, { x: 5.4, y: 0.6, w: 4.2, h: 4.6, sizing: { type: "cover", w: 4.2, h: 4.6 } });
}

pptx.writeFile({ fileName: p("鑴戞満鎺ュ彛鏅鸿兘瀹跺眳-绛旇京.pptx") });

