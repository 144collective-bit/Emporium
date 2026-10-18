#!/usr/bin/env node
// PreToolUse guard: blocks any write, command or GitHub post that would put a
// confidential term (the unreleased token's name, ticker, contract address)
// into the repo, a commit message or a PR. The terms live in the
// CONFIDENTIAL_TERMS environment variable (comma-separated), never in this
// public repo. Unset, the guard does nothing.
const terms = (process.env.CONFIDENTIAL_TERMS ?? '')
  .split(',')
  .map((t) => t.trim().replace(/^\$/, ''))
  .filter(Boolean);
if (!terms.length) process.exit(0);

let raw = '';
for await (const chunk of process.stdin) raw += chunk;
const { tool_name: tool, tool_input: input = {} } = JSON.parse(raw);

// Only check what the tool would add, so removing a term is still allowed.
const added =
  tool === 'Write' ? input.content
  : tool === 'Edit' ? input.new_string
  : tool === 'MultiEdit' ? (input.edits ?? []).map((e) => e.new_string).join('\n')
  : tool === 'NotebookEdit' ? input.new_source
  : tool === 'Bash' ? input.command
  : JSON.stringify(input);

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hit = terms.find((t) =>
  new RegExp(`(^|[^a-z0-9])${escape(t)}($|[^a-z0-9])`, 'i').test(added ?? ''),
);
if (hit) {
  console.error(
    'Blocked: this would put a confidential token term into the public repo, a commit ' +
      'message or GitHub. Rephrase without it (e.g. "the token"). Do not work around this guard.',
  );
  process.exit(2);
}
