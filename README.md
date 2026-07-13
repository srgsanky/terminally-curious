# Terminally Curious

A Hugo blog for living notes on technical explorations.

<https://srgsanky.github.io/terminally-curious/>

## Prerequisites

- [Hugo Extended](https://gohugo.io/installation/) 0.164.0 or newer
- Git

Clone the theme after checking out the repository:

```bash
git submodule update --init --recursive
```

## Write

Create a post:

```bash
hugo new content posts/my-post.md
```

Hugo creates posts as drafts. Edit the generated file and set `draft = false` when it is ready to publish. Tags and categories in the front matter make evolving topics easier to browse.

For a post with colocated images and other resources, create a page bundle instead:

```bash
hugo new content posts/my-post/index.md
```

## Preview locally

Include drafts while writing:

```bash
hugo server --buildDrafts
```

Hugo excludes future-dated posts even when drafts are enabled. To preview drafts and future content, add `--buildFuture` (or `-F`):

```bash
hugo server --buildDrafts --buildFuture
```

The local URL is normally <http://localhost:1313/terminally-curious/>.

Before publishing, verify the production build:

```bash
hugo --gc --minify
```

## Publish

Push to `main`. The workflow in `.github/workflows/hugo.yaml` builds the site and deploys it with GitHub Pages.

For the repository's first deployment:

1. Open the repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.

Check the repository's **Actions** tab for deployment progress. After the first deployment, pushes to `main` publish automatically with no further manual steps. The published site uses the repository URL shown above.

## Living documents

Posts are expected to change as the underlying exploration develops. With `enableGitInfo` enabled, committed updates are reflected in each post's modified date by the theme.
