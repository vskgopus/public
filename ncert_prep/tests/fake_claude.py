"""Stand-in for the `claude` CLI used by test_end_to_end.py."""
import json
import os
import sys
from pathlib import Path

argv = sys.argv[1:]
with open(os.environ["FAKE_CLAUDE_LOG"], "a") as log:
    log.write(json.dumps({"argv": argv, "had_api_key": "ANTHROPIC_API_KEY" in os.environ}) + "\n")

if argv[:1] == ["--version"]:
    print("9.9.9 (Claude Code)")
elif argv[:2] == ["auth", "status"]:
    print(json.dumps({"loggedIn": True, "authMethod": "claude.ai"}))
elif "-p" in argv:
    assert Path("chapter.pdf").read_bytes().startswith(b"%PDF"), "PDF missing in working folder"
    sample = json.loads((Path(__file__).parent.parent / "samples" / "class10_science_ch1.json").read_text())
    print(json.dumps({"type": "result", "subtype": "success", "is_error": False,
                      "result": json.dumps(sample), "structured_output": sample}))
else:
    sys.exit(2)
