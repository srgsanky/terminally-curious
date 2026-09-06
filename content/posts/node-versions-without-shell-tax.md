+++
date = '2026-09-05T20:00:00-07:00'
draft = false
title = 'Node Versions on a Mac Without the Shell Startup Tax'
description = 'Switch Node versions per project using mise shims, with no shell hook, no prompt cost, and no lazy-loading workaround.'
tags = ['node', 'nodejs', 'mise', 'fnm', 'nvm', 'macos', 'zsh', 'cli']
categories = ['tools']
toc = true
+++

Most Node version managers ask you to put a line in your shell configuration. That line runs in every terminal you open, whether or not the session ever touches Node. With nvm, it is one of the most expensive lines in a typical `.zshrc`.

The usual response is a lazy-loading wrapper: define `node`, `npm`, and `npx` as shell functions that load nvm on first call, then replace themselves. It works, and it is a reasonable instinct, but it has costs that are easy to miss.

- `node` is a shell function until first use, so `type node` and `command -v node` report something misleading
- Non-interactive shells never read `.zshrc`, so scripts, Makefiles, and editor integrations get no Node at all
- The first call in every shell still pays the full load cost
- You get no per-project switching; `nvm use` stays a manual step

You can avoid the whole problem instead.

## Measure what nvm costs

Time a shell that does nothing but load nvm:

```bash
for i in 1 2 3; do
  /usr/bin/time zsh -c 'export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"'
done
```

On an Apple Silicon Mac this lands around **510 ms**, against essentially zero for a bare `zsh -c true`. That is the cost the lazy-loading wrapper is deferring, not removing.

Switching is worse. In a shell where nvm is already loaded:

```bash
time ( for i in $(seq 10); do nvm use v20.20.1 >/dev/null; done )
```

That works out to roughly **284 ms per call**. The automatic `.nvmrc` switching recipe in nvm's own documentation calls exactly this on every directory change. Even `nvm current`, which some prompt themes invoke, costs about **58 ms** — paid on every prompt.

None of this is a bug. nvm is thousands of lines of POSIX shell, re-parsed by every shell that loads it, shelling out to subprocesses for operations a compiled binary does in-process. It is a 2010 design still doing its job.

## Use mise instead

