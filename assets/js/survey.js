/* 휴먼스킬 사전·사후 설문 (학생)
   survey.html?phase=pre|post&room=참여코드&skills=agency,critical
   - 고른 휴먼스킬 문항만 보여 줌(없으면 전부). 5점 얼굴 단추
   - 답은 기기에 저장되고, 참여 코드가 있으면 교실 링크 서버에 저장(사전 61차시 · 사후 62차시)
   - 이름은 보내지 않고 반·번호만 보냄 */
(function () {
  var M = window.MDK, esc = M.esc;
  var q = new URLSearchParams(location.search);
  var phase = q.get("phase") === "post" ? "post" : "pre";
  var EMBED = q.get("embed") === "1";
  if (EMBED) document.body.classList.add("embed");
  var ME_KEY = "mdk-me-v1", DEV_KEY = "mdk-dev-v1", KEY = "mdk-survey-v2-" + phase;
  var S, me, ans, items, timer, warned = "";

  function read(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function deviceId() {
    var id = read(DEV_KEY, "");
    if (!id || id.length < 16) {
      var a = new Uint8Array(12); crypto.getRandomValues(a);
      id = Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join(""); write(DEV_KEY, id);
    }
    return id;
  }

  Promise.all([M.load(), fetch("data/survey.json", { cache: "no-cache" }).then(function (r) { return r.json(); })]).then(function (res) {
    S = res[1];
    me = read(ME_KEY, {});
    var room = (q.get("room") || "").replace(/[^0-9A-Za-z]/g, "").toUpperCase().slice(0, 6);
    if (room) { me.room = room; write(ME_KEY, me); }
    var want = (q.get("skills") || "").split(",").filter(Boolean);
    var skills = S.skills.filter(function (s) { return !want.length || want.indexOf(s.id) >= 0; });
    items = [];
    skills.forEach(function (s) { s.items.forEach(function (it) { items.push(it); }); });
    ans = read(KEY, {});
    render();
  }).catch(function (e) { document.getElementById("app").innerHTML = '<p class="status">' + esc(e.message) + "</p>"; });

  function render() {
    var title = phase === "pre" ? "시작 전 설문" : "마친 뒤 설문";
    var app = document.getElementById("app");
    app.innerHTML =
      '<section class="sv-hero"><span class="sv-badge">' + (phase === "pre" ? "🏁" : "🏆") + '</span><div>' +
        '<p class="sheet-no">RUNNING MAN · 휴먼스킬</p><h1 class="sheet-title">' + title + "</h1>" +
        '<p class="sheet-q">' + (phase === "pre" ? "프로젝트를 시작하기 전에 지금의 나를 솔직하게 골라 주세요. 정답은 없어요." : "프로젝트를 마친 지금의 나를 솔직하게 골라 주세요. 처음과 비교하는 데 써요.") + "</p></div></section>" +
      '<section class="me-box">' +
        (M.live.url && !q.get("room") ? '<label class="me-room">참여 코드<input data-me="room" maxlength="6" autocapitalize="characters" value="' + esc(me.room || "") + '"></label>' : "") +
        '<label>반<input data-me="ban" maxlength="3" inputmode="numeric" value="' + esc(me.ban || "") + '"></label>' +
        '<label>번호<input data-me="no" maxlength="3" inputmode="numeric" value="' + esc(me.no || "") + '"></label>' +
        (M.live.url ? '<span class="live-chip" id="chip">연결 안 됨</span>' : "") +
        '<p class="me-help">반·번호만 선생님께 보내요. 처음 설문과 마지막 설문에 같은 반·번호를 써 주세요.</p>' +
      "</section>" +
      '<ol class="sv-list">' + items.map(function (it, i) {
        return '<li class="sv-item' + (ans[it.id] ? " done" : "") + '" data-id="' + it.id + '"><p class="sv-text"><span>' + (i + 1) + "</span>" + esc(it.text) + "</p>" +
          '<div class="sv-scale" role="radiogroup" aria-label="' + esc(it.text) + '">' + S.scale.map(function (lab, k) {
            var v = k + 1, on = ans[it.id] === v;
            return '<button type="button" role="radio" aria-checked="' + on + '" class="sv-opt' + (on ? " on" : "") + '" data-v="' + v + '"><b>' + S.faces[k] + "</b><span>" + esc(lab) + "</span></button>";
          }).join("") + "</div></li>";
      }).join("") + "</ol>" +
      '<label class="item sv-open"><span class="item-label">' + esc(S.open[phase].text) + '</span><textarea data-open rows="3" maxlength="600">' + esc(ans.open || "") + "</textarea></label>" +
      '<section class="sheet-foot"><div class="progress" id="progress"></div>' +
        '<div class="sheet-tools"><button class="btn primary" type="button" id="submit">다 했어요</button></div><p class="small" id="status"></p></section>';
    app.addEventListener("click", function (e) {
      var b = e.target.closest(".sv-opt");
      if (b) {
        var li = b.closest(".sv-item"); ans[li.dataset.id] = Number(b.dataset.v); write(KEY, ans);
        li.querySelectorAll(".sv-opt").forEach(function (x) { var on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-checked", on); });
        li.classList.add("done"); paint(); soon();
        var next = li.nextElementSibling; if (next && !next.classList.contains("done")) next.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      if (e.target.id === "submit") {
        var left = items.filter(function (it) { return !ans[it.id]; }).length;
        if (!left) return sync(true);
        M.ask("아직 " + left + "문항이 남았어요. 그래도 낼까요?", "그래도 내기").then(function (ok) { if (ok) sync(true); });
      }
    });
    app.addEventListener("input", function (e) {
      if (e.target.dataset.open !== undefined) { ans.open = e.target.value; write(KEY, ans); soon(1500); }
      if (e.target.dataset.me) { me[e.target.dataset.me] = e.target.value.replace(/[^0-9A-Za-z]/g, "").toUpperCase(); write(ME_KEY, me); soon(900); }
    });
    paint(); sync(false);
  }

  function paint() {
    var done = items.filter(function (it) { return ans[it.id]; }).length;
    document.getElementById("progress").innerHTML = '<div class="bar"><i style="width:' + Math.round(done / items.length * 100) + '%"></i></div><span>' +
      (done >= items.length ? "🎉 다 골랐어요! <b>다 했어요</b>를 눌러요." : done + " / " + items.length + "문항") + "</span>";
    document.getElementById("submit").classList.toggle("ready", done >= items.length);
  }
  function chip(t, ok) { var c = document.getElementById("chip"); if (c) { c.textContent = t; c.classList.toggle("on", Boolean(ok)); } }
  function soon(w) { clearTimeout(timer); timer = setTimeout(function () { sync(false); }, w || 700); }

  function sync(submit) {
    if (!M.live.url) return;
    var room = (me.room || "").toUpperCase(), ban = (me.ban || "").trim(), no = (me.no || "").trim();
    if (room.length !== 6 || !ban || !no) { chip(room.length === 6 ? "반·번호를 써요" : "참여 코드를 써요", false); return; }
    var done = items.filter(function (it) { return ans[it.id]; }).length;
    chip("보내는 중…", true);
    M.call({ action: "save", room: room, lesson: S.serverLesson[phase], student: { ban: ban, no: no, group: "" }, dev: deviceId(),
      fields: ans, progress: [[done, items.length]], submit: submit, summary: submit ? "설문 " + done + "/" + items.length : undefined })
      .then(function (r) {
        chip(r.submitted ? "다 했어요 ✓" : "선생님과 연결됨 · 자동 저장 중", true);
        if (submit) document.getElementById("status").textContent = "선생님께 보냈어요. 고마워요!";
      })
      .catch(function (e) {
        var bad = e.status === 409 || e.status === 422;
        chip(e.status === 409 ? "다른 기기에서 쓰는 번호예요" : e.status === 422 ? "번호를 확인해요" : "연결 안 됨", false);
        if (submit || (bad && warned !== me.ban + "-" + me.no)) { warned = me.ban + "-" + me.no; alert(e.message); }
      });
  }
})();
