# Contributing to PTET Web

Thanks for helping improve PTET Web! This guide takes you from zero to a merged pull request.

## Getting started

1. **Fork** the repository and clone your fork:
```bash
   git clone https://github.com/<your-username>/ptet-web.git
   cd ptet-web
```
2. **Install the commit hooks** (requires [Node.js](https://nodejs.org)):
```bash
   npm install
```
   This sets up Husky and commitlint, which reject badly formatted commit messages locally.
3. **Run the site** by opening `index.html` in a modern browser. No build step is needed.

## Project layout

| Path | What it holds |
| --- | --- |
| `index.html` | Landing page |
| `pages/` | All other website pages |
| `components/` | Reusable pieces such as the navbar, footer and pop-up windows |
| `scripts/js/` | JavaScript for pop-ups, Firebase auth and similar features |
| `styles/css/` | Stylesheets |
| `assets/images/` | Images and other visual assets |

## Workflow

1. Browse the open issues and pick one.
2. Comment `/assign` on the issue. The Hydra Maintainer bot assigns it to you.
   You can hold up to **3 open issues** at a time, so finish one before taking another.
3. Create a branch: `git checkout -b fix/short-description`.
4. Commit using [Conventional Commits](https://www.conventionalcommits.org/):
   `<type>(<scope>): <description>`, with a lowercase description and no trailing period.
   Example: `fix(nav): resolve mobile menu overflow`.
5. Push your branch and open a pull request against `main`.

## Pull request checklist

Write a clear description in the pull request box, replacing any pre-filled text that does
not apply to your change.

The bot scores every pull request and adds a `health:` label. A score of 60 or more earns
`health: 💚 healthy`. To score well:

- **Describe the change** in at least 50 characters: what it does and why.
- **Link the issue** with `Closes #123` (or `Fixes` / `Resolves`).
- **Keep it small.** Diffs under 400 changed lines score best; split larger work.
- **Get an approval.** Reviews raise your score.
- **Add tests** where the change has logic that can be tested (optional for pure content changes).

## Bot commands

Comment these on any issue or pull request:

| Command | What it does |
| --- | --- |
| `/assign` | Assign the issue to yourself (limit: 3 open issues) |
| `/unassign` | Remove yourself from the issue |
| `/check-eligibility` | Show your contribution stats and role progress |
| `/label <name>` | Add a label (people with write access only) |
| `/help` | Show the command list |

## Need help?

Open an issue or ask in the pull request. No question is too basic.