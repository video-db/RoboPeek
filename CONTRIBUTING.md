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
| `pnpm build` | Builds the packages and the demo app |
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

1. Every merge to `main` that brings changelog notes updates the `changeset-release/main` branch. It collects every note since the last release, bumps the version numbers, and writes the changelogs.
2. Merges keep piling onto that branch, so a week of changes becomes one release.
3. When you want to release (for example, every Friday): open the latest **Release** run in the Actions tab and click the PR link in its summary, or open https://github.com/video-db/RoboPeek/compare/main...changeset-release/main. Create the PR if there isn't one, review it, and merge it.
4. That merge publishes the packages to npm, tags them, and creates a GitHub Release for each with its changelog notes.

Our GitHub organization doesn't let Actions open pull requests, which is why step 3 is done by hand.

Each package has its own version and is bumped only when it changes. `@videodb/robopeek-react` declares which reader versions it works with as peer ranges (for example `@videodb/robopeek-rlds >=0.2.0 <1.0.0`), based on the reader APIs it actually uses:

- **Raise the floor** when `/rlds` or `/mcap` starts using a newer reader API. Bump the minimum-version check in `src/rlds/reader.ts` or `src/mcap/reader.ts` too, so an older reader fails with a message that says which version is needed.
- **Tighten the range when a reader breaks an API React uses.** Until 1.0 a reader's minor release may be breaking, so the same pull request that ships it updates `/rlds` or `/mcap` and sets a new floor (or caps the range).
- **No cascade.** A reader release doesn't force a React release: Changesets only bumps a package that depends on a bumped peer when the new version falls outside the peer range (`onlyUpdatePeerDependentsWhenOutOfRange`).

Until 1.0, a minor release (0.2 → 0.3) may include breaking changes, including to the markup and CSS class names.

### One-time setup (maintainers)

- A `NODE_AUTH_TOKEN` secret (npm token with publish access to `@videodb`) in Settings → Secrets and variables → Actions.
