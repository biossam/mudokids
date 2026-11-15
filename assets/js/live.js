/* 무.도.키즈 실시간 현황 (선생님)
   교실 링크 교사 화면 → 무.도.키즈 활동지 탭 → [실시간 현황] 으로 열면
   live.html?l=차시#room=참여코드&key=교사키 로 들어옴.
   교사 키는 주소의 # 뒤에만 실어 보내고(서버 기록에 남지 않음), 받자마자 주소에서 지우고 이 탭에만 보관함. */
(function () {
  var M = window.MDK, esc = M.esc;
  var KEY = "mdk-live-teacher-v1";
  var q = new URLSearchParams(location.search);
  var lesson, conn, data = null, timer, failCount = 0;

  function readConn() { try { return JSON.parse(sessionStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function saveConn(c) { try { sessionStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {} }

  var h = new URLSearchParams(location.hash.slice(1));
  conn = readConn();
  if (h.get("room") && h.get("key")) {
    conn = { room: h.get("room").toUpperCase().slice(0, 6), key: h.get("key") };
    saveConn(conn);
    history.replaceState(null, "", location.pathname + location.search);
  }

  M.load().then(function (d) {
    var no = Number(q.get("l")) || 1;
    lesson = d.lessons.filter(function (l) { return l.no === no; })[0] || d.lessons[0];
    document.title = lesson.no + "차시 실시간 현황 · 무.도.키즈";
    var keep = new URLSearchParams(location.search);
    document.getElementById("lesson-pick").innerHTML = d.lessons.map(function (l) {
      keep.set("l", l.no);
      return '<a href="?' + keep.toString() + '" class="lp' + (l.no === lesson.no ? " is-on" : "") + '" title="' + l.no + "차시 " + esc(l.title) + '">' + esc(l.letter) + "</a>";
    }).join("");
    render();
    if (conn.room && conn.key) poll();
  }).catch(function (e) { document.getElementById("app").innerHTML = '<p class="status">' + esc(e.message) + "</p>"; });

  function studentLink() {
    var base = location.href.replace(/live\.html.*$/, "sheet.html");
    var p = new URLSearchParams({ l: lesson.no, room: conn.room || "" });
    var s = q.get("server"); if (s) p.set("server", s);
    return base + "?" + p.toString();
  }

  function render() {
    var app = document.getElementById("app");
    var head = '<section class="live-head"><div><p class="sheet-no">' + lesson.no + "차시 · " + esc(lesson.word) + "</p>" +
      "<h1>" + esc(lesson.letter) + " · " + esc(lesson.title) + " 실시간 현황</h1>" +
      '<p class="live-meta" id="meta">' + (conn.room ? "참여 코드 <b>" + esc(conn.room) + "</b>" : "") + "</p></div>" +
      (conn.room && conn.key ? '<div class="live-tools">' +
        '<button class="btn ghost small" id="copy">학생 링크 복사</button>' +
        '<a class="btn ghost small" target="_blank" rel="noopener" href="' + esc(studentLink()) + '">학생 화면 미리보기</a>' +
        '<button class="btn ghost small" id="csv">CSV 받기</button>' +
        '<button class="btn ghost small" id="reset">이 차시 기록 지우기</button></div>' : "") +
      "</section>";
    if (!conn.room || !conn.key) {
      app.innerHTML = head + '<section class="connect"><p><b>교실 링크 교사 화면 → 무.도.키즈 활동지 탭 → 실시간 현황</b>을 누르면 자동으로 연결돼요. ' +
        "선생님 연결 키는 이 탭에만 보관되고, 탭을 닫으면 지워져요.</p></section>";
      return;
    }
    app.innerHTML = head + '<div id="board"><p class="status">학생 기록을 불러오는 중…</p></div>';
    app.querySelector("#copy").onclick = function () {
      var t = studentLink();
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { alert("학생 링크를 복사했어요.\n" + t); }, function () { prompt("학생 링크", t); });
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

  function paint() {
    var board = document.getElementById("board"); if (!board) return;
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

  function csv() {
    if (!data) return;
    var cols = M.fieldsOf(lesson);
    var rows = [["반", "번호", "모둠", "제출"].concat(cols.map(function (f) { return (f.pi + 1) + ". " + f.item.label; }))];
    (data.students || []).forEach(function (s) {
      rows.push([s.ban, s.no, s.group || "", s.submitted ? "O" : ""].concat(cols.map(function (f) { return M.show(s.fields[f.key]); })));
    });
    var text = "﻿" + rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(","); }).join("\r\n");
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
    a.download = "무도키즈_" + lesson.no + "차시_" + conn.room + ".csv"; a.click();
  }
})();
