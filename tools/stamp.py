#!/usr/bin/env python3
"""배포 전에 실행: 게임 파일 주소에 새 버전 번호를 붙인다.

  python3 tools/stamp.py

- index.html 의 CSS·스크립트 주소에 ?v=버전
- import map 으로 js/ 아래 모든 모듈 주소에 ?v=버전 (모듈끼리 import 할 때도 새 파일을 받음)
- version.json 에 같은 버전 → 이미 열려 있던(캐시된) index.html 이 새 버전을 알아채고 다시 불러옴
"""
import json, re, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
version = time.strftime("%Y%m%d%H%M%S", time.gmtime())

modules = sorted(p.relative_to(ROOT).as_posix() for p in (ROOT / "js").rglob("*.js") if "vendor" not in p.parts)
imports = {f"/{m}": f"/{m}?v={version}" for m in modules}
importmap = json.dumps({"imports": imports}, indent=2, ensure_ascii=False)

html = (ROOT / "index.html").read_text(encoding="utf-8")
html = re.sub(r'(href|src)="(css/style\.css|js/main\.js|js/vendor/matter\.min\.js)(\?v=\w+)?"',
              lambda m: f'{m.group(1)}="{m.group(2)}?v={version}"', html)
html = re.sub(r'const BUILD = "\w*";', f'const BUILD = "{version}";', html)
html = re.sub(r'(<script type="importmap">).*?(</script>)',
              lambda m: m.group(1) + "\n" + importmap + "\n  " + m.group(2), html, flags=re.S)
(ROOT / "index.html").write_text(html, encoding="utf-8")
(ROOT / "version.json").write_text(json.dumps({"v": version}) + "\n", encoding="utf-8")
print("version", version, "/", len(modules), "modules")
