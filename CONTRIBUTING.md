# Contributing to RedisHub

Thanks for wanting to help. One thing about this repository is unusual — read it first, it will
save you work.

## This repository is a mirror

Development happens in a private upstream repository. What you see on GitHub is a **read-only
mirror**, force-updated on every push upstream. Three consequences:

- **Your pull request will not be merged with the green button.** A maintainer lands your commits
  upstream and the mirror carries them back here — at which point GitHub marks your PR as merged,
  with you as the author. Usually within minutes of approval.
- **Do not push a branch to this repository**, even if you have write access: the next sync deletes
  it. Work on a fork.
- Everything else behaves normally. Open the PR, CI runs on it, and review happens right here in
  the PR — not somewhere you cannot see.

## How a change gets in

1. Fork, branch off `main`, commit.
2. Run `make lint` and `make test` before opening the PR — the same checks run in CI.
3. Open the PR against `main` and say what problem it solves.
4. Review happens in the PR; push follow-up commits to your branch as usual.
5. On approval a maintainer lands it, and this PR closes as merged.

A typo fix or a small bug fix needs no issue first. For anything larger — a new feature, a new
dependency, a change to the IPC contract — open an issue and get agreement before you write the
code. Part of the roadmap is not public, so checking first is the difference between a merged PR
and a wasted evening.

## How to write the change

Coding standards, the proto-driven IPC workflow, the commit-message format, and the full
development setup live on the docs site, which is the single source for them:

- [Contribution Guide](https://redishub.tradalab.com/docs/development/contribution)
- [Getting Started](https://redishub.tradalab.com/docs/development/setup)
- [Adding IPC Commands](https://redishub.tradalab.com/docs/development/extending)

## Reporting bugs and asking questions

Open a [GitHub Issue](https://github.com/tradalab/redishub/issues) — that is the right place even
though the code lives elsewhere. Include your OS, the RedisHub version, and the steps to reproduce.
