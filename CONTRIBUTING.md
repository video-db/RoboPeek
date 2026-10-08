# Contributing

## Setup

```sh
pnpm install
pnpm exec playwright install chromium   # once, for the React tests
pnpm dev                                # demo app on the package sources, with hot reload
```

| Command | What it does |
|---|---|
| `pnpm typecheck` | TypeScript across the repo |
| `pnpm test` | Reader tests (Node) and React tests (headless Chromium) |
| `pnpm build` | Builds both packages and the demo app |
| `pnpm check:pkg` | Checks the built packages the way npm users will see them |

The reader's shard tests need a real file or URL: `RLDS_SHARD=/path/x.tfrecord RLDS_URL=https://… pnpm --filter @videodb/robopeek-rlds test`.

## Making a change

1. Branch off `main` and open a PR. CI runs typecheck, tests, build and the package checks.
2. If your change affects what users of `@videodb/robopeek-rlds` or `@videodb/robopeek-react` get, add a changelog note:

   ```sh
   pnpm changeset
   ```

   It asks which packages changed, how big the change is, and for one sentence describing it. Commit the file it creates in `.changeset/` with your code.

   | Pick | When | Example |
   |---|---|---|
   | `patch` | Bug fix, nothing changes for users' code | "Fixed auto-next freezing on equal-length episodes." |
   | `minor` | New feature, or (before 1.0) a breaking change | "Added `Player.ImagePicker`." |
   | `major` | Breaking change, after 1.0 | "Removed `ShardViewer`'s `fps` prop; use `defaultFps`." |

   Write the sentence for someone using the package: what changed for them, not how the code changed. While we're on 0.x, call out breaking changes in the sentence.

3. Changes that users don't see (docs, tests, the demo app, CI) don't need a note. CI fails a PR that changes a package without one. If the change really doesn't need a note, run `pnpm changeset --empty`.

## Releases

We release when we choose to, not on every merge. Merging to `main` never publishes anything.

1. Every merge to `main` that brings changelog notes updates one open PR titled **"Release: version packages"**. It collects every note since the last release, bumps the version numbers, and shows the changelog that will ship.
2. Merges keep piling into that same PR, so a week of changes becomes one release.
3. When you want to release (for example, every Friday), review that PR and merge it. CI then publishes both packages to npm, tags the release, and creates a GitHub Release with the same notes.

Both packages always share one version number: `@videodb/robopeek-react@0.3.0` goes with `@videodb/robopeek-rlds@0.3.0`.

Until 1.0, a minor release (0.2 → 0.3) may include breaking changes, including to the markup and CSS class names.

### One-time setup (maintainers)

- An `NODE_AUTH_TOKEN` secret (npm automation token) available to this repo under Settings → Secrets and variables → Actions.
- Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests" turned on, so CI can open the release PR.
- Publish access to the `@videodb` scope on npm for the account behind the token.
