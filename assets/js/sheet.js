/* 무.도.키즈 학생 활동지
   주소: sheet.html?l=차시&room=참여코드
   - 쓴 내용은 이 기기에 자동 저장 (localStorage)
   - 교실 링크 참여 코드 + 반·번호를 쓰면 몇 초마다 선생님 실시간 현황으로 보냄
   - 모둠 활동 칸은 같은 모둠 친구와 함께 씀 (칸마다 마지막에 쓴 내용이 남음)
   - 이름은 기기에만 남고 서버에는 보내지 않음 */
(function () {
  var M = window.MDK, esc = M.esc;
  var q = new URLSearchParams(location.search);
  var ME_KEY = "mdk-me-v1", DEV_KEY = "mdk-dev-v1", SHEET_KEY = "mdk-sheet-v1-";
  var lesson, state, me, timer, pullTimer, lastWarn = "";

  function read(key, dflt) { try { return JSON.parse(localStorage.getItem(key)) || dflt; } catch (e) { return dflt; } }
  function write(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }

  function deviceId() {
    var id = read(DEV_KEY, "");
    if (!id || id.length < 16) {
      var a = new Uint8Array(12); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach(function (_, i) { a[i] = Math.random() * 256; });
      id = Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
      write(DEV_KEY, id);
    }
    return id;
  }

  M.load().then(start).catch(function (e) {
    document.getElementById("app").innerHTML = '<p class="status">' + esc(e.message) + "</p>";
  });

  var EMBED = q.get("embed") === "1";
  if (EMBED) document.body.classList.add("embed");

  // 차시 화면 안에 넣었을 때: 높이를 알려 주고, #p번호 파트로 스크롤
  function postHeight() {
    if (EMBED && window.parent !== window) window.parent.postMessage({ mdkSheetHeight: document.documentElement.scrollHeight }, "*");
  }
  function jumpToPart() {
    var m = location.hash.match(/^#p(\d+)$/);
    var el = m && document.querySelector('.part[data-pi="' + m[1] + '"]');
    if (el) { el.scrollIntoView({ block: "start" }); el.classList.add("is-focus"); }
  }
  window.addEventListener("hashchange", jumpToPart);
  if (window.ResizeObserver) new ResizeObserver(postHeight).observe(document.documentElement);

  function start(data) {
    var no = Number(q.get("l")) || 1;
    lesson = data.lessons.filter(function (l) { return l.no === no; })[0] || data.lessons[0];
    me = read(ME_KEY, {});
    var room = (q.get("room") || "").replace(/[^0-9A-Za-z]/g, "").toUpperCase().slice(0, 6);
    if (room) { me.room = room; write(ME_KEY, me); }
    state = read(SHEET_KEY + lesson.no, {});
    state = { fields: state.fields || {}, gv: state.gv || {}, dirty: state.dirty || {}, by: state.by || {}, submitted: Boolean(state.submitted) };
    document.title = lesson.no + "차시 " + lesson.title + " 활동지 · 무.도.키즈";
    if (!EMBED) renderPicker(data);
    render();
    jumpToPart(); postHeight();
  }

  function renderPicker(data) {
    var keep = new URLSearchParams(location.search);
    document.getElementById("lesson-pick").innerHTML = data.lessons.map(function (l) {
      keep.set("l", l.no);
      return '<a href="?' + keep.toString() + '" class="lp' + (l.no === lesson.no ? " is-on" : "") + '" title="' + l.no + "차시 " + esc(l.title) + '">' + esc(l.letter) + "</a>";
    }).join("");
  }

  function liveOn() { return Boolean(M.live.url); }
  // 무.도.키즈 수업하기 화면 안에서 열림 (참여 코드는 이미 정해져 있음)
  function inClass() { return EMBED && Boolean(q.get("room")); }

  function render() {
    var app = document.getElementById("app");
    app.innerHTML =
      '<section class="sheet-hero">' +
        (lesson.badge ? '<img class="sheet-badge sheet-badge-img" src="' + esc(lesson.badge) + '" alt="' + lesson.no + '차시 배지">' : '<span class="sheet-badge">' + esc(lesson.letter) + "</span>") +
        "<div><p class=\"sheet-no\">" + lesson.no + "차시 · " + esc(lesson.word) + "</p>" +
        '<h1 class="sheet-title">' + esc(lesson.title) + "</h1>" +
        '<p class="sheet-q">' + esc(lesson.q) + "</p></div>" +
      "</section>" +
      '<section class="me-box" aria-label="나의 정보">' +
        (liveOn() && !inClass() ? '<label class="me-room">참여 코드<input data-me="room" maxlength="6" autocapitalize="characters" autocomplete="off" value="' + esc(me.room || "") + '"></label>' : "") +
        '<label>반<input data-me="ban" maxlength="3" inputmode="numeric" value="' + esc(me.ban || "") + '"></label>' +
        '<label>번호<input data-me="no" maxlength="3" inputmode="numeric" value="' + esc(me.no || "") + '"></label>' +
        '<label>모둠<input data-me="group" maxlength="2" inputmode="numeric" value="' + esc(me.group || "") + '" placeholder="숫자"></label>' +
        '<label class="me-name">이름<input data-me="name" maxlength="20" value="' + esc(me.name || "") + '" placeholder="그림 저장용"></label>' +
        (liveOn() ? '<span class="live-chip" id="chip">연결 안 됨</span>' : "") +
        (liveOn() ? '<p class="me-help">' + (inClass() ? "반·번호·모둠을 쓰면 쓰는 내용이 선생님 화면에 자동으로 저장돼요." : "교실 링크 참여 코드와 반·번호를 쓰면 쓰는 내용이 선생님 화면에 자동으로 저장돼요.") + " 이름은 이 기기에만 남아요.</p>" : "") +
      "</section>" +
      lesson.parts.map(partHtml).join("") +
      '<section class="sheet-foot">' +
        '<div class="progress" id="progress" aria-live="polite"></div>' +
        '<div class="sheet-tools">' +
          (liveOn() ? '<button class="btn primary" type="button" id="submit">다 했어요</button>' : "") +
          '<button class="btn ' + (liveOn() ? "ghost" : "primary") + '" type="button" id="save-img">활동지 그림으로 저장</button>' +
          '<button class="btn ghost" type="button" id="clear">다 지우기</button>' +
        "</div>" +
        '<p class="small" id="status" aria-live="polite"></p>' +
      "</section>";
    bind(app);
    paintProgress();
    if (liveOn()) { sync(false); clearInterval(pullTimer); pullTimer = setInterval(pullGroup, 4000); visibleGroups = {}; watchGroups(); }
  }

  function partHtml(p, pi) {
    var group = p.who === "모둠";
    return '<section class="part' + (group ? " is-group" : "") + '" data-pi="' + pi + '">' +
      '<h2 class="part-title"><span class="part-no">' + (pi + 1) + "</span>" + esc(p.title) +
      '<span class="who' + (group ? " g" : "") + '">' + (group ? "모둠이 함께" : "혼자") + "</span></h2>" +
      (group ? '<p class="part-help">모둠 번호를 쓰면 같은 모둠 친구와 이 칸을 함께 써요. 친구가 쓰고 있는 칸에는 ✏️ 표시가 떠요.</p>' : "") +
      '<div class="items">' + p.items.map(function (it) { return itemHtml(pi, it); }).join("") + "</div></section>";
  }

  function itemHtml(pi, it) {
    var key = "p" + pi + "." + it.id, v = state.fields[key];
    var head = '<span class="item-label">' + esc(it.label) + (it.optional ? ' <em>(선택)</em>' : "") + "</span>" +
      (it.hint ? '<span class="item-hint">' + esc(it.hint) + "</span>" : "");
    if (it.type === "chips" || it.type === "pick") {
      var multi = it.type === "chips", list = multi ? (Array.isArray(v) ? v : []) : v;
      return '<div class="item' + (it.type === "pick" ? " is-pick" : "") + '" data-key="' + key + '">' + head +
        '<div class="chips" role="group">' + it.options.map(function (o) {
          var on = multi ? list.indexOf(o) >= 0 : list === o;
          return '<button type="button" class="chip' + (on ? " on" : "") + '" aria-pressed="' + on + '" data-opt="' + esc(o) + '" data-multi="' + multi + '" data-max="' + (it.max || 0) + '">' + esc(o) + "</button>";
        }).join("") + "</div></div>";
    }
    if (it.type === "line") {
      return '<label class="item is-line" data-key="' + key + '">' + (it.prefix || it.suffix ? "" : head) +
        '<span class="line-row">' + (it.prefix ? "<span>" + esc(it.prefix) + "</span>" : "") +
        '<input type="text" data-field="' + key + '" maxlength="200" value="' + esc(v || "") + '" aria-label="' + esc(it.label) + '">' +
        (it.suffix ? "<span>" + esc(it.suffix) + "</span>" : "") + "</span>" +
        (it.hint && (it.prefix || it.suffix) ? '<span class="item-hint">' + esc(it.hint) + "</span>" : "") + "</label>";
    }
    return '<label class="item" data-key="' + key + '">' + head +
      '<textarea data-field="' + key + '" rows="2" maxlength="1000">' + esc(v || "") + "</textarea></label>";
  }

  function isGroupKey(key) {
    var pi = Number(key.slice(1, key.indexOf(".")));
    return lesson.parts[pi] && lesson.parts[pi].who === "모둠";
  }

  /* ── 모둠 칸 함께 쓰기 ──
     모둠 칸은 '칸 이름(gk)'마다 서버 판(gv: 서버가 찍은 시각)을 기억하고, 바꾼 칸만(dirty) 마지막으로 본 판(base)과 함께 보냄.
     그 사이 친구가 먼저 고쳤으면 서버가 덮어쓰지 않고 알려 주고(conflicts), 학생이 친구 글/둘 다/내 글을 고름.
     고르는 칸(chips)은 선택지마다 따로(gk = "칸|선택지") 보내서 둘이 동시에 눌러도 둘 다 남음. */
  function itemOf(key) {
    var pi = Number(key.slice(1, key.indexOf("."))), id = key.slice(key.indexOf(".") + 1), p = lesson.parts[pi];
    return p && p.items.filter(function (x) { return x.id === id; })[0];
  }
  function baseKey(gk) { var i = gk.indexOf("|"); return i < 0 ? gk : gk.slice(0, i); }
  function gkeysOf(key, oldV, newV) {
    var it = itemOf(key);
    if (it && it.type === "chips") {
      var a = Array.isArray(oldV) ? oldV : [], b = Array.isArray(newV) ? newV : [];
      return it.options.filter(function (o) { return (a.indexOf(o) >= 0) !== (b.indexOf(o) >= 0); }).map(function (o) { return key + "|" + o; });
    }
    return [key];
  }
  function allGkeys(key) {
    var it = itemOf(key);
    if (it && it.type === "chips") return (Array.isArray(state.fields[key]) ? state.fields[key] : []).map(function (o) { return key + "|" + o; });
    return M.filled(state.fields[key]) ? [key] : [];
  }
  function gval(gk) {
    var i = gk.indexOf("|"); if (i < 0) return state.fields[gk] == null ? "" : state.fields[gk];
    var list = state.fields[gk.slice(0, i)]; return Array.isArray(list) && list.indexOf(gk.slice(i + 1)) >= 0;
  }
  function applyRemote(gk, v) {
    var i = gk.indexOf("|"); if (i < 0) { state.fields[gk] = v == null ? "" : v; return gk; }
    var k = gk.slice(0, i), o = gk.slice(i + 1), list = Array.isArray(state.fields[k]) ? state.fields[k].slice() : [], at = list.indexOf(o);
    if (v && at < 0) list.push(o); if (!v && at >= 0) list.splice(at, 1);
    state.fields[k] = list; return k;
  }
  function groupParts() { return lesson.parts.some(function (p) { return p.who === "모둠"; }); }
  function focusedGroupKey() {
    var el = document.activeElement; var k = el && el.dataset && el.dataset.field;
    return k && isGroupKey(k) ? k : "";
  }

  function setField(key, v) {
    var old = state.fields[key];
    state.fields[key] = v;
    if (isGroupKey(key) && (me.group || "").trim()) gkeysOf(key, old, v).forEach(function (gk) { if (!state.dirty[gk]) state.dirty[gk] = {}; });
    save();
    paintProgress();
    soon(isGroupKey(key) ? 800 : 1500);
  }
  function save() { write(SHEET_KEY + lesson.no, state); }

  function bind(app) {
    app.addEventListener("input", function (e) {
      var t = e.target;
      if (t.dataset.field) return setField(t.dataset.field, t.value);
      if (t.dataset.me) {
        var v = t.value;
        if (t.dataset.me === "room") { v = v.replace(/[^0-9A-Za-z]/g, "").toUpperCase(); t.value = v; }
        if (t.dataset.me === "group") { v = v.replace(/\D/g, "").slice(0, 2); t.value = v; return; } // 모둠은 다 쓰고 나서(change) 바꿈
        me[t.dataset.me] = v.trim(); write(ME_KEY, me);
        if (t.dataset.me !== "name") soon(900);
      }
    });
    app.addEventListener("change", function (e) {
      if (e.target.dataset.me === "group") changeGroup(e.target.value.replace(/\D/g, "").slice(0, 2));
    });
    app.addEventListener("click", function (e) {
      var b = e.target.closest("[data-cf]"); if (!b) return;
      resolveConflict(b.closest("[data-cfk]").dataset.cfk, b.dataset.cf);
    });
    app.addEventListener("click", function (e) {
      var c = e.target.closest(".chip");
      if (c) {
        var key = c.closest(".item").dataset.key, multi = c.dataset.multi === "true";
        if (multi) {
          var list = Array.isArray(state.fields[key]) ? state.fields[key].slice() : [];
          var i = list.indexOf(c.dataset.opt), max = Number(c.dataset.max) || 0;
          if (i >= 0) list.splice(i, 1);
          else if (max && list.length >= max) { flash(max + "개까지 고를 수 있어요."); return; }
          else list.push(c.dataset.opt);
          setField(key, list);
        } else {
          setField(key, state.fields[key] === c.dataset.opt ? "" : c.dataset.opt);
        }
        repaintItem(key);
        return;
      }
      if (e.target.id === "submit") {
        var left = leftParts();
        if (left.length && !confirm("아직 빈칸이 있어요.\n" + left.join("\n") + "\n\n그래도 다 했다고 보낼까요?")) return;
        return sync(true);
      }
      if (e.target.id === "save-img") return saveImage();
      if (e.target.id === "clear") {
        if (!confirm("이 활동지에 쓴 내용을 이 기기에서 모두 지울까요?")) return;
        state = { fields: {}, gv: {}, dirty: {}, by: {}, submitted: false }; save(); render();
      }
    });
  }

  function repaintItem(key) {
    var el = document.querySelector('[data-key="' + key + '"]');
    if (!el) return;
    var pi = Number(key.slice(1, key.indexOf("."))), id = key.slice(key.indexOf(".") + 1);
    var it = lesson.parts[pi].items.filter(function (x) { return x.id === id; })[0];
    var box = document.createElement("div"); box.innerHTML = itemHtml(pi, it);
    el.replaceWith(box.firstChild);
  }

  function flash(msg) { var s = document.getElementById("status"); if (s) { s.textContent = msg; setTimeout(function () { if (s.textContent === msg) s.textContent = ""; }, 2500); } }

  function leftParts() {
    return M.progress(lesson, state.fields).map(function (d, pi) { return d[0] < d[1] ? "· " + lesson.parts[pi].title + " (" + (d[1] - d[0]) + "칸 남음)" : ""; }).filter(Boolean);
  }

  function paintProgress() {
    var pr = M.progress(lesson, state.fields), done = 0, all = 0;
    pr.forEach(function (d) { done += d[0]; all += d[1]; });
    var el = document.getElementById("progress"); if (!el) return;
    el.innerHTML = '<div class="bar"><i style="width:' + (all ? Math.round(done / all * 100) : 0) + '%"></i></div>' +
      "<span>" + (done >= all ? "🎉 활동지를 다 채웠어요!" + (liveOn() ? " <b>다 했어요</b>를 눌러요." : " 그림으로 저장해 선생님께 보내요.") : done + " / " + all + "칸") + "</span>";
    var sb = document.getElementById("submit"); if (sb) sb.classList.toggle("ready", done >= all);
    document.querySelectorAll(".part").forEach(function (sec) {
      var d = pr[Number(sec.dataset.pi)]; sec.classList.toggle("is-done", d[0] >= d[1]);
    });
  }

  function chip(text, ok) { var c = document.getElementById("chip"); if (c) { c.textContent = text; c.classList.toggle("on", Boolean(ok)); } }

  function soon(wait) { if (!liveOn()) return; clearTimeout(timer); timer = setTimeout(function () { sync(false); }, wait || 1500); }

  function who() { return { room: (me.room || "").toUpperCase(), ban: (me.ban || "").trim(), no: (me.no || "").trim(), group: (me.group || "").trim() }; }

  function sync(submit) {
    var w = who();
    if (w.room.length !== 6 || !w.ban || !w.no) { chip(w.room.length === 6 ? "반·번호를 써요" : "참여 코드를 써요", false); return Promise.resolve(); }
    var fields = {}, gfields = {}, sent = {};
    Object.keys(state.fields).forEach(function (k) { fields[k] = state.fields[k]; });
    if (w.group) Object.keys(state.dirty).forEach(function (gk) {
      if (conflicts[gk]) return; // 친구 글과 겹친 칸은 학생이 고를 때까지 보내지 않음
      var v = gval(gk); sent[gk] = JSON.stringify(v);
      gfields[gk] = { v: v, base: state.gv[gk] || 0 };
      if (state.dirty[gk].force) gfields[gk].force = true;
    });
    chip("보내는 중…", true);
    var summary = submit ? M.fieldsOf(lesson).map(function (f) { return f.item.label + ": " + (M.show(state.fields[f.key]) || "-"); }).join("\n") : undefined;
    return M.call({ action: "save", room: w.room, lesson: M.serverLesson(lesson.no), student: { ban: w.ban, no: w.no, group: w.group },
      dev: deviceId(), fields: fields, gfields: gfields, typing: w.group ? focusedGroupKey() : undefined,
      progress: M.progress(lesson, state.fields), submit: submit, summary: summary })
      .then(function (r) {
        lastSync = Date.now();
        Object.keys(r.accepted || {}).forEach(function (gk) {
          state.gv[gk] = r.accepted[gk]; state.by[gk] = who().ban + "-" + who().no;
          if (state.dirty[gk] && JSON.stringify(gval(gk)) === sent[gk]) delete state.dirty[gk];
          else if (state.dirty[gk]) delete state.dirty[gk].force;
        });
        Object.keys(r.conflicts || {}).forEach(function (gk) { onConflict(gk, r.conflicts[gk]); });
        if (r.gfields) mergeGroup(r.gfields);
        if (r.typing) showTyping(r.typing);
        state.submitted = Boolean(r.submitted); write(SHEET_KEY + lesson.no, state);
        chip(r.submitted ? "다 했어요 ✓" : "선생님과 연결됨 · 자동 저장 중", true);
        if (submit) flash("선생님께 보냈어요. 고치면 다시 자동으로 저장돼요.");
      })
      .catch(function (err) {
        if (err.status === 409) {
          chip("다른 기기에서 쓰는 번호예요", false);
          var k = w.room + "/" + w.ban + "-" + w.no;
          if (submit || lastWarn !== k) { lastWarn = k; alert(err.message); }
          return;
        }
        chip(err.status === 404 ? "참여 코드를 확인해요" : "연결 안 됨", false);
        if (submit) alert(err.message);
      });
  }

  var lastSync = 0, pullTick = 0, conflicts = {};
  function pullGroup() {
    var w = who();
    if (w.room.length !== 6 || !w.group || !groupParts()) return;
    pullTick++;
    if (document.hidden && pullTick % 3) return;          // 다른 탭을 보고 있으면 덜 자주
    if (Date.now() - lastSync < 2500) return;            // 방금 저장하며 받았으면 건너뜀
    if (!groupInView() && !focusedGroupKey()) return;     // 모둠 활동이 화면에 없으면 받지 않음 (볼 때 바로 받음)
    M.call({ action: "group", room: w.room, lesson: M.serverLesson(lesson.no), group: w.group, student: { ban: w.ban, no: w.no }, typing: focusedGroupKey() })
      .then(function (r) { if (r.fields) mergeGroup(r.fields); showTyping(r.typing || {}); }).catch(function () {});
  }

  // 같은 모둠 친구가 고친 칸을 받아 넣음. 내가 고치고 아직 못 보낸 칸은 건드리지 않음(보낼 때 서버가 겹침을 알려 줌)
  function mergeGroup(g) {
    var changed = false, repaint = {};
    Object.keys(g).forEach(function (gk) {
      if (!isGroupKey(baseKey(gk))) return;
      var item = g[gk];
      if (!item || (item.t || 0) <= (state.gv[gk] || 0) || state.dirty[gk] || conflicts[gk]) return;
      state.gv[gk] = item.t; state.by[gk] = item.by;
      if (JSON.stringify(gval(gk)) === JSON.stringify(gk.indexOf("|") < 0 ? (item.v == null ? "" : item.v) : Boolean(item.v))) return;
      var k = applyRemote(gk, item.v); changed = true;
      var el = document.querySelector('[data-field="' + k + '"]');
      if (el) el.value = state.fields[k] || ""; else repaint[k] = true;
    });
    Object.keys(repaint).forEach(repaintItem);
    if (changed) { save(); paintProgress(); }
  }

  // 모둠 활동이 화면에 보이는지 (보일 때만 친구 글을 받아 서버 부담을 줄임)
  var visibleGroups = {};
  function groupInView() { return Object.keys(visibleGroups).some(function (k) { return visibleGroups[k]; }); }
  function watchGroups() {
    if (!window.IntersectionObserver) { visibleGroups.all = true; return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var was = groupInView(); visibleGroups[e.target.dataset.pi] = e.isIntersecting;
        if (!was && groupInView()) { lastSync = 0; pullGroup(); }
      });
    });
    document.querySelectorAll(".part.is-group").forEach(function (el) { io.observe(el); });
  }

  function showTyping(map) {
    document.querySelectorAll(".typing-note").forEach(function (n) { n.remove(); });
    Object.keys(map || {}).forEach(function (gk) {
      var el = document.querySelector('[data-key="' + baseKey(gk) + '"]'); if (!el) return;
      var n = document.createElement("span"); n.className = "typing-note"; n.textContent = "✏️ " + map[gk].replace("-", "반 ") + "번이 쓰는 중…";
      el.appendChild(n);
    });
  }

  function onConflict(gk, c) {
    var local = gval(gk), remote = gk.indexOf("|") < 0 ? (c.v == null ? "" : c.v) : Boolean(c.v);
    if (gk.indexOf("|") >= 0 || JSON.stringify(local) === JSON.stringify(remote) || !M.filled(local)) {
      // 고르는 칸이나 같은 글, 내 칸이 비어 있으면 친구 것을 그대로 받음
      state.gv[gk] = c.t; state.by[gk] = c.by; delete state.dirty[gk];
      var k = applyRemote(gk, c.v); var el = document.querySelector('[data-field="' + k + '"]');
      if (el) el.value = state.fields[k] || ""; else repaintItem(k);
      save(); paintProgress(); return;
    }
    conflicts[gk] = c;
    var box = document.querySelector('[data-key="' + gk + '"]'); if (!box) return;
    var old = box.querySelector(".conflict"); if (old) old.remove();
    var d = document.createElement("div"); d.className = "conflict"; d.dataset.cfk = gk;
    d.innerHTML = "<b>" + esc(String(c.by || "").replace("-", "반 ")) + "번이 이 칸을 먼저 고쳤어요.</b>" +
      '<p class="cf-text">“' + esc(remote) + '”</p>' +
      '<div class="cf-btns"><button type="button" class="btn ghost small" data-cf="theirs">친구 글로</button>' +
      '<button type="button" class="btn ghost small" data-cf="both">둘 다 남기기</button>' +
      '<button type="button" class="btn ghost small" data-cf="mine">내 글로</button></div>';
    box.appendChild(d);
  }

  function resolveConflict(gk, how) {
    var c = conflicts[gk]; if (!c) return;
    delete conflicts[gk];
    var el = document.querySelector('[data-field="' + gk + '"]');
    if (how === "theirs") { state.fields[gk] = c.v || ""; delete state.dirty[gk]; }
    else if (how === "both") {
      var it = itemOf(gk), sep = it && it.type === "line" ? " / " : "\n";  // 한 줄 칸은 줄바꿈을 못 담음
      state.fields[gk] = String(c.v || "") + sep + String(state.fields[gk] || ""); state.dirty[gk] = {};
    }
    else { state.dirty[gk] = { force: true }; }
    state.gv[gk] = c.t;
    if (el) el.value = state.fields[gk] || "";
    var box = document.querySelector('[data-cfk="' + gk + '"]'); if (box) box.remove();
    save(); paintProgress(); soon(200);
  }

  // 모둠 번호를 바꾸면: 다른 모둠에서 쓴 모둠 칸은 이 화면에서 비우고 새 모둠 것을 받음. 처음 쓰는 거면 지금까지 쓴 걸 모둠에 올림
  function changeGroup(g) {
    var before = (me.group || "").trim();
    me.group = g; write(ME_KEY, me);
    if (g === before) return;
    var groupKeys = M.fieldsOf(lesson).filter(function (f) { return f.part.who === "모둠"; }).map(function (f) { return f.key; });
    if (before) {
      groupKeys.forEach(function (k) { delete state.fields[k]; });
      Object.keys(state.gv).concat(Object.keys(state.dirty), Object.keys(conflicts)).forEach(function (gk) {
        if (groupKeys.indexOf(baseKey(gk)) >= 0) { delete state.gv[gk]; delete state.dirty[gk]; delete conflicts[gk]; delete state.by[gk]; }
      });
      groupKeys.forEach(repaintItem);
      if (g) flash(g + "모둠 칸을 불러와요.");
    } else if (g) {
      groupKeys.forEach(function (k) { allGkeys(k).forEach(function (gk) { state.dirty[gk] = {}; }); });
    }
    save(); paintProgress(); soon(300);
  }

  /* 활동지 그림으로 저장 */
  function saveImage() {
    var W = 1080, pad = 64, lh = 40, font = '"Gothic A1","Malgun Gothic",sans-serif';
    var cv = document.createElement("canvas"), cx = cv.getContext("2d");
    var lines = [];
    function wrap(text, size, weight, color, indent) {
      cx.font = (weight || 400) + " " + size + "px " + font;
      String(text).split("\n").forEach(function (para) {
        var cur = "";
        Array.from(para).forEach(function (ch) {
          if (cx.measureText(cur + ch).width > W - pad * 2 - (indent || 0)) { lines.push([cur, size, weight, color, indent]); cur = ch; }
          else cur += ch;
        });
        lines.push([cur, size, weight, color, indent]);
      });
    }
    var w = who();
    wrap(lesson.no + "차시 " + lesson.letter + " · " + lesson.title, 44, 700, "#1d1b4b");
    wrap([w.ban && w.ban + "반", w.no && w.no + "번", w.group && w.group + "모둠", me.name].filter(Boolean).join(" ") || " ", 26, 400, "#7a7891");
    lines.push(["", 20]);
    lesson.parts.forEach(function (p, pi) {
      wrap((pi + 1) + ". " + p.title, 32, 700, "#ff7a3d");
      p.items.forEach(function (it) {
        wrap(it.label, 24, 700, "#45436e", 12);
        wrap(M.show(state.fields["p" + pi + "." + it.id]) || "-", 26, 400, "#1d1b4b", 28);
      });
      lines.push(["", 16]);
    });
    var H = pad * 2 + lines.reduce(function (s, l) { return s + Math.max(l[1] * 1.55, 12); }, 0);
    cv.width = W; cv.height = H;
    cx.fillStyle = "#fffdf8"; cx.fillRect(0, 0, W, H);
    cx.fillStyle = "#ff7a3d"; cx.fillRect(0, 0, W, 14);
    var y = pad;
    lines.forEach(function (l) {
      cx.font = (l[2] || 400) + " " + l[1] + "px " + font; cx.fillStyle = l[3] || "#1d1b4b"; cx.textBaseline = "top";
      cx.fillText(l[0], pad + (l[4] || 0), y); y += Math.max(l[1] * 1.55, 12);
    });
    cx.font = "400 20px " + font; cx.fillStyle = "#b3b0c2"; cx.fillText("무.도.키즈 · RUNNING MAN", pad, H - 44);
    var a = document.createElement("a");
    a.download = "무도키즈_" + lesson.no + "차시_활동지" + (me.name ? "_" + me.name : "") + ".png";
    a.href = cv.toDataURL("image/png"); a.click();
  }
})();
