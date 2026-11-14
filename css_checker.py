import re, pathlib

src_files = list(pathlib.Path("src").rglob("*.js")) + list(pathlib.Path("src").rglob("*.jsx"))
words = set()
for f in src_files:
    words |= set(re.findall(r"[A-Za-z_][\w-]*", f.read_text(encoding="utf8")))

for css in pathlib.Path("src").rglob("*.css"):
    text = re.sub(r"/\*.*?\*/", "", css.read_text(encoding="utf8"), flags=re.S)
    classes = set(re.findall(r"\.([A-Za-z_][\w-]*)", text))
    unused = sorted(c for c in classes if c not in words)
    print(f"\n{css}  ({len(unused)} kandidat)")
    for c in unused:
        print("  .", c)