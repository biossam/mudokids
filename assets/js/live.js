/* 무.도.키즈 실시간 현황 (선생님)
   교실 링크 교사 화면 → 무.도.키즈 활동지 탭 → [실시간 현황] 으로 열면
   live.html?l=차시#room=참여코드&key=교사키 로 들어옴.
   교사 키는 주소의 # 뒤에만 실어 보내고(서버 기록에 남지 않음), 받자마자 주소에서 지우고 이 탭에만 보관함. */
(function () {
  var M = window.MDK, esc = M.esc;
  var KEY = "mdk-live-teacher-v1";
  var q = new URLSearchParams(location.search);
  var lesson, plan, conn, data = null, timer, failCount = 0, view = "board";

  function readConn() { try { return JSON.parse(sessionStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function saveConn(c) { try { sessionStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {} }

  var h = new URLSearchParams(location.hash.slice(1));
  conn = readConn();
  if (h.get("room") && h.get("key")) {
    conn = { room: h.get("room").toUpperCase().slice(0, 6), key: h.get("key") };
    saveConn(conn);
    history.replaceState(null, "", location.pathname + location.search);
  }

  Promise.all([M.load(), fetch("data/lessons.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).catch(function () { return { lessons: [] }; })]).then(function (res) {
    var d = res[0];
    var no = Number(q.get("l")) || 1;
    lesson = d.lessons.filter(function (l) { return l.no === no; })[0] || d.lessons[0];
    plan = res[1].lessons.filter(function (l) { return l.no === lesson.no; })[0] || null;
    document.title = lesson.no + "차시 실시간 현황 · 무.도.키즈";
    var keep = new URLSearchParams(location.search);
    document.getElementById("lesson-pick").innerHTML = d.lessons.map(function (l) {
      keep.set("l", l.no);
      return '<a href="?' + keep.toString() + '" class="lp' + (l.no === lesson.no ? " is-on" : "") + '" title="' + l.no + "차시 " + esc(l.title) + '">' + esc(l.letter) + "</a>";
    }).join("");
    render();
    if (conn.room && conn.key) poll();
  }).catch(function (e) { document.getElementById("app").innerHTML = '<p class="status">' + esc(e.message) + "</p>"; });

  function render() {
    var app = document.getElementById("app");
    var head = '<section class="live-head"><div><p class="sheet-no">' + lesson.no + "차시 · " + esc(lesson.word) + "</p>" +
      "<h1>" + esc(lesson.letter) + " · " + esc(lesson.title) + " 실시간 현황</h1>" +
      '<p class="live-meta" id="meta">' + (conn.room ? "참여 코드 <b>" + esc(conn.room) + "</b>" : "") + "</p></div>" +
      (conn.room && conn.key ? '<div class="live-tools">' +
        '<button class="btn ghost small" id="csv">CSV 받기</button>' +
        '<button class="btn ghost small" id="reset">이 차시 기록 지우기</button></div>' : "") +
      "</section>";
    if (!conn.room || !conn.key) {
      app.innerHTML = head + '<section class="connect"><p><b>교실 링크 교사 화면 → 무.도.키즈 활동지 탭 → 실시간 현황</b>을 누르면 자동으로 연결돼요. ' +
        "선생님 연결 키는 이 탭에만 보관되고, 탭을 닫으면 지워져요.</p></section>";
      return;
    }
    app.innerHTML = head +
      '<div class="vtabs" role="tablist"><button type="button" data-v="board" class="on">학생 현황</button>' +
      (plan && plan.eval && plan.eval.length ? '<button type="button" data-v="eval">평가 초안</button>' : "") + "</div>" +
      '<div id="board"><p class="status">학생 기록을 불러오는 중…</p></div>';
    app.querySelector(".vtabs").onclick = function (e) {
      var b = e.target.closest("[data-v]"); if (!b) return;
      view = b.dataset.v;
      app.querySelectorAll(".vtabs [data-v]").forEach(function (x) { x.classList.toggle("on", x === b); });
      if (data) paint(true);
    };
    app.querySelector("#csv").onclick = csv;
    app.querySelector("#reset").onclick = function () {
      if (!confirm(lesson.no + "차시 활동지 기록을 모두 지울까요? 학생 기기에 쓴 내용은 남아 있어요.")) return;
      M.call({ action: "reset", room: conn.room, teacher: conn.key, lesson: M.serverLesson(lesson.no) }).then(poll, function (e) { alert(e.message); });
    };
  }

  function poll() {
    clearTimeout(timer);
    M.call({ action: "dash", room: conn.room, teacher: conn.key, lesson: M.serverLesson(lesson.no) })
      .then(function (r) { failCount = 0; data = r; paint(); timer = setTimeout(poll, 3000); })
      .catch(function (e) {
        failCount++;
        var board = document.getElementById("board");
        if (e.status === 403 || e.status === 404) {
          board.innerHTML = '<section class="connect"><p>' + esc(e.message) + " 수업이 끝났다면 교실 링크에서 새 수업을 열고 다시 들어와 주세요.</p></section>";
          return;
        }
        var meta = document.getElementById("meta");
        if (meta) meta.innerHTML = "참여 코드 <b>" + esc(conn.room) + "</b> · <span style=\"color:#c4501b\">연결이 잠시 끊겼어요. 다시 시도하는 중…</span>";
        timer = setTimeout(poll, Math.min(15000, 3000 * failCount));
      });
  }

  function ago(t) {
    var s = Math.max(0, Math.round((data.now - t) / 1000));
    return s < 60 ? s + "초 전" : s < 3600 ? Math.floor(s / 60) + "분 전" : Math.floor(s / 3600) + "시간 전";
  }

  function paint(force) {
    var board = document.getElementById("board"); if (!board) return;
    if (view === "eval") {
      // 평가 초안은 선생님이 고치는 중일 수 있어 3초마다 다시 그리지 않음 (새 답안은 [다시 계산]으로 반영)
      var note = document.getElementById("eval-fresh");
      if (force || !note) paintEval(board);
      else note.textContent = "새 답안이 있으면 [다시 계산]을 눌러 반영해요 · 마지막 계산 " + paintEval.at;
      return;
    }
    var st = data.students || [];
    var done = st.filter(function (s) { return s.submitted; }).length;
    var active = st.filter(function (s) { return data.now - s.t < 120000; }).length;
    document.getElementById("meta").innerHTML = "참여 코드 <b>" + esc(conn.room) + "</b> · 3초마다 새로 고침";
    var html = '<div class="summary"><div><b>' + st.length + "</b><span>쓴 학생</span></div>" +
      "<div><b>" + active + "</b><span>지금 쓰는 중 (2분 안)</span></div>" +
      "<div><b>" + done + "</b><span>다 했어요 ✓</span></div></div>";
    if ((data.blocked || []).length) {
      html += '<div class="blocked">다른 기기에서 같은 반·번호로 쓰려는 학생이 있어요. 기기를 바꾼 학생이면 풀어 주세요: ' +
        data.blocked.map(function (sid) { return "<b>" + esc(sid.replace("-", "반 ")) + "번</b><button class=\"btn ghost small\" data-unlock=\"" + esc(sid) + "\">풀기</button>"; }).join(" ") + "</div>";
    }
    if (!st.length) {
      html += '<section class="connect"><p>아직 쓴 학생이 없어요. 학생은 받은 활동지 링크를 열고 <b>반·번호·모둠</b>을 쓰면 여기에 나타나요.</p></section>';
      board.innerHTML = html; bindBoard(board); return;
    }
    html += '<div class="table-wrap"><table class="live"><thead><tr><th>반·번호</th>' +
      lesson.parts.map(function (p, pi) { return "<th>" + (pi + 1) + ". " + esc(p.title) + "</th>"; }).join("") +
      "<th>마지막 저장</th><th>제출</th><th></th></tr></thead><tbody>";
    var lastGroup = null;
    st.slice().sort(function (a, b) { return (a.group || "~").localeCompare(b.group || "~", "ko", { numeric: true }) || Number(a.ban) - Number(b.ban) || Number(a.no) - Number(b.no); })
      .forEach(function (s) {
        var g = s.group || "";
        if (g !== lastGroup) { lastGroup = g; html += '<tr class="group-head"><td colspan="' + (lesson.parts.length + 4) + '">' + (g ? esc(g) + "모둠" : "모둠 없음") + "</td></tr>"; }
        html += '<tr class="' + (data.now - s.t > 300000 ? "stale" : "") + '"><td><b>' + esc(s.ban) + "반 " + esc(s.no) + "번</b></td>" +
          lesson.parts.map(function (p, pi) {
            var pr = (s.progress || [])[pi] || [0, 0];
            var pct = pr[1] ? Math.round(pr[0] / pr[1] * 100) : 0;
            return '<td><span class="pcell"><span class="pbar"><i style="width:' + pct + '%"></i></span>' + pr[0] + "/" + pr[1] + "</span></td>";
          }).join("") +
          "<td>" + ago(s.t) + "</td><td>" + (s.submitted ? '<span class="done-tag">다 했어요 ✓</span>' : "") + "</td>" +
          '<td><button class="btn ghost small" data-view="' + esc(s.sid) + '">답 보기</button></td></tr>';
      });
    html += "</tbody></table></div>";
    html += '<section class="by-q"><h2>칸별로 모아 보기</h2>' + M.fieldsOf(lesson).map(function (f) {
      var list = st.filter(function (s) { return M.filled(s.fields[f.key]); });
      if (f.part.who === "모둠") {
        // 모둠 칸은 모둠마다 한 번만 (모둠 없이 쓴 학생은 따로)
        var groups = data.groups || {}, rows = [];
        Object.keys(groups).forEach(function (g) {
          var it = groups[g][f.key];
          if (it && M.filled(it.v)) rows.push("<li><b>" + esc(g) + "모둠</b>" + esc(M.show(it.v)) + "</li>");
        });
        list.filter(function (s) { return !s.group; }).forEach(function (s) {
          rows.push("<li><b>" + esc(s.ban) + "-" + esc(s.no) + "</b>" + esc(M.show(s.fields[f.key])) + "</li>");
        });
        return "<details><summary>" + (f.pi + 1) + ". " + esc(f.item.label) + " <span class=\"small\">(모둠 " + rows.length + ")</span></summary><ul>" + rows.join("") + "</ul></details>";
      }
      return "<details><summary>" + (f.pi + 1) + ". " + esc(f.item.label) + " <span class=\"small\">(" + list.length + "명)</span></summary><ul>" +
        list.map(function (s) { return "<li><b>" + esc(s.ban) + "-" + esc(s.no) + (s.group ? " · " + esc(s.group) + "모둠" : "") + "</b>" + esc(M.show(s.fields[f.key])) + "</li>"; }).join("") +
        "</ul></details>";
    }).join("") + "</section>";
    var open = Array.prototype.map.call(board.querySelectorAll(".by-q details[open]"), function (d) { return d.querySelector("summary").textContent; });
    board.innerHTML = html;
    board.querySelectorAll(".by-q details").forEach(function (d) { if (open.indexOf(d.querySelector("summary").textContent) >= 0) d.open = true; });
    bindBoard(board);
  }

  function bindBoard(board) {
    board.onclick = function (e) {
      var v = e.target.closest("[data-view]"), u = e.target.closest("[data-unlock]");
      if (v) return showAnswer(v.dataset.view);
      if (u) M.call({ action: "unlock", room: conn.room, teacher: conn.key, lesson: M.serverLesson(lesson.no), sid: u.dataset.unlock }).then(poll, function (er) { alert(er.message); });
    };
  }

  function showAnswer(sid) {
    var s = (data.students || []).filter(function (x) { return x.sid === sid; })[0]; if (!s) return;
    var html = "<h2>" + esc(s.ban) + "반 " + esc(s.no) + "번" + (s.group ? " · " + esc(s.group) + "모둠" : "") + "</h2>";
    lesson.parts.forEach(function (p, pi) {
      html += "<h3>" + (pi + 1) + ". " + esc(p.title) + (p.who === "모둠" ? " (모둠)" : "") + "</h3><dl>" +
        p.items.map(function (it) { return "<dt>" + esc(it.label) + "</dt><dd>" + (esc(M.show(s.fields["p" + pi + "." + it.id])) || "-") + "</dd>"; }).join("") + "</dl>";
    });
    html += '<p style="margin-top:18px"><button class="btn primary" id="close-answer">닫기</button></p>';
    var box = document.getElementById("answer"), card = document.getElementById("answer-card");
    card.innerHTML = html; box.hidden = false;
    card.querySelector("#close-answer").focus();
    card.querySelector("#close-answer").onclick = function () { box.hidden = true; };
    box.onclick = function (e) { if (e.target === box) box.hidden = true; };
    document.onkeydown = function (e) { if (e.key === "Escape") box.hidden = true; };
  }


  /* ───────── 평가 초안 ─────────
     차시별 평가 기준(data/lessons.json eval: 상·중·하, parts=근거가 되는 활동지 파트)으로
     칸을 채운 정도 · 까닭을 드는 표현 · 쓴 분량을 보고 상·중·하를 '제안'함. 내용의 옳고 그름은 판단하지 못하므로
     선생님이 확인하고 고칠 수 있게 하고(이 기기에만 저장), 내용까지 보는 초안은 AI 프롬프트 복사로 받음. */
  var REASON = /(왜냐하면|때문|그래서|니까|라서|예를 들어|예를 들면|처럼|만약|덕분|그러므로)/g;
  var LV = ["상", "중", "하"];
  function evalKey() { return "mdk-eval-" + conn.room + "-" + lesson.no; }
  function evalStore() { try { return JSON.parse(localStorage.getItem(evalKey())) || {}; } catch (e) { return {}; } }
  function evalSave(o) { try { localStorage.setItem(evalKey(), JSON.stringify(o)); } catch (e) {} }

  function evidence(s, ev) {
    var total = 0, filled = 0, chars = 0, textN = 0, solid = 0, reasons = 0, best = "", blanks = [];
    ev.parts.forEach(function (pi) {
      var part = lesson.parts[pi]; if (!part) return;
      var miss = 0;
      part.items.forEach(function (it) {
        var v = s.fields["p" + pi + "." + it.id];
        // 글 칸은 '모르겠다'·'없음'처럼 생각이 담기지 않은 짧은 답은 채운 것으로 보지 않음
        var ok = M.filled(v) && (it.type !== "text" && it.type !== "line" || meaningful(String(v), it.type === "line" ? 2 : 4));
        if (!it.optional) { total++; if (ok) filled++; else miss++; }
        if (it.type === "text" || it.type === "line") {
          var t = M.filled(v) ? String(v).trim() : "";
          if (!it.optional || t) textN++;
          chars += t.length; if (t.length >= 15) solid++;
          reasons += (t.match(REASON) || []).length;
          if (t.length > best.length) best = t;
        }
      });
      if (miss) blanks.push(part.title);
    });
    var avg = textN ? Math.round(chars / textN) : 0, ratio = total ? filled / total : 0;
    var lv = ratio >= 0.9 && (reasons >= 1 || avg >= 25) && solid >= Math.min(2, textN) ? "상"
      : ratio >= 0.75 || (ratio >= 0.5 && (solid >= 1 || !textN)) ? "중" : "하";
    if (!textN && ratio >= 0.9) lv = "상";
    return { lv: lv, filled: filled, total: total, reasons: reasons, avg: avg, best: best, blanks: blanks,
      why: "칸 " + filled + "/" + total + (textN ? " · 까닭 표현 " + reasons + "곳 · 평균 " + avg + "자" : "") };
  }

  function meaningful(t, min) {
    t = t.trim();
    return t.length >= min && !/^(잘\s*)?(모르|몰라|없|글쎄|그냥|\.|-|ㅇ|ㅋ)/.test(t);
  }

  function short(t, n) { t = String(t || ""); return t.length > n ? t.slice(0, n) + "…" : t; }

  function feedbackOf(evs) {
    var worst = evs.reduce(function (w, e) { return LV.indexOf(e.lv) > LV.indexOf(w.lv) ? e : w; }, evs[0]);
    var best = evs.map(function (e) { return e.best; }).sort(function (a, b) { return b.length - a.length; })[0] || "";
    var blanks = []; evs.forEach(function (e) { e.blanks.forEach(function (b) { if (blanks.indexOf(b) < 0) blanks.push(b); }); });
    if (worst.lv === "상") return (best ? "‘" + short(best, 24) + "’처럼 " : "") + "자기 생각을 까닭과 함께 잘 썼어요. 친구의 생각과도 이어 보면 더 깊어져요.";
    if (worst.lv === "중") return "생각을 잘 적었어요. ‘왜냐하면’으로 까닭을 한 가지 더 붙여 보세요." + (blanks.length ? " (" + blanks[0] + " 칸도 채워 봐요.)" : "");
    return (blanks.length ? blanks.slice(0, 2).join(", ") + " 칸을 아직 채우지 못했어요. " : "") + "짝과 이야기해 본 뒤 내 생각을 한 문장으로 써 봐요.";
  }

  function rows_() {
    var store = evalStore();
    return (data.students || []).slice().sort(function (a, b) { return Number(a.ban) - Number(b.ban) || Number(a.no) - Number(b.no); }).map(function (s) {
      var evs = plan.eval.map(function (ev) { return evidence(s, ev); });
      var mine = store[s.sid] || {};
      return { s: s, evs: evs, final: evs.map(function (e, i) { return (mine.lv && mine.lv[i]) || e.lv; }), fb: mine.fb != null ? mine.fb : feedbackOf(evs), edited: mine };
    });
  }

  function paintEval(board) {
    var R = rows_();
    paintEval.at = new Date().toTimeString().slice(0, 5);
    if (!R.length) { board.innerHTML = '<section class="connect"><p>아직 답안이 없어요. 학생들이 활동지를 쓰면 여기서 평가 초안을 볼 수 있어요.</p></section>'; return; }
    // 학급 전체 요약
    var sum = plan.eval.map(function (ev, i) {
      var c = { "상": 0, "중": 0, "하": 0 }; R.forEach(function (r) { c[r.final[i]]++; });
      return { ev: ev, c: c };
    });
    var blankCount = {};
    R.forEach(function (r) { r.evs.forEach(function (e) { e.blanks.forEach(function (b) { blankCount[b] = (blankCount[b] || 0) + 1; }); }); });
    var blankTop = Object.keys(blankCount).sort(function (a, b) { return blankCount[b] - blankCount[a]; }).slice(0, 2);
    var weak = sum.slice().sort(function (a, b) { return b.c["하"] - a.c["하"]; })[0];
    var tips = [];
    if (blankTop.length) tips.push("빈칸이 많은 활동: " + blankTop.map(function (b) { return b + " (" + blankCount[b] + "명)"; }).join(", ") + " — 시간이 부족했는지, 질문이 어려웠는지 살펴봐요.");
    if (weak && weak.c["하"]) tips.push(weak.ev.skill + "에서 '하'가 " + weak.c["하"] + "명이에요. 평가 목표 — " + weak.ev.goal + " — 를 다음 차시 도입에서 다시 짚어 줘요.");
    var noReason = R.filter(function (r) { return r.evs.every(function (e) { return !e.reasons; }); }).length;
    if (noReason) tips.push("까닭 표현(왜냐하면·때문에 등)이 없는 학생이 " + noReason + "명이에요. '왜냐하면'으로 문장을 이어 쓰는 연습을 해 봐요.");
    var html = '<section class="ev-top"><div class="ev-sum">' + sum.map(function (x) {
        var n = R.length;
        return '<div class="g-box"><h3>' + esc(x.ev.skill) + "</h3><p class=\"small\">" + esc(x.ev.goal) + '</p><div class="ev-bar">' +
          LV.map(function (k) { return '<i class="lv-' + k + '" style="flex:' + (x.c[k] || 0.0001) + '">' + (x.c[k] ? k + " " + x.c[k] : "") + "</i>"; }).join("") +
          "</div><p class=\"small\">근거 활동: " + x.ev.parts.map(function (pi) { return esc((lesson.parts[pi] || {}).title || ""); }).join(" · ") + "</p></div>";
      }).join("") + "</div>" +
      '<div class="g-box ev-tips"><h3>학급 전체 · 다시 짚어 줄 점</h3>' + (tips.length ? "<ul>" + tips.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>" : "<p>눈에 띄는 빈 곳이 없어요.</p>") + "</div></section>" +
      '<div class="ev-tools"><button class="btn primary small" id="ai-copy">AI에 물어볼 프롬프트 복사</button><button class="btn ghost small" id="ev-redo">다시 계산</button>' +
        '<button class="btn ghost small" id="ev-reset">내가 고친 것 되돌리기</button><span class="small" id="eval-fresh">마지막 계산 ' + paintEval.at + "</span></div>" +
      '<p class="small ev-note">자동 초안은 칸을 채운 정도·까닭 표현·쓴 분량만 봐요. 내용이 맞는지는 판단하지 못하니 꼭 확인하고 고쳐 주세요. 고친 수준과 피드백은 이 기기에만 저장돼요. AI 프롬프트에는 이름 없이 반·번호와 답안만 들어가요 — 학교에서 쓰도록 허락된 AI에 붙여 넣으세요.</p>' +
      '<div class="table-wrap"><table class="live ev-table"><thead><tr><th>반·번호</th>' + plan.eval.map(function (ev) { return "<th>" + esc(ev.skill) + "</th>"; }).join("") + "<th>피드백 한 마디</th></tr></thead><tbody>" +
      R.map(function (r) {
        return '<tr data-sid="' + esc(r.s.sid) + '"><td><b>' + esc(r.s.ban) + "반 " + esc(r.s.no) + "번</b>" + (r.s.group ? '<br><span class="small">' + esc(r.s.group) + "모둠</span>" : "") + "</td>" +
          r.evs.map(function (e, i) {
            var f = r.final[i];
            return '<td><select class="lv-sel lv-' + f + '" data-i="' + i + '" aria-label="' + esc(plan.eval[i].skill) + ' 수준">' + LV.map(function (k) { return "<option" + (k === f ? " selected" : "") + ">" + k + "</option>"; }).join("") + "</select>" +
              (f !== e.lv ? ' <span class="small">(제안 ' + e.lv + ")</span>" : "") +
              '<div class="ev-why">' + esc(e.why) + (e.best ? '<br>“' + esc(short(e.best, 40)) + '”' : "") + "</div></td>";
          }).join("") +
          '<td><textarea class="ev-fb" rows="3">' + esc(r.fb) + "</textarea></td></tr>";
      }).join("") + "</tbody></table></div>";
    board.innerHTML = html;
    board.onclick = null;
    board.onchange = function (e) {
      var tr = e.target.closest("tr[data-sid]"); if (!tr) return;
      var store = evalStore(), me = store[tr.dataset.sid] = store[tr.dataset.sid] || {};
      if (e.target.classList.contains("lv-sel")) { me.lv = me.lv || {}; me.lv[e.target.dataset.i] = e.target.value; e.target.className = "lv-sel lv-" + e.target.value; }
      if (e.target.classList.contains("ev-fb")) me.fb = e.target.value;
      evalSave(store);
    };
    board.querySelector("#ev-redo").onclick = function () { paintEval(board); };
    board.querySelector("#ev-reset").onclick = function () { if (confirm("고친 수준과 피드백을 모두 자동 초안으로 되돌릴까요?")) { evalSave({}); paintEval(board); } };
    board.querySelector("#ai-copy").onclick = function () {
      var t = aiPrompt(R);
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { alert("프롬프트를 복사했어요. 학교에서 허락된 AI 대화창에 붙여 넣으세요.\n(학생 " + R.length + "명 · " + t.length + "자)"); }, function () { prompt("프롬프트", t); });
    };
  }

  function aiPrompt(R) {
    var L = [];
    L.push("너는 초등학교 선생님의 수업 평가를 돕는 보조 교사야. 아래 수업의 평가 기준으로 학생별 평가 초안을 써 줘.");
    L.push("학생 이름은 없고 '반-번호'만 있어. 답안에 없는 내용은 지어내지 말고, 근거가 부족하면 '판단 보류'라고 써 줘.", "");
    L.push("[수업] 무.도.키즈 RUNNING MAN " + lesson.no + "차시 " + lesson.letter + "(" + lesson.word + ") · " + lesson.title);
    L.push("[학습 문제] " + lesson.q, "");
    L.push("[평가 기준]");
    plan.eval.forEach(function (ev, i) {
      L.push((i + 1) + ". " + ev.skill + " — " + ev.goal);
      L.push("   상: " + ev.high); L.push("   중: " + ev.mid); L.push("   하: " + ev.low);
      L.push("   근거로 볼 활동: " + ev.parts.map(function (pi) { return (pi + 1) + ". " + (lesson.parts[pi] || {}).title; }).join(", "));
    });
    L.push("", "[활동지 답안] (모둠 활동 칸은 같은 모둠 학생이 함께 쓴 답이라 여러 학생에게 같게 나올 수 있어요. 모둠 칸만으로 개인을 낮게 평가하지 말아 줘.)");
    R.forEach(function (r) {
      L.push("", "### " + r.s.ban + "-" + r.s.no + (r.s.group ? " (" + r.s.group + "모둠)" : ""));
      lesson.parts.forEach(function (p, pi) {
        L.push((pi + 1) + ". " + p.title + (p.who === "모둠" ? " [모둠]" : ""));
        p.items.forEach(function (it) { L.push("- " + it.label + ": " + (M.show(r.s.fields["p" + pi + "." + it.id]) || "(빈칸)")); });
      });
    });
    L.push("", "[쓰는 방법]");
    L.push("1) 학생별 표: 반-번호 | " + plan.eval.map(function (ev) { return ev.skill + "(상·중·하)"; }).join(" | ") + " | 근거(답안에서 한 줄 인용) | 학생에게 주는 피드백 한 마디(따뜻하게, 30자 안팎)");
    L.push("2) 학급 전체 요약: 관점별 상·중·하 분포, 잘한 점 2가지, 다음 차시에 다시 짚어 줄 점 3가지");
    L.push("3) 평가는 초안이며 최종 판단은 선생님이 해요. 단정적인 표현은 피해 줘.");
    return L.join("\n");
  }

  function csv() {
    if (!data) return;
    var cols = M.fieldsOf(lesson);
    var hasEval = plan && plan.eval && plan.eval.length;
    var evHead = hasEval ? plan.eval.map(function (ev) { return "평가·" + ev.skill; }).concat(plan.eval.map(function (ev) { return "근거·" + ev.skill; }), ["피드백"]) : [];
    var rows = [["반", "번호", "모둠", "제출"].concat(evHead, cols.map(function (f) { return (f.pi + 1) + ". " + f.item.label; }))];
    var evBy = {}; if (hasEval) rows_().forEach(function (r) { evBy[r.s.sid] = r; });
    (data.students || []).forEach(function (s) {
      var r = evBy[s.sid];
      var ev = r ? r.final.concat(r.evs.map(function (e) { return e.why + (e.best ? " / " + short(e.best, 40) : ""); }), [r.fb]) : [];
      rows.push([s.ban, s.no, s.group || "", s.submitted ? "O" : ""].concat(ev, cols.map(function (f) { return M.show(s.fields[f.key]); })));
    });
    var text = "﻿" + rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(","); }).join("\r\n");
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
    a.download = "무도키즈_" + lesson.no + "차시_" + conn.room + ".csv"; a.click();
  }
})();
