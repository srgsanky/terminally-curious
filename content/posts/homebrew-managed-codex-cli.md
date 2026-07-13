+++
date = '2026-07-12T17:04:00-07:00'
draft = false
title = 'Run Codex CLI Without Loading Node.js'
description = 'Replace an NVM- or npm-managed Codex CLI with the native Homebrew cask on Apple Silicon macOS.'
tags = ['codex', 'homebrew', 'macos', 'cli']
categories = ['tools']
toc = true
+++

If you originally installed the Codex CLI through npm, the `codex` command may depend on whichever Node.js version NVM has activated. That is inconvenient when NVM is lazy-loaded, when you switch Node versions, or when you simply want Codex available before any Node setup runs.

The fix is to let Homebrew manage Codex instead. OpenAI's [Codex CLI documentation](https://developers.openai.com/codex/cli/) supports installing it as a [Homebrew cask](https://formulae.brew.sh/cask/codex), which provides a native executable and does not require Node.js to be in `PATH`.

On an Apple Silicon Mac, the result should resolve from:

```text
/opt/homebrew/bin/codex
```

It should not resolve into an npm `node_modules` directory.

> These commands assume Homebrew is installed in `/opt/homebrew`, its default Apple Silicon prefix. Intel Macs normally use `/usr/local` instead.

## Why use the cask?

Homebrew casks are generally associated with GUI applications, but they are not restricted to GUI software. In this case, the Codex CLI is distributed as a cask: Homebrew installs the native executable and links it into Homebrew's `bin` directory.

That gives the command a stable home independent of:

- the active NVM version;
- npm's current global prefix; and
- whether Node.js has been loaded into the shell.

It also establishes one clear owner for installation and upgrades: Homebrew.

## Remove the npm-managed copies

There may be more than one old installation. One can live under the currently active NVM version while another lives under Homebrew's prefix from a previous global npm setup.

First, remove Codex from the active NVM-managed Node installation:

```bash
"$(nvm which current | sed 's|/bin/node$||')/bin/npm" uninstall -g @openai/codex
```

Then remove an npm-global installation under `/opt/homebrew` if one exists:

```bash
if [[ -x /opt/homebrew/bin/npm ]]; then
  /opt/homebrew/bin/npm uninstall -g @openai/codex
else
  rm -f /opt/homebrew/bin/codex
  rm -rf /opt/homebrew/lib/node_modules/@openai/codex
fi
```

The fallback cleanup is useful when the npm executable is gone but its old Codex symlink or package directory remains.

## Install Codex with Homebrew

Update Homebrew and install the cask:

```bash
brew update
brew install --cask codex
```

Refresh the shell's command cache so it forgets the path to the old npm executable:

```bash
rehash
```

`rehash` is the command for zsh, the default macOS shell. In bash, use `hash -r` instead.

## Verify which Codex you are running

Do not stop after checking that `codex --version` works. Confirm both the resolved path and the type of executable behind it:

```bash
which -a codex
ls -l /opt/homebrew/bin/codex
file -L /opt/homebrew/bin/codex
codex --version
```

`which -a` exposes shadowed copies instead of showing only the first match. `file -L` follows Homebrew's symlink and inspects the actual executable.

The strongest check is to launch Codex in a clean environment with a minimal `PATH` containing Homebrew but no NVM or Node.js directories:

```bash
env -i \
  HOME="$HOME" \
  PATH="/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" \
  codex --version
```

If this prints a version, the command no longer depends on NVM being loaded.

## Upgrade Codex

Once Homebrew owns the installation, use Homebrew for upgrades too:

```bash
brew update
brew upgrade --cask codex
codex --version
```

Do not use:

```bash
npm update -g @openai/codex
```

That upgrades—or recreates—the npm installation associated with whichever Node version or npm prefix happens to be active. Mixing package managers puts you back in the ambiguous state this migration is meant to remove.

## Troubleshooting

### Homebrew says the cask is not installed

If an upgrade or reinstall reports `Error: Cask 'codex' is not installed`, install it first:

```bash
brew install --cask codex
```

### Homebrew reports a conflicting file

An old npm symlink may still occupy Homebrew's target path. Inspect it, remove it, and reinstall the cask:

```bash
ls -l /opt/homebrew/bin/codex
rm -f /opt/homebrew/bin/codex
brew reinstall --cask codex
```

### Codex still resolves through NVM

List every shell definition and matching executable:

```bash
type -a codex
which -a codex
```

Remove the npm package using the `npm` executable from the Node version shown in that path:

```bash
/path/to/nvm/node/bin/npm uninstall -g @openai/codex
rehash
```

NVM normally prepends its active `bin` directory to `PATH`. Any Codex copy left there will therefore shadow `/opt/homebrew/bin/codex`.

### Codex is unavailable until NVM loads

Check the order of directories in `PATH`:

```bash
echo "$PATH" | tr ':' '\n'
```

On Apple Silicon, shell initialization should add Homebrew independently of NVM:

```bash
eval "$(/opt/homebrew/bin/brew shellenv)"
```

Place this before any NVM lazy-loading configuration. Codex will then be available as soon as the shell starts, even if Node.js is not.

### The shell remembers the old location

Shells cache command locations. Clear that cache after removing an npm-managed executable:

```bash
rehash       # zsh
hash -r      # bash
```

Opening a new terminal clears it as well.

## Final ownership check

At any point, these two commands reveal what will run and what it resolves to:

```bash
ls -l "$(command -v codex)"
file -L "$(command -v codex)"
```

The path must not lead into either of these locations:

```text
.nvm/versions/node
lib/node_modules/@openai/codex
```

The goal is simple: `/opt/homebrew/bin/codex` should work in a clean shell, Homebrew should be its only package manager, and future upgrades should happen through `brew upgrade --cask codex`.
