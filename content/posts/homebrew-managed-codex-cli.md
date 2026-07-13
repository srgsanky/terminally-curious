+++
date = '2026-07-12T17:04:00-07:00'
draft = false
title = 'Run Codex CLI Without Loading Node.js'
description = 'Replace an NVM- or npm-managed Codex CLI with the native Homebrew cask on Apple Silicon macOS.'
tags = ['codex', 'homebrew', 'macos', 'cli']
categories = ['tools']
toc = true
+++

When Codex CLI is installed through npm, the `codex` command depends on the Node.js version and global npm prefix currently selected by NVM. That can make Codex unavailable before NVM loads or cause a different installation to appear after switching Node versions.

OpenAI also distributes Codex as a [Homebrew cask](https://formulae.brew.sh/cask/codex). It installs a native executable that does not require Node.js in `PATH`.

On an Apple Silicon Mac, the Homebrew-managed command should resolve to:

```text
/opt/homebrew/bin/codex
```

These instructions assume Homebrew uses its default Apple Silicon prefix, `/opt/homebrew`.

## Find and remove npm installations

First, inspect every currently available `codex` command:

```bash
type -a codex
```

If the active command belongs to npm, remove it with the npm installation that owns it:

```bash
npm uninstall -g @openai/codex
```

NVM installs global packages separately for each Node version. Check for Codex under other versions:

```bash
find "${NVM_DIR:-$HOME/.nvm}/versions/node" \
  -path '*/lib/node_modules/@openai/codex' -prune -print 2>/dev/null
```

For each result, activate that Node version with `nvm use` and run the uninstall command again.

An older global npm installation may also have left a symlink in Homebrew's `bin` directory. Inspect it before removing anything:

```bash
ls -l /opt/homebrew/bin/codex
```

If it points into `node_modules/@openai/codex`, remove that npm installation or, if only a stale symlink remains, delete the symlink:

```bash
rm /opt/homebrew/bin/codex
```

Do not remove the file if it points into Homebrew's `Caskroom`.

## Install the Homebrew cask

```bash
brew install --cask codex
```

Clear any cached command location:

```bash
rehash       # zsh
hash -r      # bash
```

## Verify the installation

Check that Homebrew owns the cask and that the shell resolves the expected executable:

```bash
brew list --versions --cask codex
type -a codex
ls -l /opt/homebrew/bin/codex
file -L /opt/homebrew/bin/codex
codex --version
```

`type -a` reveals shadowed commands. `file -L` follows Homebrew's symlink and inspects the underlying executable.

Finally, run Codex with a minimal `PATH` containing Homebrew but no NVM directories:

```bash
env -i \
  HOME="$HOME" \
  PATH="/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" \
  codex --version
```

If this prints a version, Codex no longer depends on NVM or Node.js being loaded.

## Upgrade Codex

Keep Homebrew as the sole owner of the installation:

```bash
brew upgrade --cask codex
```

Do not run `npm update -g @openai/codex`; that would recreate an npm-managed copy that may shadow the Homebrew executable.

## Troubleshooting

### Homebrew reports a conflicting file

Inspect the existing file:

```bash
ls -l /opt/homebrew/bin/codex
```

If it is a stale npm symlink, remove it and retry:

```bash
rm /opt/homebrew/bin/codex
brew install --cask codex
```

### Codex still resolves through NVM

```bash
type -a codex
```

Activate the Node version containing the shadowing copy, uninstall Codex, and clear the shell cache:

```bash
nvm use <version>
npm uninstall -g @openai/codex
rehash
```

### Codex is unavailable before NVM loads

Ensure Homebrew is added to `PATH` independently of NVM:

```bash
eval "$(/opt/homebrew/bin/brew shellenv)"
```

Place that line before any NVM lazy-loading configuration.
