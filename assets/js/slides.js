/* 무.도.키즈 웹 슬라이드: data/lessons.json의 slides를 16:9 화면으로 그림
   layout: cover · map · talk · goal · cards · activity · matrix · match · split · sentence · next · finish */
(function () {
  var M = window.MDK, esc = M.esc;
  var WORD = "RUNNINGMAN";

  function frame(f) {
    // "______" 를 빈칸 그림으로
    return esc(f).replace(/_{3,}/g, '<span class="blank"></span>');
  }

  function letters(cur) {
    return '<div class="s-letters">' + M.data.lessons.map(function (l) {
      return '<span class="' + (l.no === cur ? "on" : l.no < cur ? "done" : "") + (l.no === 8 ? " gap" : "") + '">' + esc(l.letter) + "</span>";
    }).join("") + "</div>";
  }

  function sheetTag(s, base) {
    if (s.sheet == null) return "";
    var p = base.parts[s.sheet];
    return '<span class="s-sheet">활동지 ' + (s.sheet + 1) + " · " + esc(p ? p.title : "") + "</span>";
  }

  M.slideHtml = function (base, info, s, idx) {
    var head = s.kicker ? '<p class="s-kicker">' + esc(s.kicker) + "</p>" : "";
    var title = s.title ? '<h2 class="s-title">' + esc(s.title) + "</h2>" : "";
    var tip = s.tip ? '<p class="s-tip">' + esc(s.tip) + "</p>" : "";
    var body = "";
    switch (s.layout) {
      case "cover":
        body = '<div class="s-cover"><span class="s-bigletter">' + esc(base.letter) + "</span>" +
          '<div><p class="s-kicker">RUNNING MAN · ' + base.no + "차시 · " + esc(base.word) + "</p>" +
          '<h1 class="s-h1">' + esc(base.title) + "</h1>" +
          '<p class="s-sub">' + esc(info.topic) + "</p></div></div>" + letters(base.no) +
          '<p class="s-foot">' + esc(M.CREDIT) + "</p>";
        break;
      case "map":
        body = '<p class="s-kicker">RUNNING MAN 10차시</p><h2 class="s-title">' + (base.no === 10 ? "우리가 달려온 길" : "10차시 동안 우리가 갈 길") + "</h2>" +
          '<div class="s-map">' + M.data.lessons.map(function (l) {
            var ph = l.no <= 4 ? "p1" : l.no <= 7 ? "p2" : "p3";
            return '<div class="s-mapitem ' + ph + (l.no === base.no ? " on" : "") + '"><b>' + esc(l.letter) + "</b><span>" + l.no + "차시</span><em>" + esc(l.title) + "</em></div>";
          }).join("") + "</div>" +
          '<div class="s-phases"><span class="p1">나와 AI 이해하기</span><span class="p2">함께 연결하기</span><span class="p3">실천하고 미래 만들기</span></div>';
        break;
      case "goal":
        body = '<div class="s-center"><p class="s-kicker">학습 문제</p><p class="s-goal">' + esc(info.goal) + "</p></div>";
        break;
      case "talk":
        body = head + title + '<ul class="s-qs">' + (s.questions || []).map(function (q) { return "<li>" + esc(q) + "</li>"; }).join("") + "</ul>" +
          (s.link != null && info.links[s.link] ? '<a class="s-link" href="' + esc(info.links[s.link].url) + '" target="_blank" rel="noopener">▶ ' + esc(info.links[s.link].label) + "</a>" : "");
        break;
      case "cards":
        body = head + title + '<div class="s-cards n' + (s.cards || []).length + '">' + (s.cards || []).map(function (c) { return "<span>" + esc(c) + "</span>"; }).join("") + "</div>" + tip;
        break;
      case "activity":
        body = head + title + '<ol class="s-steps">' + (s.steps || []).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ol>" + tip;
        break;
      case "matrix":
        body = head + title + '<div class="s-matrix"><div class="s-pool">' + s.cards.map(function (c) { return "<span>" + esc(c) + "</span>"; }).join("") + "</div>" +
          '<div class="s-cols">' + s.cols.map(function (c) { return "<div><b>" + esc(c) + "</b></div>"; }).join("") + "</div></div>";
        break;
      case "match":
        body = head + title + '<div class="s-match">' + s.pairs.map(function (p) { return '<div><span class="from">' + esc(p) + '</span><span class="arrow">→</span><span class="to">AI 시대의 ?</span></div>'; }).join("") + "</div>" + tip;
        break;
      case "split":
        body = head + title + '<div class="s-split">' + [s.left, s.right].map(function (side) {
          return "<div><b>" + esc(side.head) + "</b><ul>" + side.items.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul></div>";
        }).join("") + "</div>" + tip;
        break;
      case "sentence":
        body = head + title + '<p class="s-frame">' + frame(s.frame) + "</p>" + tip;
        break;
      case "next":
        var nx = M.data.lessons.filter(function (l) { return l.no === base.no + 1; })[0];
        body = '<div class="s-center"><p class="s-kicker">다음 차시 예고</p>' +
          (nx ? '<p class="s-next"><span class="s-nextletter">' + esc(nx.letter) + "</span>" + nx.no + "차시 · " + esc(nx.title) + "</p>" : "") +
          '<p class="s-sub">' + esc(s.text) + "</p></div>";
        break;
      case "finish":
        body = '<div class="s-center"><p class="s-kicker">RUNNING MAN 완주!</p><h1 class="s-h1">화면 밖으로 나와<br>함께 뛰었어요</h1></div>' + letters(11) + '<p class="s-foot" style="text-align:center">' + esc(M.CREDIT) + "</p>";
        break;
    }
    return '<div class="slide ' + (s.layout || "") + " " + info.phase + '" data-i="' + idx + '"><div class="s-in">' + body + "</div>" + sheetTag(s, base) +
      '<span class="s-no">' + esc(base.letter) + " · " + (idx + 1) + "</span>" + (s.layout === "cover" ? "" : '<span class="s-credit">' + esc(M.CREDIT) + "</span>") + "</div>";
  };

  M.slideTitle = function (base, info, s) {
    if (s.layout === "cover") return base.title;
    if (s.layout === "goal") return "학습 문제";
    if (s.layout === "map") return "RUNNING MAN 10차시";
    if (s.layout === "next") return "다음 차시 예고";
    if (s.layout === "finish") return "RUNNING MAN 완주";
    return s.title || "";
  };
})();
