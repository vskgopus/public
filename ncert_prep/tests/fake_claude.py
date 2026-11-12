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
    if os.environ.get("FAKE_CLAUDE_SLEEP"):        # a slow run, to test Stop
        import time
        time.sleep(float(os.environ["FAKE_CLAUDE_SLEEP"]))
    assert Path("chapter.pdf").read_bytes().startswith(b"%PDF"), "PDF missing in working folder"
    here = Path(__file__).parent
    sample = json.loads((here.parent / "samples" / "class10_science_ch1.json").read_text())
    sample.update(json.loads((here / "sample_extras.json").read_text()))
    schema = json.loads(argv[argv.index("--json-schema") + 1])
    sample = {k: v for k, v in sample.items() if k in schema["required"]}   # only what was asked for
    print(json.dumps({"type": "result", "subtype": "success", "is_error": False,
                      "result": json.dumps(sample), "structured_output": sample}))
else:
    sys.exit(2)
