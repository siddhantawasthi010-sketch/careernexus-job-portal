# Branching Strategy

## Branch model

Use a simple GitFlow-inspired branching model:

- `main` → stable production code
- `develop` → active integration branch
- `feature/*` → feature branches such as `feature/auth`, `feature/jobs`, `feature/recruiter-dashboard`

## Workflow

### 1. Start from develop

```bash
git checkout develop
git pull origin develop
```

### 2. Create a feature branch

```bash
git checkout -b feature/auth
```

### 3. Commit and push

```bash
git add .
git commit -m "Add authentication module"
git push -u origin feature/auth
```

### 4. Open a pull request

Open a PR from the feature branch into `develop`.

### 5. Merge after review

Once reviewers approve and tests pass:

```bash
git checkout develop
git pull origin develop
git merge feature/auth
git push origin develop
```

### 6. Release to production

When `develop` is stable:

```bash
git checkout main
git pull origin main
git merge develop
git push origin main
```

---

## Branch protection rules

Protect `main` with:
- pull request required
- at least one reviewer approval
- no direct pushes to `main`
- status checks enforced before merge

This keeps production stable and reviewable.
