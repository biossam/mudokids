/* 무.도.키즈 RUNNING MAN 10차시 수업 PPT 만들기
   data/lessons.json + data/sheets.json → files/<차시>/ppt.pptx
   사이트의 웹 슬라이드와 같은 내용·순서, 발표자 메모는 PowerPoint 슬라이드 노트로.
   실행: node tools/build_pptx.js  (pptxgenjs 필요)  */
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");

const ROOT = path.resolve(__dirname, "..");
const SKILL_THEME = process.env.APPLY_THEME_JS; // 테마 색 적용 스크립트 경로 (없으면 건너뜀)
const lessons = JSON.parse(fs.readFileSync(path.join(ROOT, "data/lessons.json"), "utf8")).lessons;
const sheets = JSON.parse(fs.readFileSync(path.join(ROOT, "data/sheets.json"), "utf8")).lessons;

const PHASE = {
  p1: { name: "나와 AI 이해하기", color: "FF7A3D", tint: "FFF1E6" },
  p2: { name: "함께 연결하기", color: "3AA0FF", tint: "EAF4FF" },
  p3: { name: "실천하고 미래 만들기", color: "2FB67A", tint: "E7F8EF" },
};
const FONT = "맑은 고딕";
const CREDIT = "출처: 무.도.키즈 교사연구회, NAVER CONNECT, TEACHERS LAB 5";
const W = 13.333, H = 7.5, MX = 0.9;

function themeFor(ph) {
  return {
    name: "무도키즈 " + ph.name,
    headFontFace: FONT,
    bodyFontFace: FONT,
    colors: {
      dk1: "1D1B4B", lt1: "FFFFFF", dk2: "45436E", lt2: ph.tint,
      accent1: ph.color, accent2: "FF7A3D", accent3: "3AA0FF", accent4: "2FB67A", accent5: "E5484D", accent6: "8E8AA6",
      hlink: "1F6FC0", folHlink: "6D5BB8",
    },
  };
}

