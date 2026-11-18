"""index.html의 휴먼스킬 탭을 data/lessons.json·sheets.json·survey.json에서 다시 만든다.
   python3 tools/build_skills.py  (지도안 휴먼스킬을 고치면 다시 실행)"""
import json, html, re
from pathlib import Path
R = Path(__file__).resolve().parent.parent
les = {L["no"]: L for L in json.load(open(R / "data/lessons.json", encoding="utf-8"))["lessons"]}
sh = {L["no"]: L for L in json.load(open(R / "data/sheets.json", encoding="utf-8"))["lessons"]}
sv = json.load(open(R / "data/survey.json", encoding="utf-8"))
e = html.escape
PH = [("p1", "나와 AI 이해하기", range(1, 5)), ("p2", "함께 연결하기", range(5, 8)), ("p3", "실천하고 미래 만들기", range(8, 11))]
phase = lambda n: "p1" if n <= 4 else "p2" if n <= 7 else "p3"
badge = lambda n, cls: f'<img class="{cls}" src="assets/img/badges/{n}.png" alt="{n}차시 {e(sh[n]["letter"])}" loading="lazy">'

order, by = [], {}
for n in range(1, 11):
    for s in les[n]["skills"]:
        if s["name"] not in by:
            order.append(s["name"]); by[s["name"]] = []
        by[s["name"]].append((n, s))
desc = {k["name"]: k.get("desc", "") for k in sv["skills"]}
axis = {k["name"]: k.get("axis", "") for k in sv["skills"]}
lec = {k["name"]: k.get("lecture", "") for k in sv["skills"]}
extra = [k["name"] for k in sv["skills"] if k["name"] not in by]

o = []
o.append(f'''    <div class="page" data-page="skills" aria-label="휴먼스킬">
    <section id="skills" class="section">
      <div class="wrap">
        <h2 class="section-title">RUNNING MAN이 키우는 휴먼스킬</h2>
        <p class="lead"><b>인간중심 사고</b>는 “{e(sv.get("coreDef", ""))}”이에요. 휴먼스킬은 세 갈래 12가지이고, RUNNING MAN은 그중 {len(order)}가지를 10차시 동안 키워요.</p>
        <div class="ax-wrap">
          <p class="ax-core"><b>휴먼스킬</b><span>인간중심 사고</span></p>
          <div class="ax-cols">''')
for ax in sv["axes"]:
    names = ax.get("skills") or [k["name"] for k in sv["skills"] if k.get("axis") == ax["id"]]
    o.append(f'            <section class="ax ax-{ax["id"]}"><h3 class="ax-name">{e(ax["name"])}</h3>' + (f'<p class="ax-desc">{e(ax["desc"])}</p>' if ax.get("desc") else "") + '<ul>')
    for name in names:
        bs = "".join(f'<a href="lesson.html?l={n}" title="{n}차시 {e(sh[n]["title"])}">{badge(n, "")}</a>' for n, _ in by.get(name, []))
        o.append(f'              <li><b>{e(name)}</b><p class="ax-lec">{e(lec.get(name, ""))}</p><p>{e(desc.get(name, ""))}</p><span class="sk-mini">{bs or '<em>사전·사후 설문</em>'}</span></li>')
    o.append("            </ul></section>")
o.append(f'''          </div>
          <p class="small note">휴먼스킬 출처: <a href="{e(sv.get("axesUrl", "#"))}" target="_blank" rel="noopener">{e(sv.get("axesSource", ""))}</a>. 굵은 글씨 아래 첫 줄은 강의 설명이고(강의가 두 휴먼스킬을 한 문장으로 함께 설명한 것은 같은 문장을 넣었어요), 둘째 줄은 학생에게 설명하기 쉽게 쓴 풀이예요. 배지를 누르면 그 차시로 가요.</p>
        </div>

        <h3 class="sk-h">10차시 휴먼스킬 길</h3>
        <div class="sk-road">''')
