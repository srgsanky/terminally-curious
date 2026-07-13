+++
date = '2026-07-12T17:32:00-07:00'
draft = false
title = 'Use a Personal GitHub Identity in One Repository'
description = 'Keep a machine-wide work identity while giving selected Git repositories a separate commit identity and SSH key.'
tags = ['git', 'github', 'ssh', 'zsh', 'macos']
categories = ['tools']
toc = true
+++

A managed laptop may already have a work identity configured globally:

```bash
git config --global user.name "Work Name"
git config --global user.email "name@company.example"
```

You can override it in selected repositories without changing the global defaults. Keep these settings distinct:

- `user.name` and `user.email` set the author recorded in commits.
- An SSH key authenticates GitHub access.
- Repository-local configuration confines both settings to that repository.

First confirm that your organization's acceptable-use and source-code policies permit personal work on the device.

## Create a personal GitHub SSH key

Choose an email associated with your personal GitHub account. To keep it private, copy the no-reply address shown under **GitHub → Settings → Emails**. Then create a dedicated key, replacing the example email:

```bash
ssh-keygen \
  -t ed25519 \
  -C "12345678+username@users.noreply.github.com" \
  -f "$HOME/.ssh/id_ed25519_github"
```

Use a passphrase. Add the public key to **GitHub → Settings → SSH and GPG keys → New SSH key**:

```bash
pbcopy < "$HOME/.ssh/id_ed25519_github.pub"
```

`pbcopy` is a macOS command; on another operating system, copy the contents of the `.pub` file with its clipboard tool.

Add the key to your SSH agent so its passphrase can be cached:

```bash
ssh-add --apple-use-keychain "$HOME/.ssh/id_ed25519_github"
```

`--apple-use-keychain` is specific to macOS. Elsewhere, run `ssh-add "$HOME/.ssh/id_ed25519_github"`.

## Add zsh helpers

Add these functions to `~/.zshrc`, replacing the example name and email:

```zsh
github_identity() {
  local name="Your Name"
  local email="12345678+username@users.noreply.github.com"
  local key="$HOME/.ssh/id_ed25519_github"
  local repo="${1:-.}"
  local ssh_command="ssh -i ${(q)key} -o IdentitiesOnly=yes"

  if [[ ! -f "$key" ]]; then
    echo "Missing key: $key"
    return 1
  fi

  if ! git -C "$repo" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Not a Git repository: $repo"
    return 1
  fi

  git -C "$repo" config --local user.name "$name" || return 1
  git -C "$repo" config --local user.email "$email" || return 1
  git -C "$repo" config --local core.sshCommand "$ssh_command" || return 1

  echo "Configured $(git -C "$repo" rev-parse --show-toplevel)"
  echo "$name <$email>"
  echo "SSH key: $key"
}

github_clone() {
  local repo_url="$1"
  local key="$HOME/.ssh/id_ed25519_github"
  local ssh_command="ssh -i ${(q)key} -o IdentitiesOnly=yes"

  if [[ "$repo_url" != git@github.com:* ]]; then
    echo "Usage: github_clone git@github.com:OWNER/REPOSITORY.git"
    return 1
  fi

  if [[ ! -f "$key" ]]; then
    echo "Missing key: $key"
    return 1
  fi

  local repo_dir="${repo_url:t:r}"
  GIT_SSH_COMMAND="$ssh_command" git clone "$repo_url" "$repo_dir" || return 1
  github_identity "$repo_dir"
}
```

Reload zsh after saving the file:

```bash
source ~/.zshrc
```

## Configure or clone a repository

Configure an existing repository by running the helper inside it or passing its path:

```bash
cd ~/code/personal-project
github_identity

# Or, from any directory:
github_identity ~/code/personal-project
```

The helper writes the commit identity and SSH command to the repository's `.git/config`; it does not modify `~/.gitconfig`.

A new repository has no local configuration until after cloning. `github_clone` uses the personal key for the clone, then saves all three repository-local settings:

```bash
github_clone git@github.com:OWNER/REPOSITORY.git
```

> **Side note:** To clone with the personal key without adding the zsh helpers, run:
>
> ```bash
> GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519_github -o IdentitiesOnly=yes" \
>   git clone git@github.com:OWNER/REPOSITORY.git
> ```

Use an SSH remote in the `git@github.com:OWNER/REPOSITORY.git` form. HTTPS remotes do not use SSH keys or `core.sshCommand`.

## Verify the result

From the repository, inspect each effective value and its source:

```bash
git config --show-origin --get user.name
git config --show-origin --get user.email
git config --show-origin --get core.sshCommand
git remote -v
```

The first three values should come from the repository's `.git/config`. The global work identity should remain unchanged:

```bash
git config --global --get user.email
```

Confirm that the key authenticates the personal account:

```bash
ssh -T -i "$HOME/.ssh/id_ed25519_github" \
  -o IdentitiesOnly=yes git@github.com
```

GitHub should name the personal account. A successful test still exits with status 1 because GitHub does not provide shell access.

Before committing, confirm the author and committer Git will record:

```bash
git var GIT_AUTHOR_IDENT
git var GIT_COMMITTER_IDENT
```

## Limits

The SSH key authenticates pushes; it does not sign commits. Commit signing requires separate Git and GitHub configuration.

These settings also do not change ownership or policy restrictions on a managed device. They only prevent Git's global identity and default SSH keys from being selected for repositories configured this way.
