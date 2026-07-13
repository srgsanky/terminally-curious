+++
date = '2026-07-12T17:25:13-07:00'
draft = true
title = 'LLM Gotchas'
description = 'A growing collection of recurring LLM writing problems and prompts for correcting them.'
tags = ['llm', 'prompting', 'writing']
categories = ['agents']
toc = true
+++

LLMs produce recurring patterns that can weaken otherwise useful output. Once recognized, many of these patterns can be addressed with targeted instructions.

This is a living collection of those gotchas. Each entry describes the problem, offers a reusable prompt, and ends with a rule of thumb for reviewing the result.

### Gotcha: Prompt-dependent contrastive reframing

**Problem:** LLMs often use constructions such as “The problem is not X but Y,” introducing an assumption only to reject it. The wording may fit the original prompt but feels ungrounded in standalone text because the reader was never given a reason to believe X.

**Prompt:**

> Write for a reader who has not seen the original prompt. State claims directly and positively. Do not introduce an alternative position merely to reject it. Avoid “not X but Y,” “less X and more Y,” and similar contrastive reframing unless both alternatives have already been established and the contrast is necessary. During revision, rewrite negation-first claims as concrete, standalone statements.

**Rule of thumb:** Do not rebut an assumption the text has not introduced.
