"""index.html의 수업 이야기 탭과 체크리스트 탭의 '따라 하기 체크리스트'를 data/stories.json에서 다시 만든다.
   python3 tools/build_stories.py  (신청서 내용이 바뀌면 data/stories.json을 고치고 다시 실행)"""
import json, html, re
from pathlib import Path
R = Path(__file__).resolve().parent.parent
st = json.load(open(R / "data/stories.json", encoding="utf-8"))
sh = {L["no"]: L for L in json.load(open(R / "data/sheets.json", encoding="utf-8"))["lessons"]}
sv = json.load(open(R / "data/survey.json", encoding="utf-8"))
axis = {k["name"]: k.get("axis", "") for k in sv["skills"]}
e = html.escape
phase = lambda n: "p1" if n <= 4 else "p2" if n <= 7 else "p3"
badge = lambda n: f'<img src="assets/img/badges/{n}.png" alt="{n}차시 {e(sh[n]["letter"])}" loading="lazy">'
w = lambda v: f"{max(0, (v - 3) / 2 * 100):.1f}%"   # 막대: 3점=0, 5점=100%
r = st["result"]; t = r["total"]

o = ['''    <div class="page" data-page="stories" aria-label="수업 이야기">
    <section id="stories" class="section">
      <div class="wrap">
        <h2 class="section-title">수업 이야기</h2>
        <p class="lead">4개 학급에서 10차시를 실제로 운영하며 바꾼 점과 학생들의 변화예요.</p>
        <nav class="st-nav" aria-label="수업 이야기 차례"><a href="#st-change">1차 수업에서 바꾼 점</a><a href="#st-result">실제 변화</a><a href="#st-voice">학생 목소리</a><a href="#st-adapt">우리 학교에 맞게</a><a href="#check">따라 하기 체크리스트</a></nav>

        <h3 class="sk-h" id="st-change">1차 수업에서 바꾼 점</h3>
        <p class="small note">따라 하실 선생님을 위한 ‘함정 미리보기’예요. 처음 수업에서 걱정된 점과 최종본에서 바꾼 내용이에요.</p>
        <ol class="st-changes">''']
for c in st["changes"]:
    n = c["no"]
    o.append(f'''          <li class="{phase(n)}"><a class="st-lesson" href="lesson.html?l={n}">{badge(n)}<span>{n}차시<b>{e(sh[n]["title"])}</b></span></a>
            <div class="st-pair"><div class="st-before"><span>처음 걱정</span><p>{e(c["problem"])}</p></div><div class="st-after"><span>이렇게 바꿨어요</span><p>{e(c["final"])}</p></div></div></li>''')
o.append(f'''        </ol>

        <h3 class="sk-h" id="st-result">실제 변화</h3>
        <div class="st-stats">
          <div><span>휴먼스킬 평균</span><b>{t["pre"]:.2f} → {t["post"]:.2f}</b><em>+{t["post"]-t["pre"]:.2f}점</em></div>
          <div><span>그렇다 이상 응답</span><b>{t["posPre"]}% → {t["posPost"]}%</b><em>+{t["posPost"]-t["posPre"]}%p</em></div>
          <div><span>휴먼스킬 12가지</span><b>모두 상승</b><em>12개 영역 p&lt;.01</em></div>
          <div><span>응답한 학생</span><b>사전 81 · 사후 83명</b><em>4개 학급</em></div>
        </div>
        <p class="st-summary">{e(r["summary"])}</p>
        <div class="st-expect">''')
for x in r["expected"]:
    o.append(f'          <div><b>{e(x["title"])}</b><p>{e(x["text"])}</p></div>')
o.append('''        </div>
        <div class="st-chart">
          <p class="st-legend"><span><i class="pre"></i>사전</span><span><i class="post"></i>사후</span><span class="small">5점 만점 · 막대는 3점부터 · 많이 오른 순서</span></p>''')
for s in r["skills"]:
    d = s["post"] - s["pre"]
    o.append(f'''          <details class="st-row"><summary><span class="st-name ax-{axis.get(s["name"], "")}">{e(s["name"])}</span>
            <span class="st-bars"><span class="st-bar pre"><i style="width:{w(s["pre"])}"></i>{s["pre"]:.2f}</span><span class="st-bar post"><i style="width:{w(s["post"])}"></i>{s["post"]:.2f}</span></span>
            <span class="st-d">+{d:.2f}</span></summary><p>{e(s["note"])} <span class="small">(그렇다 이상 {s["posPre"]}% → {s["posPost"]}%)</span></p></details>''')