for cls, title, rng in PH:
    o.append(f'          <div class="sk-phase {cls}"><p class="sk-phase-name">{e(title)} <span>{rng.start}~{rng.stop-1}차시</span></p><ol>')
    for n in rng:
        chips = "".join(f'<span class="sk-tag ax-{axis.get(s["name"], "")}">{e(s["name"])}</span>' for s in les[n]["skills"])
        o.append(f'            <li><a href="lesson.html?l={n}">{badge(n, "sk-badge")}<span class="sk-step"><b>{n}차시 · {e(sh[n]["title"])}</b>{chips}</span></a></li>')
    o.append("          </ol></div>")
o.append('''        </div>''')
o.append('''
        <h3 class="sk-h">자랐는지 이렇게 확인해요</h3>
        <ol class="sk-flow">
          <li><span class="sk-flow-when">1차시 전</span><b>사전 설문</b><p>수업하기에서 띄우고, 결과 CSV를 받아 둬요.</p></li>
          <li><span class="sk-flow-when">차시마다</span><b>평가 초안</b><p>실시간 현황이 활동지 답을 상·중·하로 정리해요. 선생님이 확정해요.</p></li>
          <li><span class="sk-flow-when">10차시 뒤</span><b>사후 설문 · 비교</b><p>사전 CSV를 불러와 휴먼스킬별 변화를 봐요.</p></li>
        </ol>

        <h3 class="sk-h">차시별 알기 → 하기 → 가치</h3>
        <div class="kdv" data-kdv>
          <div class="kdv-pick" role="tablist" aria-label="차시 고르기">''')
for n in range(1, 11):
    o.append(f'            <button type="button" role="tab" class="kdv-btn {phase(n)}" data-kdv-n="{n}" aria-selected="{"true" if n == 1 else "false"}" aria-controls="kdv-{n}">{badge(n, "")}<span>{n}</span></button>')
o.append("          </div>")
for n in range(1, 11):
    o.append(f'          <section class="kdv-panel {phase(n)}" id="kdv-{n}" role="tabpanel"{"" if n == 1 else " hidden"}>')
    o.append(f'            <p class="kdv-title"><a href="lesson.html?l={n}">{n}차시 · {e(sh[n]["title"])}</a></p>')
    for s_ in les[n]["skills"]:
        o.append(f'''            <div class="kdv-row"><p class="kdv-skill">{e(s_["name"])}</p><ol class="kdv-flow">
              <li class="k"><span>알기</span><p>{e(s_["know"])}</p></li>
              <li class="d"><span>하기</span><p>{e(s_["do"])}</p></li>
              <li class="v"><span>가치</span><p>{e(s_["value"])}</p></li>
            </ol></div>''')
    o.append("          </section>")
o.append('''        </div>
        <script>
          (function () {
            var box = document.querySelector("[data-kdv]"); if (!box) return;
            box.addEventListener("click", function (e) {
              var b = e.target.closest("[data-kdv-n]"); if (!b) return;
              box.querySelectorAll("[data-kdv-n]").forEach(function (x) { x.setAttribute("aria-selected", x === b ? "true" : "false"); });
              box.querySelectorAll(".kdv-panel").forEach(function (p) { p.hidden = p.id !== "kdv-" + b.dataset.kdvN; });
            });
          })();
        </script>
      </div>
    </section>
    </div>
''')

block = "\n".join(o)
p = R / "index.html"; s = p.read_text(encoding="utf-8")
s, k = re.subn(r'    <div class="page" data-page="skills".*?</section>\n    </div>\n\n?', "", s, flags=re.S)
anchor = '    <div class="page" data-page="guide"'
s = s.replace(anchor, block + "\n" + anchor, 1)
if 'data-tab="skills"' not in s:
    s = s.replace('<a href="#guide" data-tab="guide">수업 안내</a>', '<a href="#skills" data-tab="skills">휴먼스킬</a>\n        <a href="#guide" data-tab="guide">수업 안내</a>', 1)
p.write_text(s, encoding="utf-8")
print("skills:", len(order), "replaced:", k)
