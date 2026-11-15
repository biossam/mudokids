/* 무.도.키즈 차시 화면 (성장 MAP 차시 화면과 같은 틀)
   lesson.html?l=차시  — 탭: PPT · 활동지 · 수업 안내 · 선생님 자료,  수업 모드, 실시간 현황 */
(function () {
  var M = window.MDK, esc = M.esc;
  var q = new URLSearchParams(location.search);
  var base, info, cur = 0;
  var TAB_KEY = "mdk-lesson-tab";

  Promise.all([M.load(), fetch("data/lessons.json", { cache: "no-cache" }).then(function (r) { return r.json(); })]).then(function (res) {
    var no = Number(q.get("l")) || 1;
    base = M.data.lessons.filter(function (l) { return l.no === no; })[0] || M.data.lessons[0];
    info = res[1].lessons.filter(function (l) { return l.no === base.no; })[0];
    var s0 = Number(q.get("s")); if (s0 > 0) cur = Math.min(info.slides.length, s0) - 1;
    document.title = base.no + "차시 " + base.title + " · 무.도.키즈";
    document.getElementById("lesson-pick").innerHTML = M.data.lessons.map(function (l) {
      return '<a href="lesson.html?l=' + l.no + '" class="lp' + (l.no === base.no ? " is-on" : "") + '" title="' + l.no + "차시 " + esc(l.title) + '">' + esc(l.letter) + "</a>";
    }).join("");
    render();
  }).catch(function (e) { document.getElementById("app").innerHTML = '<p class="status">' + esc(e.message || "불러오지 못했어요.") + "</p>"; });

  var STAGE = { "도입": "s-in1", "전개": "s-in2", "정리": "s-in3" };
  var PHASE = { p1: "나와 AI 이해하기", p2: "함께 연결하기", p3: "실천하고 미래 만들기" };

  function render() {
    var nx = M.data.lessons.filter(function (l) { return l.no === base.no + 1; })[0];
    var pv = M.data.lessons.filter(function (l) { return l.no === base.no - 1; })[0];
    var app = document.getElementById("app");
    app.innerHTML =
      '<p class="crumb"><a href="./#lessons">RUNNING MAN 10차시</a></p>' +
      '<section class="lhead ' + info.phase + '">' +
        '<span class="lbadge">' + esc(base.letter) + "</span>" +
        '<div class="ltitle"><p class="lmeta"><b>' + base.no + "차시</b> <span class=\"lchip\">" + esc(base.word) + "</span> " + PHASE[info.phase] + "</p>" +
          "<h1>" + esc(base.title) + "</h1><p class=\"ltopic\">" + esc(info.topic) + "</p></div>" +
        '<div class="lside"><div class="lgoal"><span>학습 문제</span>' + esc(info.goal) + "</div>" +
          '<div class="lbtns"><button class="btn primary" id="open-cm">▶ 수업 모드</button><a class="btn ghost" href="live.html?l=' + base.no + '" target="_blank" rel="noopener">실시간 현황</a></div></div>' +
      "</section>" +
      '<div class="ltabs" role="tablist">' +
        tabBtn("ppt", "PPT") + tabBtn("sheet", "활동지") + tabBtn("guide", "수업 안내") + tabBtn("teacher", "선생님 자료") +
      "</div>" +
      '<section class="lpane" data-pane="ppt">' + pptHtml() + "</section>" +
      '<section class="lpane" data-pane="sheet" hidden>' + sheetPane() + "</section>" +
      '<section class="lpane" data-pane="guide" hidden>' + guideHtml() + "</section>" +
      '<section class="lpane" data-pane="teacher" hidden>' + teacherHtml() + "</section>" +
      '<nav class="lnext">' +
        (pv ? '<a class="prev" href="lesson.html?l=' + pv.no + '"><span>이전 차시</span><b>' + esc(pv.letter) + " · " + esc(pv.title) + "</b></a>" : "<span></span>") +
        (nx ? '<a class="next" href="lesson.html?l=' + nx.no + '"><span>다음 차시</span><b>' + esc(nx.letter) + " · " + esc(nx.title) + "</b></a>" : "") +
      "</nav>";
    app.querySelector(".ltabs").addEventListener("click", function (e) { var b = e.target.closest("[data-tab]"); if (b) showTab(b.dataset.tab); });
    var saved = location.hash.slice(1) || sessionStorage.getItem(TAB_KEY) || "ppt";
    showTab(["ppt", "sheet", "guide", "teacher"].indexOf(saved) >= 0 ? saved : "ppt");
    document.getElementById("open-cm").onclick = function () { openClass(0); };
    bindPpt();
  }

  function tabBtn(id, label) { return '<button type="button" role="tab" data-tab="' + id + '">' + label + "</button>"; }

  function showTab(id) {
    document.querySelectorAll(".ltabs [data-tab]").forEach(function (b) { var on = b.dataset.tab === id; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); });
    document.querySelectorAll(".lpane").forEach(function (p) { p.hidden = p.dataset.pane !== id; });
    try { sessionStorage.setItem(TAB_KEY, id); } catch (e) {}
    history.replaceState(null, "", location.pathname + location.search + (id === "ppt" ? "" : "#" + id));
    if (id === "sheet") fitFrame();
  }

  /* ── PPT ── */
  function pptHtml() {
    return '<div class="ppt">' +
      '<div class="ppt-main"><div class="ppt-stage" id="stage"></div>' +
        '<div class="ppt-bar"><span class="ppt-count" id="count"></span>' +
          '<span class="ppt-nav"><button class="btn ghost small" id="prev" aria-label="이전 장">◀</button><button class="btn ghost small" id="next" aria-label="다음 장">▶</button></span>' +
          '<button class="btn ghost small" id="from-here">▶ 이 장부터 수업 모드</button></div>' +
        '<div class="ppt-note"><span>발표자 메모</span><p id="note"></p></div>' +
      "</div>" +
      '<div class="ppt-thumbs" id="thumbs">' + info.slides.map(function (s, i) {
        return '<button class="thumb" data-i="' + i + '" aria-label="' + (i + 1) + "장 " + esc(M.slideTitle(base, info, s)) + '">' + M.slideHtml(base, info, s, i) + "</button>";
      }).join("") + "</div></div>";
  }

  function bindPpt() {
    document.getElementById("thumbs").addEventListener("click", function (e) { var t = e.target.closest(".thumb"); if (t) go(Number(t.dataset.i)); });
    document.getElementById("prev").onclick = function () { go(cur - 1); };
    document.getElementById("next").onclick = function () { go(cur + 1); };
    document.getElementById("from-here").onclick = function () { openClass(cur); };
    document.addEventListener("keydown", function (e) {
      if (!document.getElementById("cm").hidden || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
      if (document.querySelector('.lpane[data-pane="ppt"]').hidden) return;
      if (e.key === "ArrowRight") go(cur + 1); else if (e.key === "ArrowLeft") go(cur - 1);
    });
    go(cur);
  }

  function go(i) {
    cur = Math.max(0, Math.min(info.slides.length - 1, i));
    var s = info.slides[cur];
    document.getElementById("stage").innerHTML = M.slideHtml(base, info, s, cur);
    document.getElementById("count").innerHTML = "<b>" + (cur + 1) + " / " + info.slides.length + "</b> " + esc(M.slideTitle(base, info, s));
    document.getElementById("note").textContent = s.note || "";
    document.querySelectorAll(".thumb").forEach(function (t) { t.classList.toggle("on", Number(t.dataset.i) === cur); });
    var on = document.querySelector(".thumb.on"); if (on && on.scrollIntoViewIfNeeded) on.scrollIntoViewIfNeeded(false);
  }

  /* ── 활동지 ── */
  function sheetUrl(pi) { return "sheet.html?l=" + base.no + "&embed=1" + (pi != null ? "#p" + pi : ""); }

  function sheetPane() {
    return '<div class="sheet-intro"><p>학생이 화면에서 바로 쓰는 활동지예요. 교실 링크 <b>무.도.키즈 활동지</b> 탭에서 <b>학생에게 보내기</b>를 누르면 참여 코드가 들어간 링크가 학생에게 가고, 쓰는 내용이 <b>실시간 현황</b>에 모여요.</p>' +
      '<p class="small">여기서 써 보는 내용은 이 기기에만 저장돼요. <a href="sheet.html?l=' + base.no + '" target="_blank" rel="noopener">새 창으로 열기</a></p></div>' +
      '<iframe class="sheet-frame" id="sheet-frame" src="' + sheetUrl() + '" title="' + base.no + '차시 활동지"></iframe>';
  }

  function fitFrame() {
    var f = document.getElementById("sheet-frame"); if (!f) return;
    try { var h = f.contentDocument.documentElement.scrollHeight; if (h > 200) f.style.height = h + 20 + "px"; } catch (e) {}
  }
  window.addEventListener("message", function (e) {
    if (e.data && e.data.mdkSheetHeight) { var f = document.getElementById("sheet-frame"); if (f && e.source === f.contentWindow) f.style.height = e.data.mdkSheetHeight + 20 + "px"; }
  });

  /* ── 수업 안내 ── */
  function guideHtml() {
    return '<div class="guide-grid"><div>' +
      '<h2 class="g-title">수업 흐름 <span class="small">40분</span></h2><ol class="flow">' + info.steps.map(function (s) {
        return '<li class="' + (STAGE[s.stage] || "") + '"><span class="f-stage">' + esc(s.stage) + "<em>" + s.min + "분</em></span><div><b>" + esc(s.title) + "</b><p>" + esc(s.text) + "</p></div></li>";
      }).join("") + "</ol></div>" +
      "<aside>" +
        '<div class="g-box"><h3>핵심 질문</h3><ul>' + info.questions.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>" +
        '<div class="g-box"><h3>준비물</h3><ul>' + info.materials.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>" +
        '<div class="g-box"><h3>휴먼스킬</h3><p class="skills">' + info.skills.map(function (k) { return "<i>" + esc(k.name) + "</i>"; }).join("") + "</p></div>" +
      "</aside></div>" +
      '<h2 class="g-title">지도할 때 유의점</h2><ul class="cautions">' + info.cautions.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
  }

  /* ── 선생님 자료 ── */
  function teacherHtml() {
    return '<h2 class="g-title">휴먼스킬 목표</h2><div class="skill-cards">' + info.skills.map(function (k) {
        return '<div class="g-box"><h3>' + esc(k.name) + '</h3><dl><dt>지식·이해</dt><dd>' + esc(k.know) + "</dd><dt>과정·기능</dt><dd>" + esc(k.do) + "</dd><dt>가치·태도</dt><dd>" + esc(k.value) + "</dd></dl></div>";
      }).join("") + "</div>" +
      '<h2 class="g-title">평가 기준</h2><div class="table-wrap"><table class="live eval"><thead><tr><th>평가 관점</th><th>평가 목표</th><th>상</th><th>중</th><th>하</th><th>방법</th></tr></thead><tbody>' +
        info.eval.map(function (v) { return "<tr><td><b>" + esc(v.skill) + "</b></td><td>" + esc(v.goal) + "</td><td>" + esc(v.high) + "</td><td>" + esc(v.mid) + "</td><td>" + esc(v.low) + "</td><td>" + esc(v.method) + "</td></tr>"; }).join("") +
      "</tbody></table></div>" +
      '<h2 class="g-title">수업 준비 메모</h2><ul class="cautions">' + info.prep.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" +
      (info.links.length ? '<h2 class="g-title">수업 자료 링크</h2><ul class="cautions">' + info.links.map(function (x) { return '<li><a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.label) + "</a></li>"; }).join("") + "</ul>" : "") +
      '<p class="small" style="margin-top:24px">실시간 현황은 교실 링크 교사 화면 → 무.도.키즈 활동지 탭 → 실시간 현황으로 열어야 학생 기록과 연결돼요.</p>';
  }

  /* ── 수업 모드 ── */
  var cmI = 0, cmView = "slide";
  function openClass(start) {
    cmI = start || 0; cmView = "slide";
    var cm = document.getElementById("cm");
    cm.innerHTML =
      '<div class="cm-top"><span class="cm-title"><b>' + base.no + "차시</b> " + esc(base.letter) + " · " + esc(base.title) + "</span>" +
        '<span class="cm-tools"><button class="cm-btn" id="cm-sheet">활동지</button>' +
        '<a class="cm-btn" href="live.html?l=' + base.no + '" target="_blank" rel="noopener">실시간 현황</a>' +
        '<button class="cm-btn" id="cm-note">메모</button><button class="cm-btn" id="cm-full">전체 화면</button>' +
        '<button class="cm-close" id="cm-close" aria-label="수업 모드 닫기">✕</button></span></div>' +
      '<div class="cm-body"><div class="cm-stage" id="cm-stage"></div><div class="cm-sheet" id="cm-sheetbox" hidden><iframe id="cm-frame" title="활동지"></iframe></div></div>' +
      '<div class="cm-notebox" id="cm-notebox" hidden></div>' +
      '<div class="cm-bottom"><button class="cm-arrow" id="cm-prev" aria-label="이전">‹</button><span id="cm-count"></span><button class="cm-arrow" id="cm-next" aria-label="다음">›</button></div>';
    cm.hidden = false; document.body.classList.add("no-scroll");
    cm.querySelector("#cm-prev").onclick = function () { cmGo(cmI - 1); };
    cm.querySelector("#cm-next").onclick = function () { cmGo(cmI + 1); };
    cm.querySelector("#cm-close").onclick = closeClass;
    cm.querySelector("#cm-sheet").onclick = toggleSheet;
    cm.querySelector("#cm-note").onclick = function () { var n = document.getElementById("cm-notebox"); n.hidden = !n.hidden; this.classList.toggle("on", !n.hidden); };
    cm.querySelector("#cm-full").onclick = function () {
      if (document.fullscreenElement) document.exitFullscreen(); else if (cm.requestFullscreen) cm.requestFullscreen();
    };
    cmGo(cmI);
  }
  function closeClass() {
    var cm = document.getElementById("cm"); cm.hidden = true; cm.innerHTML = ""; document.body.classList.remove("no-scroll");
    if (document.fullscreenElement) document.exitFullscreen();
    go(cmI);
  }
  function cmGo(i) {
    if (cmView === "sheet") toggleSheet();
    cmI = Math.max(0, Math.min(info.slides.length - 1, i));
    var s = info.slides[cmI];
    document.getElementById("cm-stage").innerHTML = M.slideHtml(base, info, s, cmI);
    document.getElementById("cm-count").textContent = (cmI + 1) + " / " + info.slides.length;
    document.getElementById("cm-notebox").textContent = s.note || "";
    var sb = document.getElementById("cm-sheet");
    sb.classList.toggle("glow", s.sheet != null);
    sb.textContent = s.sheet != null ? "활동지 " + (s.sheet + 1) : "활동지";
  }
  function toggleSheet() {
    var box = document.getElementById("cm-sheetbox"), stage = document.getElementById("cm-stage"), btn = document.getElementById("cm-sheet");
    var s = info.slides[cmI];
    if (cmView === "slide") {
      var f = document.getElementById("cm-frame"), want = sheetUrl(s.sheet != null ? s.sheet : null);
      if (f.dataset.src !== want) { f.src = want; f.dataset.src = want; }
      box.hidden = false; stage.hidden = true; cmView = "sheet"; btn.textContent = "PPT로 돌아가기"; btn.classList.add("on");
    } else {
      box.hidden = true; stage.hidden = false; cmView = "slide"; btn.classList.remove("on");
      btn.textContent = s.sheet != null ? "활동지 " + (s.sheet + 1) : "활동지";
    }
  }
  document.addEventListener("keydown", function (e) {
    var cm = document.getElementById("cm"); if (cm.hidden) return;
    if (/INPUT|TEXTAREA/.test((document.activeElement || {}).tagName || "")) return;
    if (e.key === "Escape") { if (!document.fullscreenElement) closeClass(); }
    else if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); cmGo(cmI + 1); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); cmGo(cmI - 1); }
    else if (e.key === "w" || e.key === "W") toggleSheet();
  });
})();
