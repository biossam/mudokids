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

  function start(data) {
    var no = Number(q.get("l")) || 1;
    lesson = data.lessons.filter(function (l) { return l.no === no; })[0] || data.lessons[0];
    me = read(ME_KEY, {});
    var room = (q.get("room") || "").replace(/[^0-9A-Za-z]/g, "").toUpperCase().slice(0, 6);
    if (room) { me.room = room; write(ME_KEY, me); }
    state = read(SHEET_KEY + lesson.no, { fields: {}, gt: {}, submitted: false });
    document.title = lesson.no + "차시 " + lesson.title + " 활동지 · 무.도.키즈";
    renderPicker(data);
    render();
  }

  function renderPicker(data) {
    var keep = new URLSearchParams(location.search);
    document.getElementById("lesson-pick").innerHTML = data.lessons.map(function (l) {
      keep.set("l", l.no);
      return '<a href="?' + keep.toString() + '" class="lp' + (l.no === lesson.no ? " is-on" : "") + '" title="' + l.no + "차시 " + esc(l.title) + '">' + esc(l.letter) + "</a>";
    }).join("");
  }

  function liveOn() { return Boolean(M.live.url); }

  function render() {
    var app = document.getElementById("app");
    app.innerHTML =
      '<section class="sheet-hero">' +
        '<span class="sheet-badge">' + esc(lesson.letter) + "</span>" +
        "<div><p class=\"sheet-no\">" + lesson.no + "차시 · " + esc(lesson.word) + "</p>" +
        '<h1 class="sheet-title">' + esc(lesson.title) + "</h1>" +
        '<p class="sheet-q">' + esc(lesson.q) + "</p></div>" +
      "</section>" +
      '<section class="me-box" aria-label="나의 정보">' +
        (liveOn() ? '<label class="me-room">참여 코드<input data-me="room" maxlength="6" autocapitalize="characters" autocomplete="off" value="' + esc(me.room || "") + '"></label>' : "") +
        '<label>반<input data-me="ban" maxlength="3" inputmode="numeric" value="' + esc(me.ban || "") + '"></label>' +
        '<label>번호<input data-me="no" maxlength="3" inputmode="numeric" value="' + esc(me.no || "") + '"></label>' +
        '<label>모둠<input data-me="group" maxlength="4" value="' + esc(me.group || "") + '" placeholder="예: 1"></label>' +
        '<label class="me-name">이름<input data-me="name" maxlength="20" value="' + esc(me.name || "") + '" placeholder="그림 저장용"></label>' +
        (liveOn() ? '<span class="live-chip" id="chip">연결 안 됨</span>' : "") +
        (liveOn() ? '<p class="me-help">교실 링크 참여 코드와 반·번호를 쓰면 쓰는 내용이 선생님 화면에 자동으로 저장돼요. 이름은 이 기기에만 남아요.</p>' : "") +
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
    if (liveOn()) { sync(false); clearInterval(pullTimer); pullTimer = setInterval(pullGroup, 6000); }
  }

  function partHtml(p, pi) {
    var group = p.who === "모둠";
    return '<section class="part' + (group ? " is-group" : "") + '" data-pi="' + pi + '">' +
      '<h2 class="part-title"><span class="part-no">' + (pi + 1) + "</span>" + esc(p.title) +
      '<span class="who' + (group ? " g" : "") + '">' + (group ? "모둠이 함께" : "혼자") + "</span></h2>" +
      (group ? '<p class="part-help">모둠을 쓰면 같은 모둠 친구가 쓴 내용이 이 칸에 함께 보여요.</p>' : "") +
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

  function setField(key, v) {
    state.fields[key] = v;
    state.gt[key] = Date.now();
    write(SHEET_KEY + lesson.no, state);
    paintProgress();
    soon();
  }

  function bind(app) {
    app.addEventListener("input", function (e) {
      var t = e.target;
      if (t.dataset.field) return setField(t.dataset.field, t.value);
      if (t.dataset.me) {
        var v = t.value;
        if (t.dataset.me === "room") { v = v.replace(/[^0-9A-Za-z]/g, "").toUpperCase(); t.value = v; }
        me[t.dataset.me] = v.trim(); write(ME_KEY, me);
        if (t.dataset.me !== "name") soon(900);
      }
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
        state = { fields: {}, gt: {}, submitted: false }; write(SHEET_KEY + lesson.no, state); render();
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
    var fields = {}, gfields = {};
    Object.keys(state.fields).forEach(function (k) {
      fields[k] = state.fields[k];
      if (w.group && isGroupKey(k)) gfields[k] = { v: state.fields[k], t: state.gt[k] || 0 };
    });
    chip("보내는 중…", true);
    var summary = submit ? M.fieldsOf(lesson).map(function (f) { return f.item.label + ": " + (M.show(state.fields[f.key]) || "-"); }).join("\n") : undefined;
    return M.call({ action: "save", room: w.room, lesson: M.serverLesson(lesson.no), student: { ban: w.ban, no: w.no, group: w.group },
      dev: deviceId(), fields: fields, gfields: gfields, progress: M.progress(lesson, state.fields), submit: submit, summary: summary })
      .then(function (r) {
        if (r.gfields) mergeGroup(r.gfields);
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

  function pullGroup() {
    var w = who();
    if (w.room.length !== 6 || !w.group || !lesson.parts.some(function (p) { return p.who === "모둠"; })) return;
    M.call({ action: "group", room: w.room, lesson: M.serverLesson(lesson.no), group: w.group, student: { ban: w.ban, no: w.no } })
      .then(function (r) { if (r.fields) mergeGroup(r.fields); }).catch(function () {});
  }

  // 같은 모둠 친구가 더 늦게 쓴 칸을 받아 넣음 (지금 쓰고 있는 칸은 건드리지 않음)
  function mergeGroup(g) {
    var changed = false;
    Object.keys(g).forEach(function (k) {
      if (!isGroupKey(k)) return;
      var item = g[k];
      if (!item || (item.t || 0) <= (state.gt[k] || 0)) return;
      var el = document.querySelector('[data-field="' + k + '"]');
      if (el && document.activeElement === el) return;
      state.fields[k] = item.v; state.gt[k] = item.t; changed = true;
      if (el) el.value = item.v || ""; else repaintItem(k);
    });
    if (changed) { write(SHEET_KEY + lesson.no, state); paintProgress(); }
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
