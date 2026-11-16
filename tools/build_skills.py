"""index.html의 휴먼스킬 탭을 data/lessons.json·sheets.json·survey.json에서 다시 만든다.
   python3 tools/build_skills.py  (지도안 휴먼스킬을 고치면 다시 실행)"""
import json, html, re
from pathlib import Path
R = Path(__file__).resolve().parent.parent
les = {L["no"]: L for L in json.load(open(R / "data/lessons.json", encoding="utf-8"))["lessons"]}
sh = {L["no"]: L for L in json.load(open(R / "data/sheets.json", encoding="utf-8"))["lessons"]}
sv = json.load(open(R / "data/survey.json", encoding="utf-8"))
e = html.escape
phase = lambda n: "p1" if n <= 4 else "p2" if n <= 7 else "p3"

# 휴먼스킬별로 차시 모으기 (지도안 순서)
order, by = [], {}
for n in range(1, 11):
    for s in les[n]["skills"]:
        if s["name"] not in by:
            order.append(s["name"]); by[s["name"]] = []
        by[s["name"]].append((n, s))
items = {k["name"]: k["items"] for k in sv["skills"]}
desc = {k["name"]: k.get("desc", "") for k in sv["skills"]}
extra = "".join(f" 사전·사후 설문에는 휴먼스킬 틀에 있는 <b>{e(k['name'])}</b>도 들어 있어요(특정 차시 없이 프로젝트 전체에서 봐요)." for k in sv["skills"] if k["name"] not in by)

out = []
out.append('''    <div class="page" data-page="skills" aria-label="휴먼스킬">
    <section id="skills" class="section">
      <div class="wrap">
        <h2 class="section-title">RUNNING MAN이 키우는 휴먼스킬</h2>
        <p class="lead">AI가 대신하기 어려운 사람의 힘 가운데 ''' + str(len(order)) + '''가지를 10차시에 나누어 키워요. 차시마다 휴먼스킬 1~2개를 정해 <b>알기 · 하기 · 가치</b>로 수업을 짜고, 같은 기준으로 평가해요.</p>
        <div class="sk-map" role="table" aria-label="휴먼스킬과 차시">
          <div class="sk-row sk-head" role="row"><span role="columnheader">휴먼스킬</span>''' +
        "".join(f'<a role="columnheader" class="{phase(n)}" href="lesson.html?l={n}" title="{n}차시 {e(sh[n]["title"])}">{e(sh[n]["letter"])}<small>{n}</small></a>' for n in range(1, 11)) + "</div>")
for name in order:
    ns = [n for n, _ in by[name]]
    out.append(f'          <div class="sk-row" role="row"><a role="rowheader" href="#sk-{order.index(name)+1}">{e(name)}</a>' +
               "".join(f'<span role="cell" class="{phase(n) if n in ns else ""}">{"●" if n in ns else ""}</span>' for n in range(1, 11)) + "</div>")
out.append('''        </div>
        <p class="small note">● 그 차시에서 집중해서 키우는 휴먼스킬. 글자를 누르면 차시 화면이 열려요.''' + extra + '''</p>
        <p class="small note">아래 한 줄 풀이는 학생에게 설명하기 쉽게 쓴 것이고, 카드를 펼치면 차시별 지도안의 알기·하기·가치가 나와요.</p>
        <div class="sk-cards">''')
for i, name in enumerate(order, 1):
    ns = by[name]
    first = ns[0][1]
    out.append(f'''          <details class="sk-card" id="sk-{i}">
            <summary><b>{e(name)}</b><span class="sk-know">{e(desc.get(name) or first["know"])}</span>
              <span class="sk-chips">''' + "".join(f'<span class="sk-chip {phase(n)}">{n}차시 {e(sh[n]["letter"])}</span>' for n, _ in ns) + '''</span></summary>
            <div class="sk-body">''')
    for n, s in ns:
        out.append(f'''              <div class="sk-lesson"><h4><a href="lesson.html?l={n}">{n}차시 · {e(sh[n]["title"])}</a></h4>
                <dl><dt>알기</dt><dd>{e(s["know"])}</dd><dt>하기</dt><dd>{e(s["do"])}</dd><dt>가치</dt><dd>{e(s["value"])}</dd></dl></div>''')
    if name in items:
        out.append('              <p class="sk-survey"><b>설문 문항</b> ' + " · ".join(f"“{e(it['text'])}”" for it in items[name]) + "</p>")
    out.append("            </div>\n          </details>")
out.append('''        </div>
        <div class="sk-how">
          <h3>휴먼스킬이 자랐는지 이렇게 봐요</h3>
          <ul>
            <li><b>차시마다</b> 실시간 현황의 <b>평가 초안</b>이 활동지 답을 휴먼스킬 기준(상·중·하)으로 정리해요. 선생님이 고쳐서 확정해요.</li>
            <li><b>프로젝트 앞뒤로</b> 수업하기 화면에서 <b>휴먼스킬 사전·사후 설문</b>을 띄우고, 설문 결과에서 휴먼스킬별 변화를 봐요.</li>
            <li><b>숫자만 보지 않기</b>: 설문은 학생의 생각이라 관찰·활동지와 함께 해석해요. 차시 화면 → 수업 안내 탭에 평가 기준이 있어요.</li>
          </ul>
        </div>
      </div>
    </section>
    </div>
''')
block = "\n".join(out)
p = R / "index.html"; s = p.read_text(encoding="utf-8")
s = re.sub(r'    <div class="page" data-page="skills".*?</section>\n    </div>\n', "", s, flags=re.S)
anchor = '    <div class="page" data-page="guide"'
assert anchor in s
s = s.replace(anchor, block + "\n" + anchor, 1)
if 'data-tab="skills"' not in s:
    s = s.replace('<a href="#guide" data-tab="guide">수업 안내</a>', '<a href="#skills" data-tab="skills">휴먼스킬</a>\n        <a href="#guide" data-tab="guide">수업 안내</a>', 1)
p.write_text(s, encoding="utf-8")
print("skills:", len(order))
