/* 휴먼스킬 사전·사후 설문 결과 (선생님)
   survey-results.html#room=참여코드&key=교사키  — 수업하기 화면의 [설문 결과]로 열림
   - 휴먼스킬별 사전·사후 평균, 같은 학생(반·번호)끼리 짝지은 변화, 문항별 평균, CSV(학생별 점수) */
(function () {
  var M = window.MDK, esc = M.esc;
  var KEY = "mdk-live-teacher-v1";
  var conn = {}; try { conn = JSON.parse(sessionStorage.getItem(KEY)) || {}; } catch (e) {}
  var h = new URLSearchParams(location.hash.slice(1));
  if (h.get("room") && h.get("key")) {
    conn = { room: h.get("room").toUpperCase().slice(0, 6), key: h.get("key") };
    try { sessionStorage.setItem(KEY, JSON.stringify(conn)); } catch (e) {}
    history.replaceState(null, "", location.pathname + location.search);
  }
  var S, pre = [], post = [], fromFile = null, app = document.getElementById("app");

  Promise.all([M.load(), fetch("data/survey.json", { cache: "no-cache" }).then(function (r) { return r.json(); })]).then(function (res) {
    S = res[1];
    if (!conn.room || !conn.key) {
      app.innerHTML = '<section class="connect"><p><b>수업하기 화면 → 휴먼스킬 설문 → 설문 결과</b>로 열면 자동으로 연결돼요.</p></section>';
      return;
    }
    load();
  }).catch(function (e) { app.innerHTML = '<p class="status">' + esc(e.message) + "</p>"; });

  function load() {
    app.innerHTML = '<p class="status">설문 결과를 불러오는 중…</p>';
    Promise.all([
      M.call({ action: "dash", room: conn.room, teacher: conn.key, lesson: S.serverLesson.pre }),
      M.call({ action: "dash", room: conn.room, teacher: conn.key, lesson: S.serverLesson.post })
    ]).then(function (r) { pre = r[0].students || []; post = r[1].students || []; if (fromFile) mergeFile(); paint(); })
      .catch(function (e) { app.innerHTML = '<section class="connect"><p>' + esc(e.message) + "</p></section>"; });
  }

  function mean(arr) { arr = arr.filter(function (x) { return typeof x === "number"; }); return arr.length ? arr.reduce(function (a, b) { return a + b; }, 0) / arr.length : null; }
  function skillScore(fields, sk) { return mean(sk.items.map(function (it) { return fields[it.id]; })); }
  function f1(x) { return x == null ? "–" : x.toFixed(2); }

  function paint() {
    var bySid = {}; post.forEach(function (s) { bySid[s.sid] = s; });
    var pairs = pre.filter(function (s) { return bySid[s.sid]; });
    var used = S.skills.filter(function (sk) { return pre.concat(post).some(function (s) { return sk.items.some(function (it) { return s.fields[it.id]; }); }); });
    var rows = used.map(function (sk) {
      var a = mean(pre.map(function (s) { return skillScore(s.fields, sk); })), b = mean(post.map(function (s) { return skillScore(s.fields, sk); }));
      var d = mean(pairs.map(function (s) { var x = skillScore(s.fields, sk), y = skillScore(bySid[s.sid].fields, sk); return x != null && y != null ? y - x : null; }));
      return { sk: sk, a: a, b: b, d: d };
    });
    var html = '<section class="live-head"><div><p class="sheet-no">RUNNING MAN · 휴먼스킬</p><h1>사전·사후 설문 결과</h1>' +
      '<p class="live-meta">참여 코드 <b>' + esc(conn.room) + "</b></p></div>" +
      '<div class="live-tools"><button class="btn ghost small" id="reload">새로 불러오기</button><button class="btn ghost small" id="csv">CSV 받기</button>' +
        '<label class="btn ghost small sr-file">지난 CSV 불러오기<input type="file" id="file" accept=".csv,text/csv" hidden></label></div></section>' +
      '<p class="small ev-note">수업 기록은 12시간 뒤 지워져요. <b>사전 설문을 마치면 꼭 CSV를 받아 두고</b>, 몇 주 뒤 사후 설문을 한 뒤 <b>지난 CSV 불러오기</b>로 그 파일을 넣으면 같은 반·번호끼리 비교해요.' + (fromFile ? " <b>불러온 파일: " + esc(fromFile.name) + "</b>" : "") + "</p>" +
      '<div class="summary"><div><b>' + pre.length + "</b><span>사전 설문</span></div><div><b>" + post.length + "</b><span>사후 설문</span></div><div><b>" + pairs.length + "</b><span>둘 다 한 학생 (변화 계산)</span></div></div>";
    if (!rows.length) {
      html += '<section class="connect"><p>아직 설문 답이 없어요. 수업하기 화면에서 <b>사전 설문 띄우기</b>를 누르면 학생 화면에 설문이 열려요.</p></section>';
    } else {
      html += '<section class="g-box"><h3>휴먼스킬별 평균 (5점 만점)</h3><p class="sr-legend"><span><i style="background:#c9c3b5"></i>사전</span><span><i style="background:var(--p3)"></i>사후</span><span>오른쪽 숫자: 같은 학생끼리 비교한 평균 변화</span></p>' +
        rows.map(function (r) {
          var cls = r.d == null ? "" : r.d > 0.05 ? "up" : r.d < -0.05 ? "down" : "";
          return '<div class="sr-skill"><span class="sr-name">' + esc(r.sk.name) + '</span><div class="sr-bars">' +
            '<div class="sr-bar pre"><i style="width:' + (r.a ? r.a / 5 * 100 : 0) + '%"></i>' + f1(r.a) + "</div>" +
            '<div class="sr-bar post"><i style="width:' + (r.b ? r.b / 5 * 100 : 0) + '%"></i>' + f1(r.b) + "</div></div>" +
            '<span class="sr-delta ' + cls + '">' + (r.d == null ? "–" : (r.d > 0 ? "+" : "") + r.d.toFixed(2)) + "</span></div>";
        }).join("") + "</section>" +
        '<p class="small ev-note">평균 변화는 사전·사후를 모두 한 학생(같은 반·번호)만으로 계산해요. 학생 수가 적으면 변화가 크게 흔들릴 수 있으니, 수업 관찰·활동지와 함께 해석해 주세요. 문항은 연구회 공식 문항으로 바꿔 쓸 수 있는 초안이에요.</p>' +
        '<section class="by-q"><h2>문항별 평균</h2>' + used.map(function (sk) {
          return "<details><summary>" + esc(sk.name) + "</summary><ul>" + sk.items.map(function (it) {
            return "<li><b>사전 " + f1(mean(pre.map(function (s) { return s.fields[it.id]; }))) + " · 사후 " + f1(mean(post.map(function (s) { return s.fields[it.id]; }))) + "</b>" + esc(it.text) + "</li>";
          }).join("") + "</ul></details>";
        }).join("") +
        "<details><summary>열린 질문 답</summary><ul>" +
          pre.concat(post).filter(function (s) { return M.filled(s.fields.open); }).map(function (s) { return "<li><b>" + esc(s.ban) + "-" + esc(s.no) + (post.indexOf(s) >= 0 ? " 사후" : " 사전") + "</b>" + esc(s.fields.open) + "</li>"; }).join("") +
        "</ul></details></section>";
    }
    app.innerHTML = html;
    app.querySelector("#reload").onclick = load;
    app.querySelector("#csv").onclick = function () { csv(used); };
    app.querySelector("#file").onchange = function (e) {
      var f = e.target.files[0]; if (!f) return;
      f.text().then(function (t) { fromFile = { name: f.name, rows: parseCsv(t.replace(/^\uFEFF/, "")) }; mergeFile(); paint(); });
    };
  }

  function parseCsv(t) {
    var rows = [], row = [], cur = "", q = false;
    for (var i = 0; i < t.length; i++) {
      var c = t[i];
      if (q) { if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n") { row.push(cur.replace(/\r$/, "")); rows.push(row); row = []; cur = ""; }
      else cur += c;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }
  // 지난 CSV(이 화면에서 받은 파일)의 사전·사후 답을 지금 기록에 더함. 지금 서버에 같은 학생 답이 있으면 서버 것을 씀
  function mergeFile() {
    var rows = fromFile.rows, head = rows[0] || [];
    var ids = {}; S.skills.forEach(function (sk) { sk.items.forEach(function (it) { ids[it.id] = 1; }); });
    ["사전", "사후"].forEach(function (ph) {
      var list = ph === "사전" ? pre : post, have = {};
      list.forEach(function (s) { have[s.sid] = 1; });
      rows.slice(1).forEach(function (r) {
        if (!r[0] && !r[1]) return;
        var fields = {}, any = false;
        head.forEach(function (h, i) {
          if (h.indexOf(ph + "·") !== 0) return;
          var id = h.slice(ph.length + 1);
          if (ids[id] && r[i] !== "" && !isNaN(r[i])) { fields[id] = Number(r[i]); any = true; }
          if (h === ph + "·열린 질문" && r[i]) fields.open = r[i];
        });
        var sid = r[0] + "-" + r[1];
        if (any && !have[sid]) { list.push({ sid: sid, ban: r[0], no: r[1], fields: fields }); have[sid] = 1; }
      });
    });
  }

  function csv(used) {
    var all = {}; pre.concat(post).forEach(function (s) { all[s.sid] = { ban: s.ban, no: s.no }; });
    var preBy = {}, postBy = {}; pre.forEach(function (s) { preBy[s.sid] = s.fields; }); post.forEach(function (s) { postBy[s.sid] = s.fields; });
    var itemIds = []; used.forEach(function (sk) { sk.items.forEach(function (it) { itemIds.push(it.id); }); });
    var head = ["반", "번호"].concat(used.map(function (sk) { return "사전·" + sk.name; }), used.map(function (sk) { return "사후·" + sk.name; }),
      itemIds.map(function (id) { return "사전·" + id; }), itemIds.map(function (id) { return "사후·" + id; }), ["사전·열린 질문", "사후·열린 질문"]);
    var rows = [head];
    Object.keys(all).sort().forEach(function (sid) {
      var a = preBy[sid] || {}, b = postBy[sid] || {};
      rows.push([all[sid].ban, all[sid].no].concat(
        used.map(function (sk) { var x = skillScore(a, sk); return x == null ? "" : x.toFixed(2); }),
        used.map(function (sk) { var x = skillScore(b, sk); return x == null ? "" : x.toFixed(2); }),
        itemIds.map(function (id) { return a[id] || ""; }), itemIds.map(function (id) { return b[id] || ""; }), [a.open || "", b.open || ""]));
    });
    var text = "﻿" + rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(","); }).join("\r\n");
    var el = document.createElement("a"); el.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
    el.download = "무도키즈_휴먼스킬설문_" + conn.room + ".csv"; el.click();
  }
})();
