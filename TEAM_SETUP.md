# Team git setup — read me first (5 minutes)

Repo: **github.com/Iroh02/mizan** · You need: a GitHub account + the collaborator invite accepted + Git installed (git-scm.com).

## One-time setup (each person)

```bash
git clone https://github.com/Iroh02/mizan.git
cd mizan
git checkout -b jillian        # Anushree: git checkout -b anushree
git push -u origin jillian     # publishes YOUR branch (first browser sign-in may pop up)
```

That's it — you now have your own branch. Nobody works directly on `main`.

## Daily rhythm

```bash
git pull origin main           # start of day: get everyone's merged work
# ...do your work...
git add -A
git commit -m "short description of what you did"
git push                       # end of every work session — unpushed work doesn't exist
```

## Rules (apply to everyone)

1. **`main` is sacred** — it must always be demo-ready. Nothing gets merged into main until it has been tested against the running app.
2. When your work is ready: push your branch, then open a Pull Request on GitHub (your branch → main) or post "ready to merge" in the group chat. One designated person reviews and merges.
3. **Never commit secrets.** API keys live in the Render dashboard / your terminal environment only — never in any file. If something seems to need a key inside a file, stop and raise it in the group before doing anything.
4. **Stay in your area.** Each person edits only the folders their role covers. If your task seems to require touching someone else's area, coordinate in the group chat first instead of editing it directly — most conflicts start exactly there.
5. Commit small and often — five small commits beat one giant one; they're easier to review and easier to undo.
6. Push at the end of every work session. Work that isn't pushed doesn't exist for the rest of the team.

## If git yells at you

- `rejected ... fetch first` → someone pushed before you: run `git pull`, resolve if asked, push again.
- Merge-conflict markers (`<<<<<<<`) appear in a file → keep the correct lines, delete the marker lines, then `git add` + commit. Unsure which lines are correct? Screenshot it to the group chat before guessing — conflicts are a 2-minute fix done calmly and an evening lost done wrong.
- Anything else: paste the exact error into your Claude chat — reading git errors is what it's for.

## Merging a branch into main (whoever does the merge)

```bash
git checkout main
git pull
git merge <branch-name>
# run the app / tests to confirm nothing broke, then:
git push
```
