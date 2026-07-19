+++
date = '2026-07-12T21:15:00-07:00'
draft = false
title = 'Escaping Binary Blob Bloat in Git'
description = 'How to stop binary files from inflating a repository, reduce clone costs immediately, and decide whether to rewrite history.'
tags = ['git', 'repositories', 'devops', 'binary-files']
categories = ['tools']
toc = true
+++

Git is excellent at storing source code, but repeated versions of large binary files are a bad fit. Many binary formats—especially compressed ones—do not delta-compress well, so each update may add another large blob. Deleting the file in a later commit does not delete its earlier versions.

The right recovery path depends on hosting support, workflow needs, and the team's tolerance for rewriting history.

## Measure before changing anything

Separate the repository into two costs:

- **Working tree:** files present at the current commit
- **Git database:** objects under `.git`, including every reachable historical version

Start with:

```bash
du -sh .      # Entire checkout, including .git
du -sh .git   # Git database
git count-objects -vH
```

Find the largest blobs across history with `git filter-repo`:

```bash
git filter-repo --analyze
```

The generated reports identify large paths, blob sizes, and accumulated history. This matters because ordinary `git gc` only repacks reachable objects; it cannot remove large blobs that commits still reference.

## Staging can grow `.git` even without a commit

`git add` writes file contents to the Git object database immediately; it does not wait for a commit. Staging a large generated binary, such as a SQLite database, can therefore create a large object—or a pack containing it—under `.git/objects`.

If the file is later unstaged or reset, or if the operation is interrupted, the new object may become unreachable while remaining on disk. Repeatedly staging a changing database can accumulate multiple nearly full-sized objects because these binary changes often delta-compress poorly.

Prevent this local bloat by ignoring generated binary data before staging it:

```gitignore
/data/raw/*.db*
```

Avoid broad commands such as `git add .` when large generated files are present; stage specific paths instead. To remove accumulated unreachable objects, first ensure no other Git process is operating on the repository and that no dangling objects contain work you need, then run:

```bash
git gc --prune=now
```

If an interrupted operation leaves `tmp_pack_*` files, ensure no Git process is running before removing them:

```bash
rm -f .git/objects/pack/tmp_pack_*
```

Garbage collection can remove only unreachable objects. Blobs referenced by commits require a history rewrite or another strategy described below. For large binaries that genuinely require versioning, use Git LFS or external artifact storage rather than regular Git objects.

## First, stop the growth

Move future binary assets to storage designed for them:

- Git LFS, when the hosting service supports it
- Artifact or package repositories
- Object storage
- Release assets, for versioned deliverables

Keep only the necessary metadata—and, when useful, a retrieval script—in Git. Ignore downloaded assets and enforce a maximum blob size in CI or a pre-receive hook.

This prevents new growth, but it does **not** shrink existing history. Even migrating the current file leaves its old Git blobs reachable.

## Reduce clone cost without rewriting history

When rewriting shared history is too disruptive, change how developers and CI clone the repository.

A shallow clone downloads only recent commits:

```bash
git clone --depth=1 <repository-url>
```

This works well for CI jobs that need only the current revision, but limits history-dependent operations such as blame, rebasing, and merge-base comparisons.

A blobless partial clone keeps commit and tree history while fetching file contents **on demand**:

```bash
git clone --filter=blob:none <repository-url>
```

Commands that need file contents—such as `checkout`, `show`, `diff`, `blame`, `grep`, or `archive`—fetch and cache missing blobs. Metadata-only commands such as `git log` without patches and `git ls-tree` generally do not.

Because `git clone` checks out the current commit by default, this command still downloads every current file. The filter primarily avoids historical versions. If large assets are needed only by some workflows, use `--no-checkout` and combine the partial clone with sparse checkout:

```bash
git clone --filter=blob:none --no-checkout <repository-url>
cd <repository-directory>
git sparse-checkout init --no-cone
git sparse-checkout set '/*' '!/path/to/large-assets/'
git checkout
```

`--no-cone` enables the Gitignore-style exclusion pattern used above.

Partial clone requires server support. Sparse checkout saves the most when ordinary development does not need the large files. These approaches reduce new clone size and local disk usage; they do not reduce storage on the remote. A fresh clone is usually simpler than trying to slim an existing one.

## Rewrite history when the repository must actually shrink

To reduce the remote repository and full-clone size, remove or migrate the old blobs from every affected commit. A history rewrite changes commit IDs, so treat it as a coordinated migration:

1. Back up the repository and verify the external artifact archive.
2. Freeze merges and pushes.
3. Rewrite all required branches and tags in a disposable mirror clone.
4. Validate builds, tags, and the resulting object size.
5. Force-push the rewritten refs.
6. Ask the hosting administrator to expire unreachable objects if necessary.
7. Have contributors re-clone rather than merge old history back in.

For example, after archiving the files elsewhere, run this in the disposable mirror:

```bash
git filter-repo --path path/to/large-assets --invert-paths
```

List every historical path if the assets were renamed or moved. If Git LFS is available, `git lfs migrate import --include='<patterns>' --everything` can instead rewrite matching files in all refs as LFS pointers.

Open pull requests, commit links, signatures, forks, and automation pinned to commit IDs may need repair. Old refs or forks can also keep blobs alive on the server. For a heavily shared repository, preserving history and accepting mitigated clone costs may be safer than rewriting it.

## Choose the least disruptive path

| Goal | Best first step |
|---|---|
| Stop future growth | Externalize binaries and enforce size limits |
| Make CI clones faster | Shallow clone |
| Keep history but defer old blobs | Blobless partial clone |
| Avoid current large assets too | Partial clone plus sparse checkout |
| Shrink the remote and every full clone | Coordinated history rewrite |
