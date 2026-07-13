+++
date = '2026-07-12T18:30:00-07:00'
draft = false
title = 'Keep CLI Credentials Out of Your Shell with macOS Keychain'
description = 'Store API tokens in macOS Keychain and expose them only to the process that needs them.'
tags = ['macos', 'security', 'keychain', 'cli', 'shell']
categories = ['tools']
toc = true
+++

API tokens often end up in `.env` files or shell startup files such as `~/.zshrc`. This leaves long-lived plaintext on disk, risks accidental commits, and gives every process launched from the shell a copy.

Store the durable copy in macOS Keychain instead. Prefer, in order:

1. Let the application read Keychain directly.
2. If it only accepts an environment variable, use a launcher that sets the variable for that application and replaces itself with the application using `exec`.
3. Do not export secrets from an interactive shell or keep them in `.env` and startup files.

Keychain protects secrets at rest; it does not make environment variables secure. Subprocesses inherit environment variables, and logging, diagnostics, or a compromised user account can expose them.

## Store a credential in Keychain

The built-in `/usr/bin/security` command manages generic password entries. Use a namespaced service name to prevent collisions:

```bash
/usr/bin/security add-generic-password \
  -U \
  -a "$USER" \
  -s "dev.keyenv.example-api-token" \
  -l "Example API token" \
  -w
```

`-U` updates an existing entry. The final `-w`, with no value, prompts for the token so it does not enter shell history or the process argument list. Do not pass the value directly:

```bash
# Unsafe: the token can appear in the process argument list.
# /usr/bin/security add-generic-password ... -w "$API_TOKEN"
```

Verify the entry if needed:

```bash
/usr/bin/security find-generic-password \
  -a "$USER" \
  -s "dev.keyenv.example-api-token" \
  -w
```

This prints the token to the terminal. Delete the entry with:

```bash
/usr/bin/security delete-generic-password \
  -a "$USER" \
  -s "dev.keyenv.example-api-token"
```

By default, the program that creates a Keychain item is trusted to access it, so `/usr/bin/security` can read entries it creates. Inspect or change an entry's access controls in Keychain Access, and review access prompts rather than granting unrestricted access automatically.

## Give the secret to one process

For a program that only reads an environment variable, use a launcher rather than exporting the variable in your terminal. This script maps `ENV_NAME=key` to the Keychain service `dev.keyenv.key` and then runs one command.

Save it as `~/.local/bin/keyenv-run` (or another location in `PATH`):

```bash
#!/bin/bash
set -euo pipefail

fail() {
  printf '%s\n' "$1" >&2
  exit 2
}

if (( $# < 3 )) || [[ $1 != *=* || $2 != -- ]]; then
  fail "Usage: keyenv-run ENV_NAME=KEY -- COMMAND [ARGS...]"
fi

env_name=${1%%=*}
key=${1#*=}
shift 2

[[ $env_name =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] ||
  fail "Invalid environment variable name: $env_name"
[[ $key =~ ^[A-Za-z0-9._-]+$ ]] || fail "Invalid secret key: $key"

secret=$(
  /usr/bin/security find-generic-password \
    -a "$USER" \
    -s "dev.keyenv.$key" \
    -w
)

# `export` is a shell builtin, so the token does not enter an argument list.
export "$env_name=$secret"
unset secret
exec "$@"
```

Make it executable and use it:

```bash
chmod 700 ~/.local/bin/keyenv-run
keyenv-run API_TOKEN=example-api-token -- example-cli account show
```

The launcher retrieves the token, exports it in its own process, and replaces itself with `example-cli`. `API_TOKEN` therefore exists in the application and its descendants, but not in the interactive shell after the command exits. The script accepts one credential and assumes its Keychain entry already exists.

Never enable shell tracing while handling secrets: `set -x` may print commands and expanded values.

## Prefer direct Keychain access when possible

The launcher is a compatibility layer. An application you control can avoid environment variables by using Apple's Security framework and reading the credential only for the operation that needs it. Hide that platform-specific code behind a narrow interface:

```text
credentialStore.read("example-api-token")
```

The caller need not know whether the implementation uses Keychain, another operating system's credential manager, or a test double. Use the launcher for third-party tools that already require environment variables or when several tools need the same integration.

## Understand the boundary

Once an authorized process retrieves a secret, Keychain cannot protect it. The application can leak it through logs, diagnostics, child processes, or network requests, and malware running as the same user may be able to read it.

The goal is limited exposure: keep the durable copy in Keychain, retrieve it only when needed, and give it to as few processes as possible.
