/* 무.도.키즈 공통: 활동지 자료 불러오기, 교실 링크 서버 부르기 */
(function () {
  var M = (window.MDK = {});
  M.CREDIT = "출처: 무.도.키즈 교사연구회, NAVER CONNECT, TEACHERS LAB 5";

  M.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  M.load = function () {
    return fetch("data/sheets.json", { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error("활동지 자료를 불러오지 못했어요.");
      return r.json();
    }).then(function (data) {
      M.data = data;
      M.live = data.live || {};
      // 주소에 ?server=... 를 붙이면 다른 교실 링크 서버로 (시험용)
      var q = new URLSearchParams(location.search);
      var s = q.get("server");
      if (s && /^https?:\/\//.test(s)) M.live.url = s.replace(/\/$/, "") + "/api/snja";
      return data;
    });
  };

  // 서버의 차시 번호: 성장 MAP 차시와 섞이지 않도록 51~60을 씀
  M.serverLesson = function (no) { return (M.live.lessonOffset || 50) + Number(no); };

  M.call = function (body) {
    if (!M.live.url) return Promise.reject(new Error("실시간 서버가 설정되지 않았어요."));
    return fetch(M.live.url, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok || j.ok === false) {
          var e = new Error(j.error || j.message || "서버와 연결하지 못했어요.");
          e.status = r.status;
          throw e;
        }
        return j;
      });
    });
  };

  // 칸 목록: [{ key: "p0.v", part, pi, item }]
  M.fieldsOf = function (lesson) {
    var out = [];
    lesson.parts.forEach(function (p, pi) {
      p.items.forEach(function (it) { out.push({ key: "p" + pi + "." + it.id, part: p, pi: pi, item: it }); });
    });
    return out;
  };

  M.filled = function (v) {
    if (Array.isArray(v)) return v.length > 0;
    return v != null && String(v).trim() !== "";
  };

  M.show = function (v) {
    if (Array.isArray(v)) return v.join(", ");
    return v == null ? "" : String(v);
  };

  M.progress = function (lesson, fields) {
    return lesson.parts.map(function (p, pi) {
      var need = p.items.filter(function (it) { return !it.optional; });
      var done = need.filter(function (it) { return M.filled(fields["p" + pi + "." + it.id]); }).length;
      return [done, need.length];
    });
  };
})();
