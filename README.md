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

## Reference numbers

Every post gets numbers down its left margin so that a reader can point at one
specific place in it — "the claim on 12" — instead of quoting a sentence back
and hoping it is unambiguous. The numbers are produced by the site, not written
into posts, so there is nothing to maintain by hand and nothing to renumber
after an edit.

A number belongs to a *block*: a paragraph, heading, list item, code block,
quote, or table. It is deliberately not a rendered line. A rendered line moves
when the window is resized, so a line number would point at different text on a
phone than on a desktop, which is the opposite of what a reference is for.

Clicking a number sets the URL to `#L12`, so a reference can be copied from the
address bar. Following such a link scrolls to that block and highlights it.

### Caveats

- Numbering is positional. Inserting or deleting a block renumbers everything
  after it, so a reference identifies a place in a given version of a post, not
  a place forever. This matters more here than on most blogs, since posts are
  expected to keep changing — see [Living documents](#living-documents).
- The numbers are added in the browser, so they are absent when JavaScript is
  disabled. The post itself is unaffected: nothing about the text depends on
  them.
- Below 900px the numbers move into a strip of padding borrowed from the text
  column, which narrows the text slightly on phones.

### Turning them off

Add to a post's front matter:

```toml
linenumbers = false
```

### How it works

Three project files, with no changes to the theme submodule and no external
dependencies:

| File | Role |
| --- | --- |
| `assets/js/line_numbers.js` | Walks `<main>`, numbers each block, inserts the anchors |
| `assets/css/line_numbers.css` | Gutter placement, and the highlight for a linked block |
| `layouts/partials/header.html` | Sets the body class and loads the two assets on single pages only |

Two details in there are worth knowing before editing them.

The anchors are positioned against `<main>`, which is the only positioned
ancestor. Each one leaves `top` at `auto` so it keeps the static position of
its own block, while `left` resolves against `<main>`. That is what keeps
deeply nested list items aligned in the same gutter as ordinary paragraphs. It
also means `left` resolves against the *padding* box of `<main>`, so the narrow
screen rule offsets from the padding rather than compensating for it.

Nothing is injected inside a `<pre>` or a `<table>`; both are wrapped in a
`<div>` that holds the anchor instead. For `<pre>` this keeps the anchor text
out of anything copied with the theme's copy button.

## Living documents

Posts are expected to change as the underlying exploration develops. With `enableGitInfo` enabled, committed updates are reflected in each post's modified date by the theme.
