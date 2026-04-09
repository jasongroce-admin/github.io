from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class RefParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []

    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        for attr in ("href", "src"):
            if attr in data:
                self.refs.append(data[attr])


def is_external(value: str) -> bool:
    return value.startswith(("http://", "https://", "mailto:", "#", "javascript:"))


def main() -> int:
    html_files = sorted(ROOT.rglob("*.html"))
    errors = []

    for html_file in html_files:
        parser = RefParser()
        parser.feed(html_file.read_text(encoding="utf-8"))

        for ref in parser.refs:
            if is_external(ref):
                continue
            target = (html_file.parent / ref).resolve()
            if not target.exists():
                errors.append(f"{html_file.relative_to(ROOT)} -> {ref}")

    if errors:
        print("Broken local references found:")
        for err in errors:
            print(f" - {err}")
        return 1

    print(f"OK: checked {len(html_files)} HTML files, no broken local references.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
