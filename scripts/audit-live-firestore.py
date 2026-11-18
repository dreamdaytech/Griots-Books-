#!/usr/bin/env python3
"""Read-only audit of the *deployed* Griots Books named Firestore database rules.

Run this from Google Cloud Shell or another trusted machine with gcloud authenticated.
Never prints access tokens. Never deploys rules, changes database data, or updates releases.
"""
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request

PROJECT_ID = "subscription-tracker-92b0b"
DATABASE_ID = "ai-studio-32d4773e-44c8-46f5-91e1-eeb96a1daadf"

def fail(message: str) -> None:
    print(f"STOP — {message}", file=sys.stderr)
    sys.exit(2)

def auth_token() -> str:
    try:
        result = subprocess.run(
            ["gcloud", "auth", "print-access-token"],
            check=True, text=True, capture_output=True,
        )
    except (OSError, subprocess.CalledProcessError):
        fail("Google Cloud Shell authentication unavailable. Run gcloud auth login locally, or use Cloud Shell.")
    token = result.stdout.strip()
    if not token:
        fail("Google Cloud did not issue an access token.")
    return token

def api_get(url: str, token: str) -> dict:
    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        fail(f"API request failed with HTTP {exc.code}; verify permissions and project/database target.")
    except (urllib.error.URLError, json.JSONDecodeError, TimeoutError):
        fail("Could not retrieve trusted live Firebase metadata or rules.")
    return {}

def sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

def main() -> None:
    repo = Path(__file__).resolve().parent.parent
    config = json.loads((repo / "firebase-applet-config.json").read_text(encoding="utf-8"))
    if config.get("projectId") != PROJECT_ID or config.get("firestoreDatabaseId") != DATABASE_ID:
        fail("Repository configuration does not match the approved Firebase target.")

    print(f"Checking Firebase project: {PROJECT_ID}")
    print(f"Checking NAMED Firestore database: {DATABASE_ID}")
    token = auth_token()

    database_url = (
        f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/"
        f"{DATABASE_ID}"
    )
    metadata = api_get(database_url, token)
    expected_db_name = f"projects/{PROJECT_ID}/databases/{DATABASE_ID}"
    if metadata.get("name") != expected_db_name:
        fail(f"Database response did not match the approved database: {metadata.get('name')!r}.")
    print(f"Confirmed database: {metadata['name']}")
    print(f"Reported location: {metadata.get('locationId', 'not returned')}")

    release_name = f"projects/{PROJECT_ID}/releases/cloud.firestore/{DATABASE_ID}"
    release_url = "https://firebaserules.googleapis.com/v1/" + release_name
    release = api_get(release_url, token)
    if release.get("name") != release_name:
        fail("The release name returned by Firebase does not match the named database.")
    ruleset_name = release.get("rulesetName", "")
    if not ruleset_name.startswith(f"projects/{PROJECT_ID}/rulesets/"):
        fail("Firebase did not identify a valid ruleset belonging to the expected project.")

    ruleset = api_get("https://firebaserules.googleapis.com/v1/" + ruleset_name, token)
    files = ruleset.get("source", {}).get("files", [])
    if len(files) != 1 or not isinstance(files[0].get("content"), str):
        fail("Live ruleset has an unexpected source-file layout. Manual review required.")
    live_rules = files[0]["content"]

    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_dir = Path(tempfile.gettempdir()) / f"griots-firestore-rules-{stamp}"
    backup_dir.mkdir(mode=0o700, exist_ok=False)
    backup_file = backup_dir / "LIVE-DEPLOYED.rules"
    backup_file.write_text(live_rules, encoding="utf-8")
    os.chmod(backup_file, 0o600)

    # The expected baseline is read from the CURRENT main branch, not the draft PR.
    try:
        subprocess.run(["git", "fetch", "--quiet", "origin", "main"], cwd=repo, check=True, timeout=40)
        baseline = subprocess.run(
            ["git", "show", "origin/main:firestore.rules"],
            cwd=repo, check=True, text=True, capture_output=True, timeout=20,
        ).stdout
    except (OSError, subprocess.SubprocessError):
        fail(f"Backup saved to {backup_file}, but cannot read origin/main:firestore.rules for comparison.")

    print(f"Live ruleset: {ruleset_name}")
    print(f"Backup file (outside repository): {backup_file}")
    print(f"Live source SHA-256: {sha(live_rules)}")
    print(f"Current main rules SHA-256: {sha(baseline)}")

    if live_rules != baseline:
        print("REVIEW REQUIRED: Live rules are different from GitHub main. No deployment should occur.")
        print("Compare the local backup with origin/main:firestore.rules and reconcile production-only changes.")
        sys.exit(3)

    print("BASELINE MATCH: Live rules source matches GitHub main exactly.")
    print("This is read-only evidence. It does not verify user permissions, data safety, or authorize deployment.")

if __name__ == "__main__":
    main()
