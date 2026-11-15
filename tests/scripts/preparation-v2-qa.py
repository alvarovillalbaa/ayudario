"""Owned remote-only preparation qualification. No local environment bootstrap."""
from pathlib import Path
import hashlib
import json
import os
import secrets
import shutil
import signal
import subprocess
import time
import urllib.request

repo = Path.cwd().resolve()
runner = Path(os.environ["RUNNER_TEMP"]).resolve()
job_id = os.environ["GITHUB_RUN_ID"] + "-" + os.environ["GITHUB_RUN_ATTEMPT"]
owned = runner / ("ayudario-preparation-" + job_id)
proof = Path(os.environ["AYUDARIO_PROOF_DIR"]).resolve()
assert proof.parent == runner and proof.name == "ayudario-preparation-proof-" + job_id
assert not owned.exists() and not proof.exists(), "Preserve an existing runner context"
owned.mkdir()
proof.mkdir()
nonce = secrets.token_hex(16)
owner = {"job": job_id, "nonce": nonce, "pid": os.getpid()}
for directory in (owned, proof):
    (directory / "owner.json").write_text(json.dumps(owner) + "\n")
inode = owned.stat().st_ino
env = dict(os.environ)
env["AYUDARIO_PLAYWRIGHT_DIR"] = str(owned / "tools")
env["PLAYWRIGHT_BROWSERS_PATH"] = str(owned / "browsers")
env["npm_config_cache"] = str(owned / "npm-cache")
deadline = time.monotonic() + 17 * 60
receipt = {"source": os.environ["GITHUB_SHA"], "commands": [], "passed": False}
server = None
server_logs = []
ordinal = 0


def record():
    (proof / "runner.json").write_text(json.dumps(receipt, indent=2) + "\n")


def stop_group(child):
    forced = False
    if child.poll() is None:
        os.killpg(child.pid, signal.SIGTERM)
        try:
            child.wait(timeout=8)
        except subprocess.TimeoutExpired:
            forced = True
            os.killpg(child.pid, signal.SIGKILL)
            child.wait(timeout=5)
    return forced