[mise](https://mise.jdx.dev/) is a compiled version manager that handles Node alongside other runtimes. It is the most-installed version manager in Homebrew's analytics, ahead of nvm, and it is what Volta's maintainers now point people toward.

```bash
brew install mise
```

Install Node versions and set a global default:

```bash
mise install node@20 node@22
mise use --global node@22
```

Pin a version for a project, writing `mise.toml` in the current directory:

```bash
mise use node@20
```

```toml
[tools]
node = "20"
```

Commit that file. Anyone who clones the repository gets the same Node version.

## Skip the shell hook entirely

This is the part that matters if you care about startup time.

mise's documented setup is `eval "$(mise activate zsh)"`, which registers two zsh hooks:

```zsh
add-zsh-hook precmd _mise_hook_precmd
add-zsh-hook chpwd  _mise_hook_chpwd
```

The `chpwd` hook is cheap and only fires when you change directory. The `precmd` hook fires **every time your prompt renders**, at roughly **6.8 ms** a go. That is small, but it is work done every time you press Enter, forever, and it is exactly what makes a prompt stop feeling instant.

Shims mode avoids both hooks:

```bash
mise activate zsh --shims
```

It emits nothing but `PATH` entries:

```text
export PATH="$HOME/.local/share/mise/shims:$PATH"
```

Since the output is a static `PATH` export, there is no reason to spawn mise at startup to generate it. Put the directory in your `PATH` directly:

```zsh
export PATH="$HOME/.local/share/mise/shims:$PATH"
```

That is the whole configuration. Measured across 20 shells, it is indistinguishable from not configuring anything:

```text
baseline zsh                 0.061s
hardcoded PATH export        0.064s
eval mise activate --shims   0.192s
eval mise activate           0.427s
```

No hook runs at startup. No hook runs at your prompt. And per-directory switching still works, because each shim resolves the version at the moment you invoke it, by reading configuration from the working directory upward:

```text
p20/  (node = "20")   ->  v20.20.2
p22/  (node = "22")   ->  v22.23.2
```

The cost moves to invocation: a shim adds roughly **10 ms** to each `node` or `npm` command you type. It does not compound through a build, because once npm is running it spawns Node through its own resolved path rather than the shim. An `npm run` chain measured 0.38 s through shims against 0.37 s direct.

Trading 10 ms per typed command for zero shell and prompt cost is the right trade for most people. If you run Node in tight shell loops, it is not, and the next section is for you.

## The .nvmrc gotcha

mise does not read `.nvmrc` or `.node-version` by default. If you migrate from nvm and expect your existing files to work, nothing happens and it looks like switching is broken:

```text
p20/ (.node-version=20):  v23.1.0
p22/ (.node-version=22):  v23.1.0
```

Both fell through to the system Node. Enable the idiomatic version files for Node in `~/.config/mise/config.toml`:

```toml
[settings]
idiomatic_version_file_enable_tools = ["node"]
```

Then the same directories resolve correctly:

```text
p20/ (.node-version=20):  v20.20.2
p22/ (.node-version=22):  v22.23.2
```

mise's own `mise.toml` works without this setting. Turn it on when you are working in repositories you do not control, or that you are not ready to add a `mise.toml` to.

## Where mise stores things

```text
~/.local/share/mise/installs/   the runtimes themselves
~/.local/share/mise/shims/      one shim per executable
~/.config/mise/config.toml      global configuration
~/.cache/mise/                  downloads and metadata
```

Check them on your own machine:

```bash
mise where node@22
mise ls
mise cache clear
```

One consequence of shims mode worth knowing: `which node` reports the shim path rather than the real interpreter. Ask mise directly when you need the actual path:

```bash
mise which node
```

Shims mode also means mise's environment variable management and its `cd`/`enter`/`leave` hooks do not fire. For version switching alone, none of that matters.

## fnm, if you only do Node

[fnm](https://github.com/Schniz/fnm) is a Rust Node version manager that is faster than mise on the axis mise is weakest: it adds nothing per command.

```bash
brew install fnm
```

```zsh
eval "$(fnm env --use-on-cd --shell zsh)"
```

Rather than shims, fnm creates a per-shell directory containing a symlink to the active Node and puts that on `PATH`. Switching repoints the symlink, so `node` is a real executable and runs at full speed. The `eval` costs under 5 ms per shell.

Its auto-switching registers only `chpwd`, never `precmd`:

```zsh
add-zsh-hook chpwd _fnm_autoload_hook
```

So your prompt is untouched. The hook is guarded, too, doing nothing in directories without a version file:

```zsh
if [[ -f .node-version || -f .nvmrc || -f package.json ]]; then
  fnm use --silent-if-unchanged
fi
```

It costs about **1.4 ms per directory change**, and it reads `.nvmrc` and `.node-version` natively with no configuration, which makes it the smoother migration from nvm.

The tradeoff is project health rather than performance. fnm is stable and widely starred, but low-churn: 56 commits across the last two years, three quarters of that span with no commits at all, and one release in the previous 22 months. Nothing is broken, and a version manager is not a fast-moving problem, but mise ships more than a hundred commits a quarter. Pick fnm for its speed, knowing it is in maintenance mode; pick mise if you would rather be on the busier project.

## The others, briefly

**Homebrew** installs Node fine and costs nothing at startup:

```bash
brew install node@22
```

There is no per-project switching, and `brew upgrade` moves the formula to a new patch release underneath you. Good for one Node, not for several.

**nvm** is still the most widely known option and, on these measurements, the slowest by two orders of magnitude. If you are already running it behind a lazy-loading wrapper, that wrapper is a reasonable patch for a problem you can delete instead.

**Volta** was the elegant version of this idea: shims, no shell hook, versions pinned in `package.json`. Its README now opens by stating the project is unmaintained and recommending mise. Do not adopt it.

**n** installs Node into a shared prefix with no shell integration at all. It is simple and fast, and it has no per-project switching, which is usually the reason to use a version manager.

## Not all shims cost the same

"Shims are slow" is common advice, and it is really a fact about one implementation. Measured overhead per invocation, same runtime each way:

```text
pyenv    ~128 ms
mise      ~10 ms
Volta      ~5 ms
```

pyenv's shims are bash scripts that exec another bash script, so two shell interpreters start before your program does. mise and Volta ship a single compiled binary and symlink each shim name to it. Same architecture, an order of magnitude apart, because the language the shim is written in is the whole cost.

Worth knowing before you rule out a tool on reputation.

## Command reference

```bash
# Installing versions
mise install node@22            # install a version
mise ls                         # list installed
mise ls-remote node             # list available
mise uninstall node@20          # remove a version

# Selecting a version
mise use --global node@22       # set the global default
mise use node@20                # pin in ./mise.toml
mise which node                 # real path behind the shim
mise exec node@18 -- node -v    # run once, without pinning

# Setup
mise activate zsh --shims       # print the PATH lines
mise doctor                     # diagnose a broken setup

# fnm equivalents
fnm install 22
fnm use 22
fnm list
```
