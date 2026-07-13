+++
date = '2026-07-12T17:32:00-07:00'
draft = false
title = 'Use a Personal GitHub Identity in One Repository'
description = 'Keep a machine-wide work identity while giving selected Git repositories a separate commit identity and SSH key.'
tags = ['git', 'github', 'ssh', 'zsh', 'macos']
categories = ['tools']
toc = true
+++

A work-managed laptop may already have a corporate Git identity configured globally:

```bash
git config --global user.name "Work Name"
git config --global user.email "name@company.example"
```

Selected personal repositories can use a different identity without changing those machine-wide defaults. Git supports repository-local configuration, and SSH can be told to use a dedicated key for each selected repository.

This setup keeps three concerns separate:

- `user.name` and `user.email` determine the author recorded in commits.
- The SSH key authenticates access to GitHub.
- Repository-local configuration limits both choices to one repository.

Before using a personal account or project on a managed device, make sure the organization's acceptable-use and source-code policies permit it.

## Create a dedicated GitHub SSH key

Choose the private GitHub email address shown under **GitHub → Settings → Emails**, then create a separate key:

```bash
ssh-keygen \
  -t ed25519 \
  -C "12345678+username@users.noreply.github.com" \
  -f "$HOME/.ssh/id_ed25519_github"
```

Use a passphrase when prompted. The numeric prefix and username above are placeholders; copy the actual no-reply address from GitHub rather than constructing it from memory.

Add the contents of the public key to **GitHub → Settings → SSH and GPG keys → New SSH key**:

```bash
pbcopy < "$HOME/.ssh/id_ed25519_github.pub"
```

`pbcopy` is available on macOS. On another operating system, display the `.pub` file and copy its contents with the available clipboard tool.

## Add repository helpers to zsh

Add these functions to `~/.zshrc`, replacing the placeholder name and email with the personal GitHub commit identity:

```zsh
github_identity() {
  # Identity to use for GitHub commits from this repo.
  local name="Your Name"
  local email="12345678+username@users.noreply.github.com"

  # Dedicated SSH key reserved for GitHub access.
  local key="$HOME/.ssh/id_ed25519_github"

  # Repo to configure; defaults to the current directory.
  local repo="${1:-.}"

  # Stop early if the GitHub SSH key has not been created yet.
  if [[ ! -f "$key" ]]; then
    echo "Missing key: $key"
    echo "Create it first with:"
    echo "ssh-keygen -t ed25519 -C \"$email\" -f \"$key\""
    return 1
  fi

  # Apply the settings only to an existing Git work tree.
  git -C "$repo" rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
    echo "Not a Git repo: $repo"
    return 1
  }

  # Make the key available for GitHub SSH authentication.
  ssh-add --apple-use-keychain "$key" 2>/dev/null || ssh-add "$key"

  # Scope the commit identity to this repo only.
  git -C "$repo" config --local user.name "$name"
  git -C "$repo" config --local user.email "$email"

  # Force this repo to use only the dedicated GitHub SSH key.
  git -C "$repo" config --local core.sshCommand \
    "ssh -i '$key' -o IdentitiesOnly=yes"

  # Confirm what was configured.
  echo "Configured GitHub identity for:"
  git -C "$repo" rev-parse --show-toplevel
  echo "$name <$email>"
  echo "SSH key: $key"
}

github_clone() {
  # Clone a GitHub repo with the dedicated GitHub SSH key.
  local repo_url="$1"
  local key="$HOME/.ssh/id_ed25519_github"

  # Require an SSH clone URL.
  if [[ -z "$repo_url" ]]; then
    echo "Usage: github_clone git@github.com:OWNER/REPO.git"
    return 1
  fi

  if [[ ! -f "$key" ]]; then
    echo "Missing key: $key"
    return 1
  fi

  # Use only the dedicated key during the clone operation.
  GIT_SSH_COMMAND="ssh -i '$key' -o IdentitiesOnly=yes" \
    git clone "$repo_url" || return 1

  # zsh modifiers remove the URL prefix and .git suffix.
  local repo_dir="${repo_url:t:r}"
  cd "$repo_dir" || return 1

  # Persist the repo-local identity and SSH configuration.
  github_identity
}
```

Reload the shell after saving the file:

```bash
source ~/.zshrc
```

The `--apple-use-keychain` option is specific to macOS. The fallback works with `ssh-add` implementations that do not support it.

## Configure an existing repository

Enter a personal repository and run:

```bash
cd ~/code/personal-project
github_identity
```

A repository path can also be supplied without changing directories:

```bash
github_identity ~/code/personal-project
```

The function writes to `.git/config`, not `~/.gitconfig`. The global corporate identity remains unchanged and continues to apply everywhere else.

## Clone a personal repository

Cloning happens before a new repository has local Git configuration. Use the dedicated key for that one command:

```bash
GIT_SSH_COMMAND="ssh -i '$HOME/.ssh/id_ed25519_github' -o IdentitiesOnly=yes" \
  git clone git@github.com:OWNER/REPOSITORY.git
```

Then enter the repository and run `github_identity` to persist its commit and SSH settings.

The `github_clone` helper performs both steps:

```bash
github_clone git@github.com:OWNER/REPOSITORY.git
```

Use an SSH remote such as `git@github.com:OWNER/REPOSITORY.git`. An HTTPS remote does not use `core.sshCommand` or the SSH key.

## Verify the effective configuration

Inside the repository, inspect both the values and the files that supplied them:

```bash
git config --show-origin --get user.name
git config --show-origin --get user.email
git config --show-origin --get core.sshCommand
git remote -v
```

The first three commands should point to the repository's `.git/config`, while this command should still show the machine-wide work email:

```bash
git config --global --get user.email
```

Test GitHub authentication with the same dedicated key:

```bash
ssh -T -i "$HOME/.ssh/id_ed25519_github" \
  -o IdentitiesOnly=yes git@github.com
```

GitHub should report the personal account's username. It normally exits with status 1 even after successful authentication because GitHub does not provide shell access.

Before the first commit, confirm the identity Git will use:

```bash
git var GIT_AUTHOR_IDENT
git var GIT_COMMITTER_IDENT
```

## What this does not do

The SSH key authenticates pushes, but it does not cryptographically sign commits. Commit signing is a separate Git and GitHub configuration.

Repository-local identity also cannot change ownership or policy constraints on a managed laptop. It only prevents the global Git identity and default SSH keys from being selected accidentally for the repositories configured this way.
