+++
date = '2026-09-05T18:30:00-07:00'
draft = false
title = 'Multiple Python Versions on a Mac Without Slowing Your Shell'
description = 'Install and switch between Python versions using uv, with no shell hooks, no shims, and no startup cost.'
tags = ['python', 'uv', 'homebrew', 'macos', 'cli']
categories = ['tools']
toc = true
+++

macOS ships `/usr/bin/python3`, but it belongs to the operating system. It is old, Apple upgrades it on its own schedule, and installing packages into it is a good way to break something you did not know depended on it. Leave it alone.

That leaves the question of how to get the versions you actually want. Most version managers answer it by installing a shell hook, which means every terminal you open pays for a Python feature you may not use in that session. There is a way to get multiple versions with no shell integration at all.

## Check whether you already have uv

[uv](https://docs.astral.sh/uv/) is a Python package and project manager that also manages Python interpreters. It arrives on a lot of machines indirectly, bundled by editors and other tools, so check before installing:

```bash
type -a uv
uv --version
```

`type -a` matters more than `which` here. It lists every match, and having two copies of uv on `PATH` from different installation methods is a real and confusing failure mode.

## Install uv

If you do not have it, pick one method and remember which one you picked:

```bash
brew install uv
```

Or the standalone installer, which places `uv` and `uvx` in `~/.local/bin`:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

The installation method determines how you upgrade. uv knows which one you used and will refuse to guess:

```text
$ uv self update
error: uv was installed through an external package manager and cannot update itself.

hint: You installed uv using Homebrew. To update uv, run `brew update && brew upgrade uv`
```

So use `uv self update` for the standalone installer, and `brew upgrade uv` for Homebrew. Do not install both.

Either way, uv is a single static binary. Nothing is added to `.zshrc`, and there is no `eval` line to run at startup.

## Where Homebrew runs out

Homebrew can install several Python versions side by side, and for a single default interpreter it is a reasonable choice:

```bash
brew install python@3.12 python@3.13
```

Two things limit it.

Homebrew's Python is marked externally managed under [PEP 668](https://peps.python.org/pep-0668/), so installing into it directly is refused. That is correct behaviour, since Homebrew owns those files, but it means every project needs a virtual environment anyway.

More importantly, `brew upgrade` moves a formula from 3.12.7 to 3.12.8 underneath you. Virtual environments built against the old interpreter reference files that no longer exist, and they break. The formula tracks the latest patch release; you do not get to hold a version still.

## Install Python versions with uv

```bash
uv python install 3.10 3.11 3.12 3.13
```

These are prebuilt binaries from [python-build-standalone](https://github.com/astral-sh/python-build-standalone), so there is no compiler involved. Each version is roughly a 20 MB download that unpacks in a couple of seconds. Compare that to a source-building manager, where a single version takes minutes and fails if a system library is missing.

See what is installed and what is available:

```bash
uv python list
uv python list --only-installed
```

Remove one:

```bash
uv python uninstall 3.10
```

uv installs versioned executables into `~/.local/bin`, so confirm that directory is on your `PATH`:

```bash
uv python update-shell
```

That command edits your profile only if the directory is missing. It adds a `PATH` entry, not a hook — there is no per-shell or per-prompt work.

The result is a plain symlink to a real executable:

```text
$ file -L ~/.local/bin/python3.12
Mach-O 64-bit executable arm64
```

No wrapper script sits in front of it. This matters later.

## Select a version

uv resolves the interpreter through a fixed precedence order. Highest priority first:

1. An explicit `--python` argument
2. A `.python-version` file, searched upward from the working directory
3. `requires-python` in `pyproject.toml`
4. The first compatible Python on `PATH`
5. A managed download, if nothing else satisfies the request

### Per project

Pin the version into a file that lives with the code:

```bash
uv python pin 3.12
```

That writes `.python-version`. Commit it. Anyone who clones the repository gets the same interpreter without being told about it, and there is no global state to set or forget. To pin the interpreter for every project instead, use `--global`; to undo a pin, use `--rm`.

### Per command

Override without changing any file:

```bash
uv run --python 3.13 python script.py
uv venv --python 3.11 .venv
```

The version request is flexible. All of these work:

```bash
uv run --python 3.12 ...          # minor version
uv run --python 3.12.7 ...        # exact patch
uv run --python '>=3.12' ...      # a range
uv run --python cpython@3.13 ...  # a specific implementation
uv run --python pypy@3.11 ...     # a different implementation entirely
```

Ask which interpreter a request resolves to, without running anything:

```bash
uv python find 3.13
```

### Per script

A standalone script can declare its own interpreter and dependencies inline, using [PEP 723](https://peps.python.org/pep-0723/) metadata:

```python
# /// script
# requires-python = ">=3.10,<3.11"
# dependencies = ["rich"]
# ///

import sys
from rich import print

print(f"running on {sys.version.split()[0]}")
```

```bash
uv run script.py
```

uv reads the header, finds or downloads a matching interpreter, builds a temporary environment, and runs it. The script is self-describing and needs no surrounding project.

### For command-line tools

Tools you want on `PATH` globally should not be tangled up with any project's interpreter:

```bash
uv tool install ruff
uv tool list
uv tool upgrade --all
```

Each tool gets its own isolated environment. `uvx ruff` runs one without installing it at all.

## Where uv stores everything

Three directories, with distinct jobs:

```text
~/.local/bin/               symlinks to versioned executables
~/.local/share/uv/python/   the interpreters themselves
~/.cache/uv/                the package cache
```

Interpreter directories are named for exactly what they contain:

```text
cpython-3.12.7-macos-aarch64-none
```

Implementation, version, platform, architecture, and variant. A free-threaded build gets its own directory, and so does every patch release. Each one is self-contained, carrying its own `bin/`, its own `libpython`, even its own Tcl/Tk. Nothing is shared between interpreters, which is precisely why installing or removing one cannot disturb another. Patch versions are immutable — 3.12.7 stays 3.12.7 until you ask for something else.

The cache is a separate concern:

```text
archive-v0/        unpacked wheels, ready to link into environments
sdists-v9/         source distributions
simple-v18/        package index metadata
environments-v2/   short-lived environments for `uv run` and scripts
interpreter-v4/    cached interpreter probes
```

Check the locations on your own machine:

```bash
uv python dir
uv tool dir
uv cache dir
```

## Can libraries be shared across versions?

Not in the way people usually mean, but the disk cost mostly is. These are two different layers.

**Every environment gets its own `site-packages`, always.** Compiled extension modules are built against a specific CPython ABI, bytecode caches are version-tagged, and plenty of library code branches on `sys.version_info`. One shared directory across versions is not safe, and no tool offers it.

**The cache underneath is shared, and the sharing rule is the wheel's tag.** Install the same two packages into a 3.10 environment and a 3.13 environment, then look at what the cache actually holds. A pure-Python package produces one entry:

```text
idna-3.19.dist-info    Tag: py3-none-any
```

Both environments use it. The files are byte-identical, from a single cached copy.

A compiled package produces one entry per ABI, for the same release:

```text
numpy-2.5.2.dist-info  Tag: cp312-cp312-macosx_14_0_arm64
numpy-2.5.2.dist-info  Tag: cp313-cp313-macosx_14_0_arm64
numpy-2.5.2.dist-info  Tag: cp314-cp314-macosx_14_0_arm64
```

These are genuinely different build artifacts, not redundant copies. So: **pure-Python wheels are cached once and reused by every Python version; compiled wheels cannot be.** That is a CPython constraint rather than a uv one.

### Environments cost less disk than they claim

On macOS, uv's default link mode is `clone`, which uses APFS copy-on-write. Files in a new environment share physical blocks with the cache until something writes to them.

The effect is easy to measure. Create an environment, install a package that reports as 22 MB, and compare the reported size against the actual change in free space:

```text
logical size of the new environment : 22M
actual free-space delta             : 0 MB
```

`du` reports the logical size and will overstate what environments cost you. Two caveats: copy-on-write only works within a single filesystem, so check with `stat -f '%d'` before assuming savings across volumes, and Docker builds should set `UV_LINK_MODE=copy` because the cache and target sit on different layers.

### Prune the cache

The cache only grows, and `archive-v0` will dominate it. Remove entries that nothing references any more:

```bash
uv cache prune
```

Check the size first if you want to see the effect:

```bash
du -sh "$(uv cache dir)"
```

`uv cache clean` removes everything instead, which is a re-download rather than a repair. Prune is the routine maintenance command; on a machine that builds a lot of environments it is worth running occasionally.

## Why not pyenv or mise

Both work. Both cost you something at the shell level, which is the whole reason to look elsewhere.

**pyenv** requires `eval "$(pyenv init -)"` in your shell configuration, and it charges twice.

The startup cost is around 110 ms per shell on an Apple Silicon Mac, measured with no versions installed at all. That is the floor. The generated init script spawns a `bash` subprocess purely to deduplicate `PATH`, then runs `pyenv rehash`, which regenerates one shim per executable per installed version. Install more versions and the number grows.

The per-command cost is worse and less obvious. Every shim is a shell script:

```bash
#!/usr/bin/env bash
set -e
program="${0##*/}"
exec "$(command -v pyenv)" exec "$program" "$@"
```

So `python` starts bash, which runs `pyenv exec`, another shell script that resolves the active version, which finally execs the interpreter. Running the *same interpreter* through a pyenv shim and through a direct symlink, ten invocations each:

```text
through the pyenv shim   1.385s  (138 ms per call)
through a direct symlink 0.106s  ( 10.6 ms per call)
```

Thirteen times slower, and it applies to every `python`, `pip`, and console script you run. Scripts that shell out to Python in a loop feel this immediately. The lazy-loading wrapper trick that circulates for pyenv fixes the startup cost and leaves this one entirely intact.

**mise** is faster per command but hooks a different place. Its default activation installs a `precmd` hook that recalculates `PATH` on every prompt render. It is only a few milliseconds, but it is work done every time you press Enter, forever, and it is exactly the thing you notice when a prompt stops feeling instant. Its `--shims` mode drops the hook, but shims are the slow path again, and you lose the directory-aware switching that was the reason to run it.

uv avoids the choice. There is no hook because there is no shim, and there is no shim because a pinned version is read from a file at the moment you invoke `uv run` rather than maintained as ambient shell state. Nothing runs at startup, nothing runs at your prompt, and `python3.12` is a symlink to `python3.12`.

## Command reference

```bash
# Installing versions
uv python install 3.12          # install a version
uv python list                  # list installed and available
uv python uninstall 3.12        # remove a version
uv python upgrade 3.12          # upgrade to the latest patch

# Selecting a version
uv python pin 3.12              # write .python-version
uv python pin --rm              # remove the pin
uv python find 3.12             # show what a request resolves to
uv run --python 3.13 <cmd>      # override for one command

# Environments and projects
uv venv --python 3.11 .venv     # create an environment
uv sync                         # install a project's locked dependencies
uv add requests                 # add a dependency
uv run script.py                # run with the resolved interpreter

# Tools
uv tool install ruff            # install a CLI tool globally
uvx ruff check                  # run one without installing

# Locations and maintenance
uv python dir                   # interpreter directory
uv cache dir                    # cache directory
uv cache prune                  # remove unreferenced cache entries
```
