+++
date = '2026-07-12T18:30:00-07:00'
draft = false
title = 'Shorter LLM Outputs Save Twice'
description = 'Concise model responses reduce generation cost and slow context growth in long-running conversations.'
tags = ['llm', 'coding-agents', 'context', 'tokens']
categories = ['agents']
toc = true
+++

Output tokens can carry a steep premium. At the time of writing, [OpenAI's API pricing](https://developers.openai.com/api/docs/pricing) lists GPT-5.4 at $2.50 per million input tokens and $15 per million output tokens: output costs **6× more**. GPT-5.4 mini has the same ratio, while GPT-5.4 nano is slightly higher. A shorter answer therefore produces an immediate saving—but its larger benefit can appear on later turns.

In a conversation that retains its history, each response becomes part of a future request:

```text
Turn 1: instructions + user 1                         → assistant 1
Turn 2: instructions + user 1 + assistant 1 + user 2  → assistant 2
Turn 3: instructions + earlier history + user 3       → assistant 3
```

Cutting 600 tokens from the first response saves 600 output tokens when it is generated. At the listed GPT-5.4 rates, that is $0.009. If the response remains in the next five model calls, it can also avoid up to 3,000 input tokens—another $0.0075 when billed as uncached input. Prompt caching may reduce that later monetary saving, but the context saving remains.

**That is the “save twice” effect: save once when generating the response, then save again whenever that response returns as input.** Concision also slows context growth.

Techniques such as [Caveman](https://github.com/JuliusBrussee/caveman) pursue this by removing filler, hedging, and grammatical overhead while preserving technical information. The same principle can be applied without adopting its terse style: ask for the answer first, omit repeated context, bound lists, and expand only on request.

## Coding agents add more than conversation

For coding agents, the practical model is:

```text
next context = persistent instructions
             + retained or summarized conversation
             + tool calls and results
             + selected repository content
             + the new request
```

Agents such as [Codex](https://openai.com/codex/), [OpenCode](https://opencode.ai/), and [Pi](https://pi.dev/) eventually prune or summarize older material rather than retain everything verbatim. Shorter responses still delay that compaction and leave more room for the current task. They do not enlarge the model's context window.

Assistant prose may also be a small part of an agent session. File reads, search results, diffs, compiler errors, test logs, tool schemas, and project instructions can dominate the context. The strongest approach combines concise responses with bounded tool output, small instruction files, retrieval of only relevant files, and periodic summarization.

## The trade-off

Compression is useful only while meaning survives. Over-compressed prose can hide assumptions, weaken explanations, and make collaboration harder. Project claims about token reduction are benchmarks, not guarantees; tokenization varies by model and text.

The goal is not the fewest words. It is the fewest tokens that preserve the information needed for the next decision.
