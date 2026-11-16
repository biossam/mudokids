/* 무.도.키즈 간단 교실 — 교실 링크 화면 없이 이 사이트 안에서만 쓰는 수업 공간
   class.html            처음 화면 (선생님: 수업 열기 / 학생: 참여 코드로 들어가기)
   class.html?room=CODE  학생 화면: 선생님이 띄운 활동지가 자동으로 바뀌고, 보낸 자료를 받음
   class.html?l=차시     선생님이 이 차시로 수업 열기
   서버: 교실 링크 서버의 /api/mdk (수업·띄우기·자료) + /api/snja (활동지 저장·실시간 현황)
   학생 화면 공유는 없음. 학생 이름은 서버로 보내지 않음. */
(function () {
  var M = window.MDK, esc = M.esc;
  var q = new URLSearchParams(location.search);
  var app = document.getElementById("app");
  var timer = null, seenShares = null;

  function toast(msg) {
    var t = document.getElementById("toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, 3500);
  }
  function serverQs() { var s = q.get("server"); return s ? "&server=" + encodeURIComponent(s) : ""; }
  function studentLink(code) { return location.href.split(/[?#]/)[0] + "?room=" + code + serverQs(); }
  function lessonOf(no) { return M.data.lessons.filter(function (l) { return l.no === Number(no); })[0]; }
  function cleanCode(v) { return String(v || "").replace(/[^0-9A-Za-z]/g, "").toUpperCase().slice(0, 6); }

  var SV = null;
  Promise.all([M.load(), fetch("data/survey.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).catch(function () { return null; })]).then(function (res) {
    SV = res[1];
    var room = cleanCode(q.get("room"));
    if (room) return student(room);
    var mine = M.myClass();
    if (mine) return teacher(mine);
    home();
  }).catch(function (e) { app.innerHTML = '<p class="status wrap">' + esc(e.message) + "</p>"; });

  /* ───────── 처음 화면 ───────── */
  function home() {
    document.getElementById("class-tag").textContent = "수업하기";
    app.innerHTML = '<section class="wrap c-home">' +
      '<h1 class="c-h1">무.도.키즈 수업하기</h1>' +
      '<p class="lead">선생님이 수업을 열면 6자리 참여 코드가 나오고, 학생은 코드로 들어와 선생님이 띄운 활동지를 써요.</p>' +
      '<div class="c-choose">' +
        '<div class="c-card"><span class="c-emoji" aria-hidden="true">🧑‍🏫</span><h2>선생님</h2><p>수업을 열고, 활동지를 학생 화면에 띄우고, 링크·파일을 보내요.</p>' +
          '<form id="open-form" class="c-open">' +
            '<label>선생님 이름<input id="t-name" maxlength="30" autocomplete="name" placeholder="초대 코드를 받을 때 쓴 이름"></label>' +
            '<label>초대 코드<input id="t-code" type="password" inputmode="numeric" autocomplete="off" placeholder="받은 8자리 숫자"></label>' +
            '<button class="btn primary" id="open">수업 열기</button></form>' +
          '<p class="small c-ask">초대 코드가 없으신가요? <a href="#" id="ask">초대 코드 요청하기</a></p>' +
          '<div class="c-demo"><button type="button" class="btn ghost small" id="demo">시연용 수업 열기</button> <a class="btn ghost small" href="howto.html" target="_blank" rel="noopener">사용법 한 장</a>' +
          '<p class="small">시연용은 코드 없이 바로 열려요. 1시간 뒤 닫히고, 파일은 보낼 수 없고, 링크는 무.도.키즈 주소만 보낼 수 있어요.</p></div></div>' +
        '<div class="c-card"><span class="c-emoji" aria-hidden="true">🙋</span><h2>학생</h2><p>선생님께 받은 참여 코드를 써요.</p>' +
          '<form id="join" class="c-join"><input id="code" maxlength="6" autocapitalize="characters" autocomplete="off" placeholder="참여 코드" aria-label="참여 코드"><button class="btn primary">들어가기</button></form></div>' +
      "</div>" +
      '<p class="small">수업은 선생님이 끝내거나, 선생님 창이 3시간 넘게 닫혀 있거나, 연 지 12시간이 지나면 자동으로 닫히고 기록과 보낸 파일이 모두 지워져요. 학생 화면 공유 기능은 없어요.</p>' +
      "</section>";
    try { document.getElementById("t-name").value = localStorage.getItem(NAME_KEY) || ""; } catch (e) {}
    document.getElementById("open-form").onsubmit = function (e) {
      e.preventDefault();
      var name = document.getElementById("t-name").value.trim(), code = document.getElementById("t-code").value.trim();
      if (!name) return toast("선생님 이름을 써 주세요.");
      if (!/^\d{4,}$/.test(code)) return toast("초대 코드를 숫자로 써 주세요.");
      try { localStorage.setItem(NAME_KEY, name); } catch (er) {}
      openClass({ action: "create", name: name, code: code });
    };
    document.getElementById("demo").onclick = function () { openClass({ action: "create", demo: true }); };
    document.getElementById("ask").onclick = function (e) {
      e.preventDefault();
      // 주소를 화면 글자로 두지 않고 누를 때 만들어 자동 수집을 줄임
      var to = ["classlink", "biossam.kr"].join("@");
      var body = "수업 열 때 쓸 이름(띄어쓰기 그대로): \n학교: \n쓰려는 수업: 무.도.키즈 RUNNING MAN\n";
      location.href = "mailto:" + to + "?subject=" + encodeURIComponent("무.도.키즈 · 교실 링크 초대 코드 요청") + "&body=" + encodeURIComponent(body);
      this.textContent = to + " (메일이 안 열리면 이 주소로 보내 주세요)";
    };
    document.getElementById("join").onsubmit = function (e) {
      e.preventDefault(); var c = cleanCode(document.getElementById("code").value);
      if (c.length !== 6) return toast("참여 코드 6자리를 써 주세요.");
      location.href = studentLink(c);
    };
  }

  var NAME_KEY = "mdk-teacher-name";
  function openClass(body) {
    var btn = document.getElementById(body.demo ? "demo" : "open"), label = btn ? btn.textContent : "";
    if (btn) { btn.disabled = true; btn.textContent = "여는 중…"; }
    M.call(body, "/api/mdk").then(function (r) {
      var codeIn = document.getElementById("t-code"); if (codeIn) codeIn.value = "";
      var c = { room: r.room, teacher: r.teacher, createdAt: r.createdAt, expiresAt: r.expiresAt, demo: !!r.demo, lesson: Number(q.get("l")) || 1 };
      M.saveClass(c); teacher(c);
      var l = Number(q.get("l")); if (l) M.push(l, null).then(function () { refreshTeacher(); });
    }).catch(function (e) {
      if (btn) { btn.disabled = false; btn.textContent = label; }
      toast(e.message + (e.status && e.status < 500 ? "" : " (서버가 잠들어 있으면 1분쯤 뒤에 다시 눌러 주세요.)"));
    });
  }

  /* ───────── 선생님 화면 ───────── */
  var T = { state: null, sel: 1 };
  function teacher(c) {
    T.c = c; T.sel = c.lesson || 1;
    document.getElementById("class-tag").innerHTML = (c.demo ? "시연용 · " : "선생님 · ") + "<b>" + esc(c.room) + "</b>";
    app.innerHTML = '<section class="wrap c-teacher">' +
      '<div class="c-top">' +
        '<div class="c-code"><div class="c-codetext"><span>참여 코드</span><b id="code-big">' + esc(c.room) + "</b>" +
          '<p class="small">학생은 <span class="c-url">' + esc(location.host + location.pathname.replace(/[^/]*$/, "")) + 'class.html</span> 에서 코드를 쓰거나 QR을 찍어요.</p>' +
          '<div class="c-codebtns"><button class="btn ghost small" id="copy">학생 링크 복사</button><button class="btn ghost small" id="big">코드 크게 보기</button></div>' +
          '<label class="c-maxno">학생 번호 1번 ~ <input id="maxno" inputmode="numeric" maxlength="2" placeholder="제한 없음" aria-label="가장 큰 학생 번호">번까지</label>' +
          '<p class="small c-maxno-help">우리 반 번호까지만 쓰게 하면 없는 번호로 들어오는 장난을 막아요.</p></div>' +
          '<div class="c-qr" id="qr" aria-label="학생 링크 QR"></div></div>' +
        '<div class="c-now" id="now"></div>' +
      "</div>" +
      '<div class="c-grid">' +
        '<section class="c-panel"><h2>활동지 띄우기</h2><p class="small">차시와 활동을 고르면 학생 화면이 그 활동지로 바로 바뀌어요.</p>' +
          '<div class="c-lessons" id="lessons"></div><div id="parts"></div></section>' +
        '<section class="c-panel"><h2>자료 보내기</h2>' +
          '<form id="link" class="c-form"><input id="ltitle" placeholder="제목 (예: 4차시 위로 영상)" maxlength="80"><input id="lurl" placeholder="https://로 시작하는 링크" inputmode="url"><button class="btn primary small">링크 보내기</button></form>' +
          (c.demo ? '<p class="small c-demonote">시연용 수업이라 파일은 보낼 수 없고, 링크는 무.도.키즈 주소만 보낼 수 있어요.</p>'
            : '<label class="c-file"><input type="file" id="file"><span class="btn ghost small">파일 보내기 (8 MB 이하)</span></label>') +
          '<ul class="c-shares" id="shares"></ul></section>' +
      "</div>" +
      (SV ? '<section class="c-panel c-survey"><h2>휴먼스킬 설문</h2><p class="small">프로젝트 시작 전(1차시 앞)에 <b>사전</b>, 끝난 뒤(10차시 끝)에 <b>사후</b> 설문을 한 번씩 띄워요. 이번 수업에서 키운 휴먼스킬만 골라 보낼 수 있어요. 기록은 12시간 뒤 지워지니 사전 설문 뒤 <b>설문 결과 → CSV 받기</b>로 꼭 받아 두세요.</p>' +
        '<div class="chips c-skills" id="skills"></div>' +
        '<div class="c-partbtns"><button type="button" class="btn ghost small" id="sv-pre">사전 설문 띄우기</button><button type="button" class="btn ghost small" id="sv-post">사후 설문 띄우기</button>' +
        '<a class="btn ghost small" id="sv-res" target="_blank" rel="noopener">설문 결과 ↗</a></div></section>' : "") +
      '<div class="c-end"><span class="small">수업을 끝내면 학생 기록과 보낸 파일이 모두 지워져요. 끝내기 전에 실시간 현황에서 CSV를 받아 두세요.</span><button class="btn ghost" id="end">수업 끝내기</button></div>' +
      "</section>" +
      '<div class="c-bigcode" id="bigcode" hidden><div><span>참여 코드</span><b>' + esc(c.room) + '</b><div id="qr2"></div><p>' + esc(studentLink(c.room).replace(/^https?:\/\//, "")) + '</p><button class="btn primary" id="closebig">닫기</button></div></div>';
    drawQr("qr", 4); drawQr("qr2", 7);
    document.getElementById("copy").onclick = function () {
      var t = studentLink(c.room);
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast("학생 링크를 복사했어요."); }, function () { prompt("학생 링크", t); });
    };
    document.getElementById("big").onclick = function () { document.getElementById("bigcode").hidden = false; };
    document.getElementById("closebig").onclick = function () { document.getElementById("bigcode").hidden = true; };
    document.getElementById("end").onclick = endClass;
    document.getElementById("link").onsubmit = function (e) {
      e.preventDefault();
      var url = document.getElementById("lurl").value.trim(), title = document.getElementById("ltitle").value.trim();
      if (!/^https:\/\//.test(url)) return toast("https://로 시작하는 링크를 넣어 주세요.");
      M.call({ action: "link", room: c.room, teacher: c.teacher, url: url, title: title }, "/api/mdk").then(function (r) {
        document.getElementById("lurl").value = ""; document.getElementById("ltitle").value = ""; paintShares(r.shares); toast("링크를 보냈어요.");
      }).catch(function (er) { toast(er.message); });
    };
    if (document.getElementById("file")) document.getElementById("file").onchange = function () {
      var f = this.files[0]; if (!f) return;
      if (f.size > 8 * 1024 * 1024) { this.value = ""; return toast("파일은 8 MB 이하로 보내 주세요."); }
      var fd = new FormData(); fd.append("room", c.room); fd.append("teacher", c.teacher); fd.append("file", f);
      toast("파일을 보내는 중…");
      var input = this;
      fetch(M.server() + "/api/mdk/file", { method: "POST", body: fd }).then(function (r) { return r.json().then(function (j) { if (!r.ok || j.ok === false) throw new Error((j.error && (j.error.message || j.error)) || "파일을 보내지 못했어요."); return j; }); })
        .then(function (j) { input.value = ""; paintShares(j.shares); toast("파일을 보냈어요."); })
        .catch(function (er) { input.value = ""; toast(er.message); });
    };
    paintLessons();
    if (SV) paintSurvey();
    initMaxNo();
    refreshTeacher();
    var tick = 0;
    clearInterval(timer); timer = setInterval(function () { tick++; if (!document.hidden || tick % 3 === 0) refreshTeacher(); }, 5000);
    window.addEventListener("pagehide", function () {
      var cc = M.myClass(); if (!cc || !navigator.sendBeacon) return;
      navigator.sendBeacon(M.server() + "/api/mdk", new Blob([JSON.stringify({ action: "away", room: cc.room, teacher: cc.teacher })], { type: "text/plain" }));
    });
  }

  function drawQr(id, cell) {
    var el = document.getElementById(id); if (!el) return;
    if (!window.qrcode) { if (id === "qr") el.hidden = true; return; }
    var qr = window.qrcode(0, "M"); qr.addData(studentLink(T.c.room)); qr.make();
    el.innerHTML = qr.createSvgTag({ cellSize: cell, margin: 2, scalable: true });
  }

  function paintLessons() {
    document.getElementById("lessons").innerHTML = M.data.lessons.map(function (l) {
      return '<button type="button" class="c-lp' + (l.no === T.sel ? " sel" : "") + '" data-l="' + l.no + '" title="' + l.no + "차시 " + esc(l.title) + '"><b>' + esc(l.letter) + "</b><span>" + l.no + "</span></button>";
    }).join("");
    document.getElementById("lessons").onclick = function (e) {
      var b = e.target.closest("[data-l]"); if (!b) return;
      T.sel = Number(b.dataset.l); T.c.lesson = T.sel; M.saveClass(T.c); paintLessons();
    };
    var l = lessonOf(T.sel), st = T.state || {};
    var onL = st.lesson === l.no;
    document.getElementById("parts").innerHTML =
      '<div class="c-lhead"><b>' + l.no + "차시 " + esc(l.letter) + " · " + esc(l.title) + '</b><a class="small" href="lesson.html?l=' + l.no + '" target="_blank" rel="noopener">수업 PPT 열기 ↗</a></div>' +
      '<div class="c-parts">' +
        '<button type="button" class="c-part' + (onL && st.part == null ? " on" : "") + '" data-p="">활동지 처음부터</button>' +
        l.parts.map(function (p, i) { return '<button type="button" class="c-part' + (onL && st.part === i ? " on" : "") + '" data-p="' + i + '"><span>' + (i + 1) + "</span>" + esc(p.title) + (p.who === "모둠" ? " <em>모둠</em>" : "") + "</button>"; }).join("") +
      "</div>" +
      '<div class="c-partbtns"><a class="btn ghost small" target="_blank" rel="noopener" href="live.html?l=' + l.no + serverQs() + "#room=" + encodeURIComponent(T.c.room) + "&key=" + encodeURIComponent(T.c.teacher) + '">' + l.no + "차시 실시간 현황 ↗</a>" +
        '<button type="button" class="btn ghost small" id="wait">학생 화면 대기로</button></div>';
    document.querySelectorAll(".c-part").forEach(function (b) {
      b.onclick = function () {
        var p = b.dataset.p === "" ? null : Number(b.dataset.p);
        M.push(l.no, p).then(function (r) { T.state = Object.assign({}, T.state, { lesson: r.lesson, part: r.part }); paintLessons(); paintNow(); toast("학생 화면에 띄웠어요."); }).catch(function (e) { handleErr(e); });
      };
    });
    document.getElementById("wait").onclick = function () {
      M.push(0, null).then(function () { T.state = Object.assign({}, T.state, { lesson: 0, part: null }); paintLessons(); paintNow(); toast("학생 화면을 대기로 바꿨어요."); }).catch(handleErr);
    };
  }

  // ① 학생 번호 범위: 정하면 그 밖의 번호로는 활동지·설문을 저장할 수 없음
  function initMaxNo() {
    var input = document.getElementById("maxno");
    M.call({ action: "check", room: T.c.room, teacher: T.c.teacher }).then(function (r) { if (r.config && r.config.maxNo) input.value = r.config.maxNo; }).catch(function () {});
    input.onchange = function () {
      var n = parseInt(input.value.replace(/\D/g, ""), 10) || 0;
      input.value = n || "";
      M.call({ action: "config", room: T.c.room, teacher: T.c.teacher, config: { maxNo: n } })
        .then(function () { toast(n ? "학생 번호를 1~" + n + "번으로 정했어요." : "번호 제한을 없앴어요."); }).catch(handleErr);
    };
  }

  var SKILL_KEY = "mdk-survey-skills";
  function chosenSkills() { try { var v = JSON.parse(localStorage.getItem(SKILL_KEY)); if (Array.isArray(v) && v.length) return v; } catch (e) {} return SV.skills.map(function (k) { return k.id; }); }
  function paintSurvey() {
    var on = chosenSkills(), box = document.getElementById("skills");
    box.innerHTML = SV.skills.map(function (k) { var o = on.indexOf(k.id) >= 0; return '<button type="button" class="chip' + (o ? " on" : "") + '" aria-pressed="' + o + '" data-sk="' + k.id + '">' + esc(k.name) + "</button>"; }).join("") +
      '<span class="small">' + on.length + "개 · 문항 " + (on.length * 2) + "개</span>";
    box.onclick = function (e) {
      var b = e.target.closest("[data-sk]"); if (!b) return;
      var cur = chosenSkills(), i = cur.indexOf(b.dataset.sk);
      if (i >= 0) { if (cur.length === 1) return toast("하나는 골라야 해요."); cur.splice(i, 1); } else cur.push(b.dataset.sk);
      try { localStorage.setItem(SKILL_KEY, JSON.stringify(cur)); } catch (er) {}
      paintSurvey();
    };
    var pushSv = function (lesson, label) {
      M.push(lesson, null, chosenSkills().join(",")).then(function (r) { T.state = Object.assign({}, T.state, { lesson: r.lesson, part: r.part, opt: r.opt }); paintLessons(); paintNow(); toast(label + "을 학생 화면에 띄웠어요."); }).catch(handleErr);
    };
    document.getElementById("sv-pre").onclick = function () { pushSv(61, "사전 설문"); };
    document.getElementById("sv-post").onclick = function () { pushSv(62, "사후 설문"); };
    document.getElementById("sv-res").href = "survey-results.html" + (q.get("server") ? "?server=" + encodeURIComponent(q.get("server")) : "") + "#room=" + encodeURIComponent(T.c.room) + "&key=" + encodeURIComponent(T.c.teacher);
  }

  function paintNow() {
    var st = T.state || {}, el = document.getElementById("now"); if (!el) return;
    var l = st.lesson ? lessonOf(st.lesson) : null;
    if (M.SURVEY[st.lesson]) { el.innerHTML = "<span>지금 학생 화면</span><b>휴먼스킬 " + (st.lesson === 61 ? "사전" : "사후") + " 설문</b><em>" + ((st.opt || "").split(",").filter(Boolean).length || "전체") + "개 휴먼스킬</em>"; return; }
    el.innerHTML = '<span>지금 학생 화면</span>' + (l
      ? "<b>" + l.no + "차시 " + esc(l.letter) + " · " + esc(l.title) + "</b><em>" + (st.part == null ? "활동지 처음부터" : (st.part + 1) + ". " + esc((l.parts[st.part] || {}).title || "")) + "</em>"
      : "<b>대기 화면</b><em>활동지를 고르면 학생 화면이 바뀌어요.</em>");
  }

  function paintShares(items) {
    var ul = document.getElementById("shares"); if (!ul) return;
    ul.innerHTML = (items || []).length ? items.map(function (s) {
      return '<li><span class="c-stype">' + (s.type === "file" ? "파일" : "링크") + '</span><a href="' + esc(M.safeUrl(s.url)) + '" target="_blank" rel="noopener">' + esc(s.title) + '</a><button type="button" class="c-del" data-id="' + s.id + '" aria-label="지우기">지우기</button></li>';
    }).join("") : '<li class="small">아직 보낸 자료가 없어요.</li>';
    ul.onclick = function (e) {
      var b = e.target.closest(".c-del"); if (!b) return;
      M.call({ action: "unshare", room: T.c.room, teacher: T.c.teacher, id: Number(b.dataset.id) }, "/api/mdk").then(function (r) { paintShares(r.shares); }).catch(handleErr);
    };
  }

  function refreshTeacher() {
    M.call({ action: "state", room: T.c.room, teacher: T.c.teacher }, "/api/mdk").then(function (r) {
      var first = !T.state; T.state = r; paintNow(); paintShares(r.shares); if (first) paintLessons();
    }).catch(handleErr);
  }

  function handleErr(e) {
    // 수업이 없어졌거나(404) 선생님 키가 안 맞을 때(403 '키')만 닫힘 화면. 시연용에서 막힌 링크(403) 같은 건 알림만
    if (e.status === 404 || (e.status === 403 && /키/.test(e.message || ""))) {
      clearInterval(timer); M.saveClass(null);
      app.innerHTML = '<section class="wrap c-home"><h1 class="c-h1">수업이 닫혔어요</h1><p class="lead">' + esc(e.message) + ' 수업이 끝났거나 오래되어 자동으로 닫혔어요.</p><button class="btn primary" id="again">새 수업 열기</button></section>';
      document.getElementById("again").onclick = function () { home(); };
      return;
    }
    toast(e.message);
  }

  function endClass() {
    M.ask("수업을 끝낼까요?\n학생 활동지 기록과 보낸 파일이 모두 지워져요. CSV를 받아 두었는지 확인해 주세요.", "수업 끝내기", true).then(function (ok) {
      if (!ok) return;
      var btn = document.getElementById("end"); if (btn) { btn.disabled = true; btn.textContent = "끝내는 중…"; }
      M.call({ action: "end", room: T.c.room, teacher: T.c.teacher }, "/api/mdk").then(function () {
        clearInterval(timer); M.saveClass(null); toast("수업을 끝냈어요."); home();
      }).catch(function (e) {
        if (e.status === 404 || e.status === 403) { clearInterval(timer); M.saveClass(null); toast("이미 닫힌 수업이에요."); home(); return; }
        if (btn) { btn.disabled = false; btn.textContent = "수업 끝내기"; }
        toast(e.message + " 다시 눌러 주세요.");
      });
    });
  }

  /* ───────── 학생 화면 ───────── */
  var S = { key: "" };
  function student(code) {
    document.getElementById("class-tag").innerHTML = "참여 코드 <b>" + esc(code) + "</b>";
    document.body.classList.add("c-student-page");
    app.innerHTML =
      '<div class="c-sbar wrap"><span id="s-now">연결하는 중…</span><button class="btn ghost small" id="s-files">받은 자료 <b id="s-count">0</b></button></div>' +
      '<div class="c-sfiles wrap" id="s-panel" hidden><ul id="s-list"></ul></div>' +
      '<div class="c-stage" id="s-stage"></div>';
    document.getElementById("s-files").onclick = function () { var p = document.getElementById("s-panel"); p.hidden = !p.hidden; this.classList.remove("glow"); };
    var poll = function () {
      M.call({ action: "state", room: code }, "/api/mdk").then(function (r) { showStudent(code, r); })
        .catch(function (e) {
          if (e.status === 404) {
            clearInterval(timer);
            app.innerHTML = '<section class="wrap c-home"><h1 class="c-h1">수업을 찾을 수 없어요</h1><p class="lead">참여 코드 <b>' + esc(code) + '</b>를 다시 확인해 주세요. 수업이 끝났을 수도 있어요.</p><a class="btn primary" href="class.html' + (q.get("server") ? "?server=" + encodeURIComponent(q.get("server")) : "") + '">코드 다시 쓰기</a></section>';
          } else document.getElementById("s-now").textContent = "연결이 잠시 끊겼어요. 다시 연결하는 중…";
        });
    };
    // 6초마다 확인, 다른 탭을 보고 있으면 18초마다 (무료 서버 부담 줄이기)
    var tick = 0;
    poll(); clearInterval(timer); timer = setInterval(function () { tick++; if (!document.hidden || tick % 3 === 0) poll(); }, 6000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) poll(); });
  }

  function showStudent(code, r) {
    var sv = M.SURVEY[r.lesson];
    var l = r.lesson && !sv ? lessonOf(r.lesson) : null;
    document.getElementById("s-now").innerHTML = sv ? "<b>휴먼스킬 " + (sv === "pre" ? "시작 전" : "마친 뒤") + " 설문</b>" : l ? "<b>" + l.no + "차시 " + esc(l.letter) + " · " + esc(l.title) + "</b>" : "선생님을 기다리는 중";
    if (sv) {
      var key0 = "sv/" + r.lesson + "/" + (r.opt || "") + "/" + r.t;
      if (key0 !== S.key) {
        S.key = key0; S.lesson = r.lesson;
        document.getElementById("s-stage").innerHTML = '<iframe id="s-frame" title="휴먼스킬 설문" src="' + esc("survey.html?phase=" + sv + "&room=" + code + "&embed=1&skills=" + encodeURIComponent(r.opt || "") + serverQs()) + '"></iframe>';
        toast("설문이 열렸어요.");
      }
      paintShares_(r);
      return;
    }
    var key = r.lesson + "/" + (r.part == null ? "" : r.part) + "/" + r.t;
    if (key !== S.key) {
      var prevLesson = S.lesson; S.key = key; S.lesson = r.lesson;
      var stage = document.getElementById("s-stage");
      if (!l) {
        stage.innerHTML = '<div class="c-wait"><div class="c-waitletters">' + M.data.lessons.map(function (x) { return "<span>" + esc(x.letter) + "</span>"; }).join("") + '</div><h1 class="c-h1">선생님을 기다려요</h1><p>선생님이 활동지를 띄우면 여기에 바로 나타나요.<br>창을 닫지 말고 기다려 주세요.</p></div>';
      } else {
        var src = "sheet.html?l=" + l.no + "&room=" + code + "&embed=1" + serverQs() + (r.part == null ? "" : "#p" + r.part);
        var f = document.getElementById("s-frame");
        if (f && prevLesson === r.lesson) {
          // 같은 차시 안에서 파트만 바뀜: 다시 불러오지 않고 그 파트로 이동 (쓴 내용 유지)
          try { f.contentWindow.location.hash = r.part == null ? "" : "p" + r.part; } catch (e) { f.src = src; }
        } else {
          stage.innerHTML = '<iframe id="s-frame" title="활동지" src="' + esc(src) + '"></iframe>';
        }
        if (prevLesson !== undefined) toast(l.no + "차시 활동지가 열렸어요.");
      }
    }
    paintShares_(r);
  }

  function paintShares_(r) {
    var shares = r.shares || [];
    document.getElementById("s-count").textContent = shares.length;
    document.getElementById("s-list").innerHTML = shares.length ? shares.map(function (s) {
      return '<li><span class="c-stype">' + (s.type === "file" ? "파일" : "링크") + '</span><a href="' + esc(M.safeUrl(s.url)) + '" target="_blank" rel="noopener">' + esc(s.title) + "</a></li>";
    }).join("") : '<li class="small">아직 받은 자료가 없어요.</li>';
    var ids = shares.map(function (s) { return s.id; }).join(",");
    if (seenShares !== null && ids !== seenShares && shares.length && (!seenShares || shares[0].id > Number(seenShares.split(",")[0] || 0))) {
      toast("선생님이 자료를 보냈어요: " + shares[0].title);
      document.getElementById("s-files").classList.add("glow");
    }
    seenShares = ids;
  }
})();
