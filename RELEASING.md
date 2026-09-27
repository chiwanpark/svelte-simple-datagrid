# Releasing

The package is published as the scoped public package `@chiwanpark/svelte-simple-datagrid` from the `chiwanpark/svelte-simple-datagrid` repository.

Versioning is managed with [Changesets](https://github.com/changesets/changesets) and releases are staged from GitHub Actions with npm [trusted publishing](https://docs.npmjs.com/trusted-publishers/) and [staged publishing](https://docs.npmjs.com/cli/commands/npm-stage), so no npm token is stored in the repository and every release needs a 2FA approval from a maintainer.

## Day-to-day flow

1. Open a pull request with your change.
2. Run `pnpm changeset`, pick the bump type, write a one-line summary, and commit the generated file in `.changeset/`.
3. Merge the pull request into `main`. `Release` workflow collects every pending changeset into a `chore(release): version packages` pull request that bumps `package.json`, updates `CHANGELOG.md` and deletes the consumed changeset files.
4. Merge that version pull request when you want to ship. The same workflow then stages the version on npm with `npm stage publish` and creates a draft GitHub release from the changelog section. The run summary shows the approval command.
5. Approve the staged version with `npm stage approve <stage-id>`, which asks for 2FA. `npm stage list` also shows the pending stage ids.
6. Run `gh workflow run release.yml`, or wait for the next push to `main`. The workflow sees the version on npm and publishes the draft release, which creates the `vX.Y.Z` tag.

To drop a staged version instead, run `npm stage reject <stage-id>` and `gh release delete vX.Y.Z`, since the workflow treats an existing draft release as a version waiting for approval.

Changes that need no release (docs, CI, tests) simply ship without a changeset file.

## Bump policy

While the package is on `0.x`:

- `patch` for bug fixes and internal changes.
- `minor` for new features **and** breaking changes, because `0.x` minors are allowed to break.
- Avoid `major` until the public API of `.` and `./xlsx` is considered stable; the first `major` should be the deliberate `1.0.0` release.

After `1.0.0`, follow plain semver: `patch` for fixes, `minor` for backwards-compatible features, `major` for breaking changes to props, exported types, CSS custom properties or the export map.

## One-time setup on npmjs.com

1. Publish `0.0.1` once manually (`npm publish`), since a trusted publisher can only be attached to a package that already exists. Scoped packages default to restricted access, which is why `publishConfig.access` is set to `public` in `package.json`.
2. Open the package page, then `Settings` → `Trusted publisher`, choose GitHub Actions and fill in:
   - Organization or user: `chiwanpark`
   - Repository: `svelte-simple-datagrid`
   - Workflow filename: `release.yml`
   - Environment: leave empty, unless you add a protected `npm` environment to the `publish` job.
   - Permissions: allow only staged publishing (`npm stage publish`), since the workflow never runs `npm publish`.

   The CLI equivalent is `npm trust github --file release.yml --repo chiwanpark/svelte-simple-datagrid --allow-stage-publish`. Only one configuration is allowed per package, so remove an existing one first with `npm trust list` and `npm trust revoke --id <id>`.
3. Remove any classic automation token afterwards, and keep two-factor authentication set to "authorization only" so CI publishes are not blocked.

## Repository settings

- Protect `main`, require the `CI` checks (`Lint and type check`, `Test on Node 22`, `Test on Node 24`, `Verify package contents`), and allow GitHub Actions to create and approve pull requests (`Settings` → `Actions` → `General`) so the version pull request can be opened.
- The `publish` job needs `id-token: write`; it is already declared per job in `.github/workflows/release.yml`. Trusted publishing attaches a provenance attestation automatically, so `--provenance` is not passed anywhere.

## Manual fallback

If Actions is unavailable:

```sh
pnpm install --frozen-lockfile
pnpm release:version   # bumps version and changelog
git commit -am "chore(release): version packages"
npm publish            # asks for an OTP, publishes without provenance
pnpm release:tag       # changeset git-tag
git push --follow-tags
```

## Pre-release channel

For an alpha or beta line:

```sh
pnpm exec changeset pre enter beta
pnpm release:version   # 0.2.0-beta.0
pnpm exec changeset pre exit
```

Commit the `.changeset/pre.json` file so the workflow keeps versioning inside the pre-release range, and remove it when leaving the channel.

## Tooling versions

`.github/workflows/release.yml` uses `changesets/action@v2`, which is the line compatible with `@changesets/cli` v3. Keep them in step when upgrading; `changesets/action@v1` targets Changesets v2 and will fail against this repository.