o.append(f'''          <div class="st-row st-total"><span class="st-name">전체 36문항</span>
            <span class="st-bars"><span class="st-bar pre"><i style="width:{w(t["pre"])}"></i>{t["pre"]:.2f}</span><span class="st-bar post"><i style="width:{w(t["post"])}"></i>{t["post"]:.2f}</span></span>
            <span class="st-d">+{t["post"]-t["pre"]:.2f}</span></div>
          <p class="small note">이름 색은 휴먼스킬의 세 갈래(중심잡기·성찰하기·융합하기)예요. 줄을 누르면 해석이 나와요.</p>
        </div>
        <div class="st-two">
          <div class="st-box"><h4>반별 보기</h4><ul class="st-classes">''')
for c in r["classes"]:
    o.append(f'            <li><b>{e(c["name"])}</b><span class="st-bars"><span class="st-bar pre"><i style="width:{w(c["pre"])}"></i>{c["pre"]:.2f}</span><span class="st-bar post"><i style="width:{w(c["post"])}"></i>{c["post"]:.2f}</span></span><span class="st-d">+{c["post"]-c["pre"]:.2f}</span></li>')
o.append(f'''          </ul><p class="small">{e(r["classNote"])}</p></div>
          <div class="st-box"><h4>어떻게 쟀나요</h4><dl class="st-dl">''' + "".join(f"<dt>{e(a)}</dt><dd>{e(b)}</dd>" for a, b in r["overview"]) + '''</dl></div>
        </div>
        <div class="st-box st-caution"><h4>해석할 때 유의할 점</h4><ul>''' + "".join(f"<li>{e(x)}</li>" for x in r["cautions"]) + '''</ul></div>

        <h3 class="sk-h" id="st-voice">학생 목소리</h3>
        <div class="st-voices">''')
for v in st["voices"]:
    o.append(f'          <figure class="st-voice"><figcaption class="st-vt">{e(v["title"])}</figcaption><blockquote>“{e(v["quote"])}”</blockquote><p class="small">{e(v["who"])}</p></figure>')
o.append('''        </div>

        <h3 class="sk-h" id="st-adapt">우리 학교에 맞게 바꾸려면</h3>
        <div class="st-adapt">''')
for i, a in enumerate(st["adapt"]):
    o.append(f'          <div class="st-box"><h4>{e(a["title"])}</h4><ul>' + "".join(f"<li>{e(x)}</li>" for x in a["items"]) + "</ul></div>")
o.append(f'''        </div>
        <p class="small note">자료: {e(st["source"])}</p>
      </div>
    </section>
    </div>
''')
stories = "\n".join(o)

f = ['        <!-- follow:start -->', '        <h2 class="section-title check-second">따라 하기 체크리스트</h2>',
     '        <p class="lead">연구회가 실제 수업에서 챙긴 것들이에요. 수업 전 · 차시별 · 수업 후 순서대로 확인해 보세요.</p>', '        <div class="checks follow">']
for g in st["follow"]:
    f.append(f'          <h3 class="check-group">{e(g["group"])}</h3>')
    for it in g["items"]:
        f.append(f'          <label><input type="checkbox"> {e(it)}</label>')
f += ['        </div>', '        <!-- follow:end -->']
follow = "\n".join(f)

p = R / "index.html"; s = p.read_text(encoding="utf-8")
s, k1 = re.subn(r'    <!-- 준비 중 -->\n', "", s)
s, k2 = re.subn(r'    <div class="page" data-page="stories".*?</section>\n    </div>\n', lambda m: stories, s, flags=re.S)
assert k2 == 1, "stories page not found"
if "<!-- follow:start -->" in s:
    s = re.sub(r'        <!-- follow:start -->.*?<!-- follow:end -->', lambda m: follow, s, flags=re.S)
else:
    anchor = '        <h2 class="section-title check-second">수업하기 체크리스트</h2>'
    assert anchor in s
    s = s.replace(anchor, follow + "\n\n" + anchor, 1)
p.write_text(s, encoding="utf-8")
print("ok", k1, k2)
