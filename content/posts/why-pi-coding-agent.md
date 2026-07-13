+++
date = '2026-07-12T18:00:00-07:00'
draft = false
title = 'Why I Keep Reaching for Pi'
description = 'Pi is a fast, minimal, and hackable coding-agent harness with unusually good conversation branching.'
tags = ['pi', 'coding-agents', 'cli', 'llm']
categories = ['agents']
toc = true
+++

I have been exploring coding-agent harnesses including [Codex](https://openai.com/codex/), [OpenCode](https://opencode.ai/), and [Pi](https://pi.dev/). A harness is the layer around the language model: it assembles context, exposes tools, runs the agent loop, stores sessions, and provides the interface through which I steer the work.

That distinction matters because the model is only one part of the experience. The same model can feel different when another harness gives it a larger system prompt, more tool definitions, or a different representation of conversation history.

Pi has earned a regular place in that rotation. Five qualities account for most of its appeal.

## It is hackable

Hackability is a deal breaker for me: if I cannot adapt a harness to my workflow, I will eventually outgrow it. Pi feels closer to Neovim than to an IDE suite because its defaults are useful without fixing its final shape.

Pi provides several extension layers:

- [Prompt templates](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/docs/prompt-templates.md) turn Markdown files into reusable slash commands, with arguments and defaults.
- [Skills](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/docs/skills.md) package task-specific instructions, scripts, and references that load on demand.
- [TypeScript extensions](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/docs/extensions.md) can add or replace tools, register commands and shortcuts, intercept lifecycle events, alter compaction, and build custom terminal UI.
- [Themes](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/docs/themes.md) customize the terminal interface without changing the core.
- [Pi packages](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/docs/packages.md) bundle extensions, skills, prompts, and themes for installation through npm or Git.

These layers let me choose the smallest mechanism that solves the problem instead of turning every customization into a plugin project.

This design keeps policy out of the core. Pi does not ship with built-in plan mode, sub-agents, permission prompts, or MCP integration; those features can be implemented or installed when a workflow needs them. The trade-off is explicit: Pi asks me to assemble some advanced workflows instead of choosing their behavior for me.

This is more than a preference. Hackability turns an awkward workflow into a changeable interface rather than a permanent constraint, which is why I consider it a requirement even when I never write an extension.

## `/tree` makes exploration reversible

Coding conversations rarely follow a straight line. A proposed fix can fail, a requirement can change, or an earlier answer can reveal a better direction.

Pi stores a session as a tree rather than flattening every turn into one transcript. `/tree` shows that structure, lets me jump to an earlier entry, and preserves the path I leave behind. Selecting an earlier user message restores it to the editor, where I can revise it and create another branch.

The visual selector makes branching approachable because I do not need to remember checkpoint names or manage several session files. I can try one approach, return to the decision point, and compare it with another while keeping both paths available.

Pi also provides `/fork` and `/clone` when branches should become separate session files. I use `/tree` for alternatives within one investigation and reserve separate sessions for work that should evolve independently.

## Sessions are easy to export and share

Agent sessions contain useful decisions, failed approaches, tool output, and the reasoning that connects a request to the resulting code. Pi makes that record easy to preserve or hand to someone else.

[`/export [file]`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/docs/usage.md#exporting-and-sharing-sessions) writes the session as a local HTML file that I can archive or open in a browser. `/share` exports the same HTML, uploads it through the authenticated GitHub CLI as a secret Gist, and returns a link that renders the session at `pi.dev`.

A secret Gist is unlisted, not private or access-controlled. Anyone with the URL can read it, so I treat `/share` as convenient publishing rather than secure sharing and review the session for source code, credentials, personal data, and other sensitive content first.

## The default context stays focused

Every harness adds material before the model sees my request: system instructions, tool schemas, project guidance, skill descriptions, conversation history, and tool results. That material consumes the same finite context window needed for the code and the current problem.

Pi starts with a compact feature set and loads full skill instructions only when needed. Its built-in tools also truncate large results, which limits one common source of accidental context growth. The footer exposes current context usage, so the cost remains visible during a session.

In my use so far, Pi sessions grow slowly enough that I rarely reach automatic compaction. That is valuable because compaction is necessarily lossy: it replaces older turns with a summary, even though the full session remains available through `/tree`.

A smaller context does not guarantee a better answer, and a required tool is worth its schema and output. The benefit is budget discipline: context is spent on the current task instead of integrations I am not using.

## It feels fast

Pi is consistently responsive in my day-to-day use, especially for quick questions, small edits, and iterative touch-ups. Its minimal startup and default integration surface remove setup and UI friction before useful work begins.

This is an observation, not a benchmark. Provider latency, model load, network conditions, prompt caching, reasoning level, and context size all affect response time. Pi cannot make a model intrinsically faster, but it can keep the path between my prompt and the model short.

That perceived speed changes my behavior. I open Pi for small tasks that would not justify waiting for a heavier environment, and those small interactions are a large part of how I use coding agents.

## Where Pi fits

Pi combines a small core with unusually accessible session branching, convenient HTML sharing, and a powerful extension boundary. I reach for it when I want quick iteration, focused context, or a harness I can reshape, while continuing to use other harnesses where they fit better.

## Further watching

These two videos helped me understand both the intent behind Pi and the enthusiasm it has generated.

<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;max-width:720px;">
  <figure style="margin:0;">
    <a href="https://www.youtube.com/watch?v=RjfbvDXpFls">
      <img src="https://i.ytimg.com/vi/RjfbvDXpFls/maxresdefault.jpg" alt="Thumbnail for Building pi in a World of Slop by Mario Zechner" loading="lazy" style="display:block;width:100%;height:auto;">
    </a>
    <figcaption style="font-size:0.9rem;margin-top:0.35rem;"><strong>From Pi's creator:</strong> <a href="https://www.youtube.com/watch?v=RjfbvDXpFls">Building pi in a World of Slop — Mario Zechner</a></figcaption>
  </figure>
  <figure style="margin:0;">
    <a href="https://www.youtube.com/watch?v=fdbXNWkpPMY">
      <img src="https://i.ytimg.com/vi/fdbXNWkpPMY/maxresdefault.jpg" alt="Thumbnail for A love letter to Pi by Lucas Meijer" loading="lazy" style="display:block;width:100%;height:auto;">
    </a>
    <figcaption style="font-size:0.9rem;margin-top:0.35rem;"><strong>A love letter to Pi:</strong> <a href="https://www.youtube.com/watch?v=fdbXNWkpPMY">Lucas Meijer</a></figcaption>
  </figure>
</div>