def run(argv, label, seconds=120, required=True):
    global ordinal
    ordinal += 1
    stdout = proof / (str(ordinal).zfill(2) + "-" + label + ".stdout.txt")
    stderr = proof / (str(ordinal).zfill(2) + "-" + label + ".stderr.txt")
    entry = {"argv": argv, "label": label, "stdout": stdout.name, "stderr": stderr.name}
    receipt["commands"].append(entry)
    started = time.monotonic()
    child = None
    failure = None
    with stdout.open("xb") as out, stderr.open("xb") as err:
        child = subprocess.Popen(argv, cwd=repo, env=env, stdout=out, stderr=err, start_new_session=True)
        end = started + min(seconds, 45) if label in ("source-after", "git-status") else min(deadline, started + seconds)
        while child.poll() is None:
            if time.monotonic() > end or stdout.stat().st_size + stderr.stat().st_size > 8 * 1024 * 1024:
                failure = "deadline/output budget"
                entry["forced"] = stop_group(child)
                break
            time.sleep(0.15)
        entry["exit"] = child.wait()
        try:
            os.killpg(child.pid, 0)
            entry["orphaned_group"] = True
            os.killpg(child.pid, signal.SIGTERM)
            time.sleep(0.3)
            try:
                os.killpg(child.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            failure = failure or "owned child group outlived command"
        except ProcessLookupError:
            entry["orphaned_group"] = False
    entry["elapsed_seconds"] = round(time.monotonic() - started, 3)
    entry["stdout_sha256"] = hashlib.sha256(stdout.read_bytes()).hexdigest()
    entry["stderr_sha256"] = hashlib.sha256(stderr.read_bytes()).hexdigest()
    entry["streams_complete"] = failure is None
    entry["failure"] = failure
    record()
    if required and (entry["exit"] or failure):
        raise RuntimeError(label + " failed; preserve its original streams")
    return stdout.read_text(errors="replace")


def owned_browser_pids():
    found = []
    for entry in Path("/proc").iterdir():
        if not entry.name.isdigit():
            continue
        try:
            if entry.stat().st_uid != os.getuid():
                continue
            executable = (entry / "exe").resolve()
            if executable.is_relative_to(owned):
                found.append(int(entry.name))
        except (OSError, RuntimeError):
            pass
    return found


try:
    node = run(["node", "--version"], "node-version").strip()
    assert node.startswith("v24."), node
    receipt["node"] = node
    run(["node", "scripts/fingerprint.mjs", str(proof / "source-before.json")], "source-before")
    run(["node", "scripts/check.mjs"], "static-source")
    run(["git", "diff", "--check"], "diff-check")
    run(["npm", "install", "--prefix", env["AYUDARIO_PLAYWRIGHT_DIR"], "--registry=https://registry.npmjs.org", "--ignore-scripts", "--omit=optional", "--no-audit", "--no-fund", "playwright@1.65.0"], "browser-tools", seconds=180)
    lock_path = owned / "tools/package-lock.json"
    lock = json.loads(lock_path.read_text())
    expected = {
        "playwright": "sha512-F3AMWcR44qMBt4kq+6Kb6mX7bjGXshktKFOPULd7reED6ZJWevjbNRqysP7q+AATE9kdPEZBibex1BYsvpVoeA==",
        "playwright-core": "sha512-vNSKgH6YqtN7cdT/L334zo0a+YwkrpicyrHJlWWPIm/Q+Nn2SWInil01oT0mbu96U4GgoRtCYQD9CzJQgju+lA==",
    }
    for package, integrity in expected.items():
        actual = lock["packages"]["node_modules/" + package]
        assert actual["version"] == "1.65.0" and actual["integrity"] == integrity, package
    shutil.copyfile(lock_path, proof / "browser-package-lock.json")
    run([str(owned / "tools/node_modules/.bin/playwright"), "install", "chromium"], "chromium", seconds=360)
    for name in ("server.stdout.txt", "server.stderr.txt"):
        server_logs.append((proof / name).open("xb"))
    server = subprocess.Popen(["node", "scripts/serve.mjs"], cwd=repo, env=env, stdout=server_logs[0], stderr=server_logs[1], start_new_session=True)
    receipt["server_pid"] = server.pid
    ready = False
    for attempt in range(100):
        assert server.poll() is None, "Owned server exited"
        try:
            with urllib.request.urlopen("http://127.0.0.1:4173/", timeout=1) as response:
                ready = response.status == 200
        except OSError:
            pass
        if ready:
            break
        time.sleep(0.1)
    assert ready, "Owned server did not become ready"
    run(["node", "tests/e2e/preparation-v2.mjs"], "preparation-browser", seconds=420)
    browser = json.loads((proof / "preparation-browser.json").read_text())
    assert browser["passed"] and len(browser["cases"]) == 7
    assert browser["cleanup"]["nativeAbsent"] and browser["cleanup"]["contextsClosed"]
    receipt["passed"] = True
except Exception as error:
    receipt["error"] = type(error).__name__ + ": " + str(error)
finally:
    if server is not None:
        receipt["server_forced"] = stop_group(server)
        receipt["server_exit"] = server.returncode
        try:
            os.killpg(server.pid, 0)
            receipt["server_group_absent"] = False
        except ProcessLookupError:
            receipt["server_group_absent"] = True
    for stream in server_logs:
        stream.close()
    try:
        run(["node", "scripts/fingerprint.mjs", str(proof / "source-after.json")], "source-after", required=False)
        receipt["source_stable"] = (proof / "source-before.json").read_bytes() == (proof / "source-after.json").read_bytes()
        receipt["git_clean"] = not run(["git", "status", "--porcelain"], "git-status", required=False).strip()
    except Exception as error:
        receipt["guard_error"] = str(error)
    lingering = owned_browser_pids()
    receipt["lingering_owned_pids"] = lingering
    for pid in lingering:
        try:
            os.kill(pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
    if lingering:
        time.sleep(1)
        for pid in owned_browser_pids():
            try:
                os.kill(pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
        time.sleep(0.2)
    receipt["owned_processes_absent"] = not owned_browser_pids()
    if owned.stat().st_ino == inode and json.loads((owned / "owner.json").read_text()) == owner and receipt["owned_processes_absent"]:
        shutil.rmtree(owned)
    receipt["owned_tools_removed"] = not owned.exists()
    receipt["passed"] = bool(receipt["passed"] and receipt.get("source_stable") and receipt.get("git_clean") and receipt.get("server_group_absent") and receipt.get("server_exit") == 0 and not receipt.get("server_forced") and not lingering and receipt["owned_processes_absent"] and receipt["owned_tools_removed"])
    record()
    print(json.dumps({key: value for key, value in receipt.items() if key != "commands"}))
raise SystemExit(0 if receipt["passed"] else 1)
