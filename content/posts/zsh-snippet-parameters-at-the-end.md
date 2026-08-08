+++
date = '2026-08-07T19:29:00-07:00'
draft = false
title = 'Put zsh Snippet Parameters at the End'
description = 'Wrap a one-off zsh command in an anonymous function so values used throughout a pipeline can be edited at the end.'
tags = ['zsh', 'shell', 'cli', 'productivity']
categories = ['tools']
toc = false
+++

Most shell-command snippets are almost reusable: only one or two values need to change. My usual choices are not great:

1. Paste the snippet into a text editor, replace the values, then paste it into the terminal.
2. Paste it directly into the terminal, move the cursor through the command, and replace each value in place.

[zsh anonymous functions](https://zsh.sourceforge.io/Doc/Release/Shell-Grammar.html#Anonymous-Functions) provide a third option. Wrap the command and put its changing values at the end:

```zsh
() {
  rg --fixed-strings "$1" "$2" |
    wc -l
} 'connection refused' ./logs
```

After pasting the snippet, the cursor is already beside the values that need editing. zsh immediately invokes the anonymous function, making the words after `}` available as `$1`, `$2`, and so on. The entire pipeline stays inside the function, and no named function remains afterward.

Quote the positional parameters inside the function. Also quote a value at the end when it contains spaces or shell metacharacters. This anonymous-function syntax is specific to zsh, so it should not be used in a portable `sh` snippet.

Two small conveniences make this workflow faster:

- **Control-W** deletes the word immediately before the cursor in zsh's usual line-editor keymaps, making a final placeholder quick to replace.
- On **macOS Tahoe**, **Command-Space**, then **Command-4**, opens [Spotlight Clipboard history](https://support.apple.com/guide/mac-help/search-your-clipboard-history-mchl40d5b86b/26/mac/26). Select an older item, press **Command-C**, then paste it into the terminal.

For snippets with a long pipeline and a short argument list, this keeps all routine editing at the easy end of the command.
