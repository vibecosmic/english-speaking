import json
from pathlib import Path

for name in ("README.md", "PROJECT.md", "AGENTS.md", "TASKS.md"):
    if not Path(name).read_text().strip():
        raise SystemExit(f"Missing required document: {name}")
for path in Path(".").rglob("*.json"):
    if ".git" not in path.parts:
        json.loads(path.read_text())
print("Required documents and JSON are valid; no product runtime test is claimed.")
