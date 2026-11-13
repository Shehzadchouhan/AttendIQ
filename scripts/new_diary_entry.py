#!/usr/bin/env python3
"""
AttendIQ - TR-103 Daily Diary Generator
Reads git commits for a given date, generates a structured diary draft in diary/days/YYYY-MM-DD.md,
and prompts the author to review before committing.

Usage:
    python scripts/new_diary_entry.py            # Uses today's date
    python scripts/new_diary_entry.py 2026-11-13 # Specific date
"""

import sys
import os
import subprocess
from datetime import datetime

REPO_OWNER = "Shehzadchouhan"
REPO_NAME = "AttendIQ"

def run_git(cmd):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, encoding="utf-8")
    return result.stdout.strip()

def get_commits_for_date(target_date):
    since = f"{target_date} 00:00:00"
    until = f"{target_date} 23:59:59"
    cmd = f'git log --since="{since}" --until="{until}" --pretty=format:"%h|%ad|%s" --date=iso'
    out = run_git(cmd)
    if not out:
        return []
    
    commits = []
    for line in out.splitlines():
        if "|" in line:
            parts = line.split("|", 2)
            commits.append({
                "hash": parts[0].strip(),
                "date": parts[1].strip(),
                "subject": parts[2].strip()
            })
    return commits

def get_changed_files_for_commit(commit_hash):
    cmd = f"git show --pretty=\"\" --name-only {commit_hash}"
    out = run_git(cmd)
    return [f.strip() for f in out.splitlines() if f.strip()]

def format_date_human(date_str):
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    day = dt.day
    month = dt.strftime("%B")
    year = dt.year
    return f"{day} {month} {year}"

def main():
    target_date = sys.argv[1] if len(sys.argv) > 1 else datetime.now().strftime("%Y-%m-%d")
    human_date = format_date_human(target_date)
    
    print(f"[*] Scanning Git commits for date: {target_date} ({human_date})...")
    commits = get_commits_for_date(target_date)
    
    diary_dir = os.path.join(os.path.dirname(__file__), "..", "diary", "days")
    os.makedirs(diary_dir, exist_ok=True)
    out_file = os.path.join(diary_dir, f"{target_date}.md")
    
    if os.path.exists(out_file):
        print(f"[!] Warning: Diary file '{out_file}' already exists.")
        choice = input("Overwrite? [y/N]: ").strip().lower()
        if choice != "y":
            print("Aborted.")
            return

    if not commits:
        print(f"[!] No Git commits found for {target_date}.")
        content = f"""# {human_date}

**Date**: {human_date}  
**Phase Focus**: Maintenance / Documentation  

---

## Tasks Done

No code commits recorded for this date. (Reviewing documentation, codebase architecture, or environment setup).

---

## Technologies Used

* Git, Markdown

---

## Problems Faced & Design Decisions

<!-- REVIEW: Sheh to confirm he can explain this -->
* No blocking technical issues recorded for today.

---

## Learnings

* Continued familiarity with project architecture and verification workflows.

---

## Evidence

* No commit activity recorded in git history for {target_date}.

---

[← Back to Home](../index.md)
"""
    else:
        print(f"[✓] Found {len(commits)} commit(s). Generating entry draft...")
        
        tasks_bullets = []
        evidence_bullets = []
        all_files = set()
        
        for c in commits:
            h = c["hash"]
            subj = c["subject"]
            tasks_bullets.append(f"* {subj} (Commit `{h}`)")
            evidence_bullets.append(f"* **Commit**: [`{h}`](https://github.com/{REPO_OWNER}/{REPO_NAME}/commit/{h}) — `{subj}`")
            for f in get_changed_files_for_commit(h):
                all_files.add(f)
        
        tasks_text = "\n".join(tasks_bullets)
        evidence_text = "\n".join(evidence_bullets)
        key_files = "\n".join([f"  * `{f}`" for f in sorted(list(all_files))[:8]])
        
        content = f"""# {human_date}

**Date**: {human_date}  
**Phase Focus**: Phase Development / Maintenance  

---

## Tasks Done

I worked on the AttendIQ project and made the following verified contributions:
{tasks_text}

---

## Technologies Used

* Python, FastAPI, React 18, Vite, PostgreSQL, Git

---

## Problems Faced & Design Decisions

<!-- REVIEW: Sheh to confirm he can explain this -->

1. **[Design Decision / Fix Name]**: [Describe problem visible in commit diff and how you solved it in 2-3 lines].

---

## Learnings

* [Key technical learning from today's code changes].

---

## Evidence

{evidence_text}
* **Key Files Modified**:
{key_files}

---

[← Back to Home](../index.md)
"""

    with open(out_file, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"\n[✓] Draft created successfully at: {out_file}")
    print(f"[*] Opening file in editor for review...")
    
    # Attempt to open file in default system editor
    try:
        if sys.platform.startswith("win"):
            os.system(f'notepad "{out_file}"')
        elif sys.platform.startswith("darwin"):
            subprocess.run(["open", out_file])
        else:
            subprocess.run(["xdg-open", out_file])
    except Exception as e:
        print(f"[!] Could not open editor automatically: {e}")
        print(f"    Please manually edit '{out_file}' before committing.")

if __name__ == "__main__":
    main()
