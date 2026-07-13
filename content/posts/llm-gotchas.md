+++
date = '2026-07-12T17:25:13-07:00'
draft = false
title = 'LLM Writing Gotchas'
description = 'Recurring LLM writing problems, with prompts for correcting them.'
tags = ['llm', 'prompting', 'writing']
categories = ['agents']
toc = true
+++

LLMs often fall into recurring writing patterns. This living collection identifies them and provides reusable correction prompts and review rules.

## Prompt-dependent contrastive reframing

**Problem:** LLMs often write “The problem is not X but Y” even when the text never established X. The contrast may answer the original prompt, but standalone readers encounter an unsupported assumption.

**Prompt:**

> Write for readers who have not seen the original prompt. State claims directly and positively. Do not introduce a position only to reject it. Avoid “not X but Y,” “less X and more Y,” and similar contrasts unless the text has established both alternatives and the contrast clarifies the claim. Rewrite negation-first claims as concrete, standalone statements.

**Rule of thumb:** Do not rebut an assumption the text has not introduced.