async function build(info) {
  const base = sheets.find((l) => l.no === info.no);
  const ph = PHASE[info.phase];
  const THEME = themeFor(ph);
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  pres.title = `${info.no}차시 ${base.title} · 무.도.키즈 RUNNING MAN`;
  pres.author = "무.도.키즈 교사연구회";
  pres.company = "무.도.키즈 교사연구회 · NAVER CONNECT · TEACHERS LAB 5";
  pres.subject = info.goal;
  const C = pres.SchemeColor;
  const lp = (s) => `${base.letter} · ${s}`;

  /* ── 레이아웃 ── */
  const deco = () => [];
  // 배경의 연한 동그라미 (웹 슬라이드와 같은 장식). 레이아웃은 동그라미를 못 넣어서 슬라이드마다 맨 먼저 그림
  function decorate(slide) {
    slide.addShape(pres.shapes.OVAL, { x: W - 3.1, y: -1.9, w: 4.6, h: 4.6, fill: { color: C.background2 }, line: { type: "none" }, objectName: "장식 동그라미 1" });
    slide.addShape(pres.shapes.OVAL, { x: -1.2, y: H - 1.5, w: 2.8, h: 2.8, fill: { color: C.background2 }, line: { type: "none" }, objectName: "장식 동그라미 2" });
    return slide;
  }
  const footer = [
    { text: { text: CREDIT, options: { x: W - 7.4, y: H - 0.52, w: 6.0, h: 0.3, fontSize: 10, color: C.accent6, align: "right", margin: 0 } } },
  ];
  const num = { x: W - 1.3, y: H - 0.52, w: 0.5, h: 0.3, fontSize: 10, color: C.accent6, align: "right" };

  pres.defineSlideMaster({
    title: "MDK_COVER", background: { color: C.background1 },
    objects: [...deco(),
      { placeholder: { options: { name: "kicker", type: "body", x: 4.55, y: 2.15, w: 7.9, h: 0.45, fontSize: 16, bold: true, color: C.accent1, margin: 0, align: "left" }, text: "" } },
      { placeholder: { options: { name: "title", type: "title", x: 4.55, y: 2.6, w: 7.9, h: 1.3, fontSize: 54, bold: true, color: C.text1, margin: 0, valign: "middle", align: "left" }, text: "" } },
      { placeholder: { options: { name: "sub", type: "body", x: 4.55, y: 3.95, w: 7.9, h: 0.8, fontSize: 20, color: C.text2, margin: 0, valign: "top", align: "left" }, text: "" } },
    ],
  });
  pres.defineSlideMaster({
    title: "MDK_CONTENT", background: { color: C.background1 },
    objects: [...deco(), ...footer,
      { placeholder: { options: { name: "kicker", type: "body", x: MX, y: 0.55, w: 9.5, h: 0.4, fontSize: 16, bold: true, color: C.accent1, margin: 0, align: "left" }, text: "" } },
      { placeholder: { options: { name: "title", type: "title", x: MX, y: 0.95, w: 11.2, h: 0.95, fontSize: 36, bold: true, color: C.text1, margin: 0, valign: "middle", align: "left" }, text: "" } },
    ],
    slideNumber: num,
  });
  pres.defineSlideMaster({
    title: "MDK_CENTER", background: { color: C.background1 },
    objects: [...deco(), ...footer,
      { placeholder: { options: { name: "kicker", type: "body", x: MX, y: 1.7, w: W - 2 * MX, h: 0.45, fontSize: 18, bold: true, color: C.accent1, align: "center", margin: 0 }, text: "" } },
      { placeholder: { options: { name: "title", type: "title", x: 1.6, y: 2.25, w: W - 3.2, h: 2.2, fontSize: 36, bold: true, color: C.text1, align: "center", valign: "middle", margin: 0 }, text: "" } },
    ],
    slideNumber: num,
  });

  /* ── 공통 그리기 ── */
  const T = (slide, text, o) => slide.addText(text, Object.assign({ isTextBox: true, fontFace: FONT, margin: 0, color: C.text1 }, o));
  // 잉크 테두리 + 아래 그림자 느낌의 카드 (웹 슬라이드의 동그란 카드)
  function chip(slide, x, y, w, h, text, o = {}) {
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: y + 0.08, w, h, rectRadius: 0.16, fill: { color: C.text1 }, line: { color: C.text1, width: 2 } });
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.16, fill: { color: o.fill || C.background1 }, line: { color: C.text1, width: 2 } });
    T(slide, text, { x: x + 0.1, y, w: w - 0.2, h, fontSize: o.size || 26, bold: true, align: "center", valign: "middle", color: o.color || C.text1, fit: "shrink" });
  }
  function tipBox(slide, text, y) {
    const yy = y == null ? H - 1.55 : y;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: MX, y: yy, w: W - 2 * MX, h: 0.75, rectRadius: 0.14, fill: { color: C.background2 }, line: { type: "none" } });
    T(slide, text, { x: MX + 0.3, y: yy, w: W - 2 * MX - 0.6, h: 0.75, fontSize: 16, color: C.text2, valign: "middle" });
  }
  function sheetTag(slide, s) {
    if (s.sheet == null) return;
    const p = base.parts[s.sheet];
    const label = `활동지 ${s.sheet + 1} · ${p ? p.title : ""}`;
    const w = Math.min(6, 0.6 + label.length * 0.17);
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: MX, y: H - 0.62, w, h: 0.36, rectRadius: 0.18, fill: { color: C.text1 }, line: { type: "none" } });
    T(slide, label, { x: MX, y: H - 0.62, w, h: 0.36, fontSize: 11, bold: true, color: C.background1, align: "center", valign: "middle" });
  }
  function letterRow(slide, cur, y, x0, size, filledAll) {
    let x = x0;
    sheets.forEach((l) => {
      if (l.no === 8) x += size * 0.5;
      const on = l.no === cur || filledAll, done = l.no < cur;
      slide.addShape(pres.shapes.OVAL, { x, y, w: size, h: size, fill: { color: on ? (filledAll ? C.accent1 : C.accent1) : C.background1 }, line: { color: on || done ? C.text1 : "E4DFD3", width: 1.5 } });
      T(slide, l.letter, { x, y, w: size, h: size, fontSize: Math.round(size * 30), bold: true, align: "center", valign: "middle", color: on ? C.background1 : done ? C.text1 : "C9C3B5" });
      x += size + 0.14;
    });
  }
  function bigLetter(slide, x, y, s, letter, size) {
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: y + 0.12, w: s, h: s, rectRadius: 0.5, fill: { color: C.text1 }, line: { color: C.text1, width: 3 } });
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: s, h: s, rectRadius: 0.5, fill: { color: C.background1 }, line: { color: C.text1, width: 3 } });
    T(slide, letter, { x, y, w: s, h: s, fontSize: size, bold: true, align: "center", valign: "middle", color: C.accent1 });
  }
  let curSec = null;
  const content = (s) => {
    const slide = decorate(pres.addSlide({ masterName: "MDK_CONTENT", sectionTitle: curSec }));
    if (s.kicker) slide.addText(s.kicker, { placeholder: "kicker" });
    slide.addText(s.title || "", { placeholder: "title" });
    return slide;
  };
  const section = (s) => (s.layout === "cover" || s.layout === "map" ? "여는 장" : /^도입/.test(s.kicker || "") || s.layout === "goal" ? "도입" : /^정리/.test(s.kicker || "") || ["next", "finish"].includes(s.layout) ? "정리" : "전개");

  /* ── 슬라이드 ── */
  let lastSection = null;
  for (const s of info.slides) {
    const sec = section(s);
    if (sec !== lastSection) { pres.addSection({ title: sec }); lastSection = sec; }
    curSec = sec;
    let slide;
    switch (s.layout) {
      case "cover": {
        slide = decorate(pres.addSlide({ masterName: "MDK_COVER", sectionTitle: sec }));
        slide.addText(`RUNNING MAN · ${base.no}차시 · ${base.word}`, { placeholder: "kicker" });
        slide.addText(base.title, { placeholder: "title" });
        slide.addText(info.topic, { placeholder: "sub" });
        const badgeFile = base.badge && path.join(ROOT, base.badge);
        if (badgeFile && fs.existsSync(badgeFile)) {
          const [bw, bh] = [fs.readFileSync(badgeFile).readUInt32BE(16), fs.readFileSync(badgeFile).readUInt32BE(20)];
          slide.addImage({ path: badgeFile, x: MX, y: 1.85, h: 3.4, w: 3.4 * bw / bh, altText: `${base.no}차시 배지 (Google Gemini로 생성한 이미지)`, objectName: "badge" });
        } else bigLetter(slide, MX, 1.95, 3.2, base.letter, 160);
        letterRow(slide, base.no, 5.6, MX, 0.55);
        T(slide, CREDIT + (badgeFile ? " · 차시 배지: Google Gemini로 생성한 이미지" : ""), { x: MX, y: 6.45, w: 9, h: 0.35, fontSize: 12, color: C.accent6 });
        break;
      }
      case "map": {
        slide = content({ kicker: "RUNNING MAN 10차시", title: base.no === 10 ? "우리가 달려온 길" : "10차시 동안 우리가 갈 길" });
        const cw = (W - 2 * MX - 4 * 0.25) / 5, ch = 1.85;
        sheets.forEach((l, i) => {
          const x = MX + (i % 5) * (cw + 0.25), y = 2.2 + Math.floor(i / 5) * (ch + 0.3);
          const pc = l.no <= 4 ? C.accent2 : l.no <= 7 ? C.accent3 : C.accent4;
          const on = l.no === base.no;
          slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: cw, h: ch, rectRadius: 0.14, fill: { color: C.background1 }, line: { color: on ? C.text1 : "ECE6DA", width: on ? 2.5 : 1 } });
          slide.addShape(pres.shapes.OVAL, { x: x + 0.2, y: y + 0.2, w: 0.7, h: 0.7, fill: { color: pc }, line: { type: "none" } });
          T(slide, l.letter, { x: x + 0.2, y: y + 0.2, w: 0.7, h: 0.7, fontSize: 24, bold: true, color: C.background1, align: "center", valign: "middle" });
          T(slide, `${l.no}차시`, { x: x + 1.0, y: y + 0.32, w: cw - 1.1, h: 0.45, fontSize: 12, bold: true, color: C.accent6, valign: "middle" });
          T(slide, l.title, { x: x + 0.2, y: y + 1.0, w: cw - 0.4, h: 0.7, fontSize: 16, bold: true, valign: "top" });
        });
        [["나와 AI 이해하기 · 1~4", C.accent2], ["함께 연결하기 · 5~7", C.accent3], ["실천하고 미래 만들기 · 8~10", C.accent4]].forEach(([t, c], i) => {
          const x = MX + i * 3.4;
          slide.addShape(pres.shapes.OVAL, { x, y: 6.55, w: 0.2, h: 0.2, fill: { color: c }, line: { type: "none" } });
          T(slide, t, { x: x + 0.3, y: 6.45, w: 3, h: 0.4, fontSize: 12, color: C.text2, valign: "middle" });
        });
        break;
      }
      case "goal": {
        slide = decorate(pres.addSlide({ masterName: "MDK_CENTER", sectionTitle: sec }));
        slide.addText("학습 문제", { placeholder: "kicker" });
        slide.addText(info.goal, { placeholder: "title" });
        break;
      }
      case "talk": {
        slide = content(s);
        const qs = s.questions || [];
        qs.forEach((q, i) => {
          const y = 2.25 + i * 1.25;
          slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: MX, y, w: W - 2 * MX, h: 1.0, rectRadius: 0.16, fill: { color: C.background1 }, line: { color: "ECE6DA", width: 1.5 } });
          slide.addShape(pres.shapes.OVAL, { x: MX + 0.3, y: y + 0.25, w: 0.5, h: 0.5, fill: { color: C.accent1 }, line: { type: "none" } });
          T(slide, "?", { x: MX + 0.3, y: y + 0.25, w: 0.5, h: 0.5, fontSize: 20, bold: true, color: C.background1, align: "center", valign: "middle" });
          T(slide, q, { x: MX + 1.05, y, w: W - 2 * MX - 1.3, h: 1.0, fontSize: 22, valign: "middle" });
        });
        if (s.link != null && info.links[s.link]) {
          const L = info.links[s.link], y = 2.25 + qs.length * 1.25 + 0.1;
          slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: MX, y, w: 4.2, h: 0.55, rectRadius: 0.27, fill: { color: C.accent5 }, line: { type: "none" } });
          T(slide, [{ text: "▶ " + L.label, options: { hyperlink: { url: L.url, tooltip: L.label }, color: C.background1, bold: true } }], { x: MX, y, w: 4.2, h: 0.55, fontSize: 15, align: "center", valign: "middle" });
        }
        break;
      }
      case "cards": {
        slide = content(s);
        const cards = s.cards || [];
        const longest = Math.max(...cards.map((c) => c.length));
        const perRow = longest > 8 ? 2 : cards.length > 6 ? 4 : cards.length > 4 ? 3 : cards.length;
        const gap = 0.35, cw = Math.min(longest > 8 ? 5.2 : 3.2, (W - 2 * MX - (perRow - 1) * gap) / perRow), chh = 1.0;
        cards.forEach((c, i) => {
          const r = Math.floor(i / perRow), col = i % perRow;
          chip(slide, MX + col * (cw + gap), 2.3 + r * (chh + 0.4), cw, chh, c, { fill: i % 3 === 0 ? C.background2 : C.background1, size: c.length > 6 ? 22 : 26 });
        });
        if (s.tip) tipBox(slide, s.tip);
        break;
      }
      case "activity": {
        slide = content(s);
        const steps = s.steps || [];
        const avail = (s.tip ? H - 1.8 : H - 1.0) - 2.25;
        const rowH = Math.min(1.25, avail / steps.length);
        steps.forEach((t, i) => {
          const y = 2.25 + i * rowH;
          slide.addShape(pres.shapes.OVAL, { x: MX, y: y + 0.08, w: 0.55, h: 0.55, fill: { color: C.accent1 }, line: { type: "none" } });
          T(slide, String(i + 1), { x: MX, y: y + 0.08, w: 0.55, h: 0.55, fontSize: 20, bold: true, color: C.background1, align: "center", valign: "middle" });
          T(slide, t, { x: MX + 0.85, y, w: W - 2 * MX - 0.9, h: rowH - 0.1, fontSize: 20, valign: "top", lineSpacingMultiple: 1.1 });
        });
        if (s.tip) tipBox(slide, s.tip);
        break;
      }
      case "matrix": {
        slide = content(s);
        let x = MX, y = 2.2;
        s.cards.forEach((c) => {
          const w = 0.6 + c.length * 0.27;
          if (x + w > W - MX) { x = MX; y += 0.75; }
          slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 0.58, rectRadius: 0.12, fill: { color: C.background1 }, line: { color: C.text2, width: 1.5, dashType: "dash" } });
          T(slide, c, { x, y, w, h: 0.58, fontSize: 16, bold: true, align: "center", valign: "middle" });
          x += w + 0.2;
        });
        const top = y + 1.0, cw = (W - 2 * MX - 2 * 0.3) / 3;
        s.cols.forEach((c, i) => {
          const xx = MX + i * (cw + 0.3);
          slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: xx, y: top, w: cw, h: H - 1.0 - top, rectRadius: 0.16, fill: { color: C.background2 }, line: { type: "none" } });
          T(slide, c, { x: xx, y: top + 0.2, w: cw, h: 0.5, fontSize: 18, bold: true, align: "center" });
        });
        break;
      }
      case "match": {
        slide = content(s);
        s.pairs.forEach((p, i) => {
          const col = i % 2, row = Math.floor(i / 2);
          const x = MX + col * 5.9, y = 2.4 + row * 1.45;
          chip(slide, x, y, 2.0, 0.95, p, { size: 26 });
          T(slide, "→", { x: x + 2.15, y, w: 0.6, h: 0.95, fontSize: 28, bold: true, color: C.accent1, align: "center", valign: "middle" });
          T(slide, "AI 시대의 ?", { x: x + 2.85, y, w: 2.7, h: 0.95, fontSize: 20, color: "B0ABBF", valign: "middle" });
          slide.addShape(pres.shapes.LINE, { x: x + 2.85, y: y + 0.82, w: 2.7, h: 0, line: { color: "CFC9BB", width: 1.5, dashType: "dash" } });
        });
        if (s.tip) tipBox(slide, s.tip);
        break;
      }
      case "split": {
        slide = content(s);
        const cw = (W - 2 * MX - 0.4) / 2, top = 2.25, hh = (s.tip ? H - 1.85 : H - 1.0) - top;
        [s.left, s.right].forEach((side, i) => {
          const x = MX + i * (cw + 0.4);
          slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: top, w: cw, h: hh, rectRadius: 0.18, fill: { color: i === 0 ? C.background2 : C.background1 }, line: i === 0 ? { type: "none" } : { color: "ECE6DA", width: 1.5 } });
          T(slide, side.head, { x: x + 0.4, y: top + 0.3, w: cw - 0.8, h: 0.6, fontSize: 24, bold: true });
          T(slide, side.items.map((it, k) => ({ text: it, options: { bullet: true, breakLine: k < side.items.length - 1 } })), { x: x + 0.4, y: top + 1.05, w: cw - 0.8, h: hh - 1.25, fontSize: 22, valign: "top", paraSpaceAfter: 10, color: C.text2 });
        });
        if (s.tip) tipBox(slide, s.tip);
        break;
      }
      case "sentence": {
        slide = content(s);
        const text = s.frame.replace(/_{3,}/g, "  ________  ");
        T(slide, text, { x: MX + 0.3, y: 2.3, w: W - 2 * MX - 0.6, h: s.tip ? 3.0 : 3.6, fontSize: 32, bold: true, align: "center", valign: "middle", lineSpacingMultiple: 1.3, fit: "shrink" });
        if (s.tip) tipBox(slide, s.tip);
        break;
      }
      case "next": {
        slide = decorate(pres.addSlide({ masterName: "MDK_CENTER", sectionTitle: sec }));
        slide.addText("다음 차시 예고", { placeholder: "kicker" });
        const nx = sheets.find((l) => l.no === base.no + 1);
        slide.addText(nx ? `${nx.no}차시 · ${nx.title}` : "", { placeholder: "title" });
        if (nx) bigLetter(slide, W / 2 - 0.65, 4.55, 1.3, nx.letter, 54);
        T(slide, s.text, { x: 1.6, y: 6.05, w: W - 3.2, h: 0.6, fontSize: 18, color: C.text2, align: "center", valign: "middle" });
        break;
      }
      case "finish": {
        slide = decorate(pres.addSlide({ masterName: "MDK_CENTER", sectionTitle: sec }));
        slide.addText("RUNNING MAN 완주!", { placeholder: "kicker" });
        slide.addText("화면 밖으로 나와 함께 뛰었어요", { placeholder: "title" });
        const size = 0.7, total = 10 * size + 9 * 0.14 + size * 0.5;
        letterRow(slide, 99, 4.9, (W - total) / 2, size, true);
        break;
      }
      default:
        slide = content(s);
    }
    sheetTag(slide, s);
    if (s.note) slide.addNotes(s.note);
  }

  const dir = path.join(ROOT, "files", String(info.no));
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, "ppt.pptx");
  await pres.writeFile({ fileName: out });
  if (SKILL_THEME) await require(SKILL_THEME).applyTheme(out, THEME);
  return out;
}

(async () => {
  const only = process.argv[2] ? Number(process.argv[2]) : null;
  for (const info of lessons) {
    if (only && info.no !== only) continue;
    console.log("made", path.relative(ROOT, await build(info)));
  }
})().catch((e) => { console.error(e); process.exit(1); });
