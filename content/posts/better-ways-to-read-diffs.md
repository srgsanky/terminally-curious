+++
date = '2026-07-26T11:09:00-07:00'
draft = false
title = 'Better Ways to Read Diffs'
description = 'Practical tools for comparing two text files and making Git diffs easier to read.'
tags = ['diff', 'git', 'delta', 'neovim', 'cli']
categories = ['tools']
toc = true
+++

There are two common diffing tasks:

1. Compare two arbitrary text files, such as Markdown documents.
2. Inspect changes tracked by Git.

The Unix `diff` command handles the first task everywhere:

```bash
diff -u file1.txt file2.txt
```

Its plain output is useful for scripts and patches, but not always pleasant to read. A side-by-side view is available with `diff -y`, yet long lines, the lack of color, and changes within a line can still make the important differences hard to spot.

## Compare two files

### Neovim

Neovim opens two files in a dedicated diff view:

```bash
nvim -d file1.txt file2.txt
```

This is a good option once its navigation becomes muscle memory. `]c` and `[c` move between changes, while `:diffget` and `:diffput` copy a change between windows. There is a learning curve, but the result is a fast, keyboard-driven workflow that is already available wherever Neovim is installed.

### Delta

[Delta](https://github.com/dandavison/delta) is best known as a Git pager, but it can also compare arbitrary files:

```bash
delta file1.txt file2.txt
```

It adds syntax highlighting and clear word-level emphasis without requiring an editor or project workspace.

### Editors and IDEs

Several graphical editors can open a one-off comparison directly from the command line:

```bash
zed --diff file1.txt file2.txt
idea diff file1.txt file2.txt
code --diff file1.txt file2.txt
```

Zed, IntelliJ IDEA, and VS Code do not need a workspace or repository open for these commands. They are useful when I want a familiar graphical diff without turning the files into a project first.

[Kaleidoscope](https://kaleidoscope.app/) also compares arbitrary files and provides a polished native interface. Its downside is price: it uses a subscription rather than a one-time purchase.

## Make Git diffs easier to read

Git's built-in diff contains all the necessary information, but [Delta](https://github.com/dandavison/delta) makes it much easier to scan. On macOS, install it with Homebrew:

```bash
brew install git-delta
```

This configuration uses Delta as Git's default pager, enables side-by-side output and navigation, and preserves access to Git's original text output through `tdiff` and `tshow`:

```gitconfig
[core]
    pager = delta

[alias]
    tdiff = !git --no-pager diff --no-ext-diff --color=always
    tshow = !git --no-pager show --no-ext-diff --color=always

[interactive]
    diffFilter = delta --color-only

[delta]
    side-by-side = true
    wrap-max-lines = unlimited
    navigate = true
```

Put this in `~/.gitconfig`. Normal commands then use Delta:

```bash
git diff
git show
git log -p
```

The aliases bypass the configured pager and any external diff driver:

```bash
git tdiff
git tshow HEAD~2
```

Because they use `--color=always`, redirected output contains ANSI color sequences. Replace it with `--color=never` when writing a clean patch or text file.

Side-by-side output works best in a wide terminal. In a narrow pane, Delta's normal unified view may be easier to read; remove `side-by-side = true` or override it for that invocation.

## Open a Git diff in a browser

[diff2html-cli](https://github.com/rtfpessoa/diff2html-cli) turns a Git diff into a side-by-side HTML preview and opens it in a browser. This shell function makes it convenient:

```zsh
# Open a Git diff as a side-by-side HTML preview,
# forwarding all arguments to git diff.
# npx avoids a separate global installation for every Node.js version
# managed by NVM.
htmldiff() {
  npx diff2html-cli \
    --style side \
    --diffStyle char \
    --title "$PWD" \
    -- \
    -M \
    "$@"
}
```

Add it to `~/.zshrc`, reload the shell, and use it anywhere inside a Git repository:

```bash
htmldiff
htmldiff HEAD~1
htmldiff main...HEAD -- src/
```

The `--` after the diff2html options forwards everything that follows to `git diff`; `-M` enables rename detection. `npx` downloads and caches the package when necessary instead of requiring a global installation tied to the active NVM-managed Node.js version.

IDE integrations in IntelliJ IDEA, VS Code, and Zed also provide strong Git diff views, but generally require opening the repository in the IDE. Kaleidoscope can display Git changes too, with the same subscription-price tradeoff.

## Which one should I use?

| Situation | Good default |
|---|---|
| Quick, portable text or patch output | `diff -u` |
| Keyboard-driven file comparison | `nvim -d` |
| Readable comparison without opening an editor | `delta file1 file2` |
| Graphical one-off file comparison | `zed --diff`, `idea diff`, or `code --diff` |
| Everyday Git diffs in the terminal | Delta as Git's pager |
| Large Git diff that benefits from a browser | `htmldiff` |

No single view is best for every diff. I keep the plain Git output available, use Delta for everyday terminal work, and reach for an editor or HTML preview when a side-by-side view makes a complicated change easier to understand.
