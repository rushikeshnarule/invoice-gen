import subprocess
import json
import base64
import urllib.request
import os

token_proc = subprocess.run(["gh", "auth", "token"], capture_output=True, text=True, check=True)
token = token_proc.stdout.strip()
repo = "rushikeshnarule/invoice-gen"

def update_file(repo_path, local_path, message):
    url = f"https://api.github.com/repos/{repo}/contents/{repo_path}"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Antigravity"
    }
    
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            current = json.loads(resp.read().decode())
            sha = current["sha"]
    except urllib.error.HTTPError as e:
        if e.code == 404:
            sha = None
        else:
            raise
            
    with open(local_path, "rb") as f:
        content_b64 = base64.b64encode(f.read()).decode("utf-8")
        
    payload = {
        "message": message,
        "content": content_b64,
        "branch": "main"
    }
    if sha:
        payload["sha"] = sha
        
    data = json.dumps(payload).encode("utf-8")
    put_req = urllib.request.Request(url, data=data, method="PUT", headers=headers)
    with urllib.request.urlopen(put_req) as resp:
        res = json.loads(resp.read().decode())
        commit_sha = res["commit"]["sha"][:7]
        print(f"Updated {repo_path}: commit {commit_sha}")

if __name__ == "__main__":
    files = [
        ("index.html", "index.html", "feat(mobile): add viewport-fit and user-scalable meta tags"),
        ("src/index.css", "src/index.css", "feat(mobile): add safe area and touch optimizations"),
        ("src/App.tsx", "src/App.tsx", "feat(mobile): add native mobile bottom navigation bar and adaptive layout"),
        ("src/components/InvoiceEditor/InvoiceEditor.tsx", "src/components/InvoiceEditor/InvoiceEditor.tsx", "feat(mobile): add mobile toggle between edit form and live preview"),
        ("src/routes/InvoicesView.tsx", "src/routes/InvoicesView.tsx", "feat(mobile): make invoice cards and toolbar fully responsive"),
        ("src/routes/ClientsView.tsx", "src/routes/ClientsView.tsx", "feat(mobile): make clients view responsive"),
        ("CHANGELOG.md", "CHANGELOG.md", "docs: add comprehensive v1.4.0 changelog"),
        ("package.json", "package.json", "feat: update scripts and dependencies for v1.4.0"),
        ("package-lock.json", "package-lock.json", "chore: sync package-lock"),
        ("capacitor.config.json", "capacitor.config.json", "feat: configure capacitor Android"),
        (".github/workflows/build-android.yml", ".github/workflows/build-android.yml", "ci: update android build workflow with Java 21"),
        (".github/workflows/build-mac.yml", ".github/workflows/build-mac.yml", "ci: update macOS pkg installer workflow")
    ]
    for rp, lp, msg in files:
        if os.path.exists(lp):
            update_file(rp, lp, msg)
    print("All project updates pushed to GitHub successfully!")
