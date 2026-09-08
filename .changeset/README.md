# Changesets

This folder holds [changesets](https://github.com/changesets/changesets): one Markdown file per unreleased change.

Run `pnpm changeset` to add one, then commit it with your pull request. Merged changesets are collected into a "Version Packages" pull request that bumps the version and updates `CHANGELOG.md`. Merging that pull request publishes the release.
