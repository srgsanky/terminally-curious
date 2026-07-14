+++
date = '2026-07-14T14:58:00-07:00'
draft = false
title = 'JSON vs. JSONC vs. JSONL'
description = 'Plain JSON, JSON with comments, and newline-delimited JSON solve different problems.'
tags = ['json', 'jsonc', 'jsonl', 'data-formats']
categories = ['programming-languages']
toc = false
+++

JSON, JSONC, and JSONL are closely related, but solve different problems.

## JSON: the standard format

JSON represents one value—often an object or array—without comments:

```json
{
  "port": 3000,
  "debug": true
}
```

It is the best default for APIs and data interchange because standard JSON parsers support it across languages and platforms.

## JSONC: JSON with comments

JSONC is JSON that also allows `//` and `/* ... */` comments:

```jsonc
{
  // Application port
  "port": 3000,

  /* Enable verbose logging */
  "debug": true
}
```

It is useful for human-edited configuration files such as `tsconfig.json` and VS Code settings.

JSONC is **not standard JSON**. A regular JSON parser may reject it, so use a JSONC-aware parser or remove the comments first.

## JSONL: JSON Lines

JSONL stores multiple JSON values, with one complete value per line:

```json
{"id":1,"name":"Alice"}
{"id":2,"name":"Bob"}
{"id":3,"name":"Charlie"}
```

It works well for logs, datasets, streaming, batch processing, and machine-learning training data. Because each line can be parsed independently, large files do not need to be loaded entirely into memory. Common extensions are `.jsonl` and `.ndjson`.

| Format | Best for | Structure |
|---|---|---|
| JSON | APIs and data interchange | One standard JSON value |
| JSONC | Human-edited configuration | One JSON document with comments |
| JSONL | Logs, datasets, and streaming | One JSON value per line |

In short: **JSON is the interoperable default, JSONC adds comments, and JSONL separates records by lines.**
