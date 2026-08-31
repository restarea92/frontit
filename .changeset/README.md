# Changesets

A changeset is a note describing one change and how it moves the version. Add one
alongside the work:

```
pnpm changeset
```

Pick the packages, pick major / minor / patch, and write what changed — that text lands in
the changelog verbatim, so write it for someone reading the release, not for the diff.

At release time:

```
pnpm release:version
```

which applies every pending changeset: bumps versions, writes the changelogs and updates
the workspace dependency. Commit that, tag it, and publish the GitHub release — the
workflow stages to npm from there.

`frontit` and `@frontit/core` are `fixed`, so they share a version and go out together.
