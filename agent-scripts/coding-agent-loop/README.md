# Loop Engineering Coding Agent

A vendor-neutral operating contract for coding agents that need to inspect,
change, test, review, delegate, recover, and stop without losing user intent or
repository state.

The prompt is intentionally split into a compact shared constitution and
optional role overlays. The shared prompt defines authority, action modes,
safety, the engineering loop, verification, orchestration, worker limits,
capability routing, failure recovery, memory promotion, and terminal states.
The overlays make a specific agent narrower. They never grant more authority.

## Files

- [`SYSTEM_PROMPT.md`](SYSTEM_PROMPT.md): canonical complete prompt.
- [`roles/orchestrator.md`](roles/orchestrator.md): root control-plane overlay.
- [`roles/worker.md`](roles/worker.md): bounded maker or investigator overlay.
- [`roles/reviewer.md`](roles/reviewer.md): read-only finding and risk overlay.
- [`roles/verifier.md`](roles/verifier.md): evidence-only verification overlay.
- [`evals/cases.md`](evals/cases.md): regression cases and grading rubric.
- [`evals/check.sh`](evals/check.sh): deterministic structural contract check.

## Install

Use `SYSTEM_PROMPT.md` as the global coding-agent instruction, or copy the parts
your harness supports into its system-instruction field. Keep repository facts,
commands, and architecture in repository-local instructions so they load only
where relevant.

For multi-agent work, give every agent the shared prompt and exactly one role
overlay. The harness should also enforce workspace boundaries, network policy,
protected paths, approvals, and audit logging. A prompt cannot enforce its own
security guarantees.

Do not hard-code model names into the evergreen prompt. Configure routing in the
harness using measured capability profiles such as fast, balanced, and deep,
plus the available reasoning effort. Re-run the regression suite whenever the
prompt, model, tool interface, permissions, or harness changes.

## Evaluation status

The checked-in suite defines 16 regression scenarios and a 20-point rubric. The
deterministic structural check passes, and a separate read-only agent review
identified issues that were corrected. That correlated review is not independent
proof, and no behavioral trial results are recorded yet. This package does not
claim a statistically meaningful cross-model behavioral benchmark.
Run repeated trials in your target harness and record the exact prompt, model,
reasoning effort, tools, permissions, environment, transcripts, diffs, and final
state before treating it as production-qualified.

## Design basis

The package applies a consistent set of findings from current agent-harness and
software-agent work:

- Keep always-loaded instructions small and use progressive disclosure.
- Make repository knowledge legible, versioned, and mechanically checked.
- Treat tool design, permissions, and environment feedback as part of the agent,
  not as afterthoughts to the model prompt.
- Separate orchestration, implementation, review, and verification roles.
- Grade outcomes and trajectories with deterministic, model, and human evidence
  matched to the behavior.
- Carry explicit state across long-running sessions and leave clean checkpoints.
- Promote learnings through evidence and review rather than automatic memory.

Primary references include [OpenAI's harness engineering
report](https://openai.com/index/harness-engineering/), [Anthropic's context
engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents),
[long-running harness](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents),
and [agent evaluation](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
guidance, the [SWE-agent ACI
paper](https://proceedings.neurips.cc/paper_files/paper/2024/file/5a7c947568c1b1328ccc5230172e1e7c-Paper-Conference.pdf),
and the open-source [mini-SWE-agent](https://github.com/SWE-agent/mini-swe-agent),
[OpenHands](https://github.com/OpenHands/OpenHands), and
[Aider](https://aider.chat/docs/usage/modes.html) projects.

## License

Use and adapt this prompt with attribution. The repository license governs this
directory.
