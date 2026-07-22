# 3000Studios Command Center

Local-first, open-source desktop command center for the 3000Studios portfolio.

## What it does

- Uses Ollama + `qwen3:4b` for fast, zero-per-request local routing when available.
- Falls back to the configured OpenAI Responses API for tasks that need a cloud model.
- Uses OpenAI natural speech for the host voice; no browser robot voice is used.
- Dispatches OpenCode or Grok in a chosen canonical workspace.
- Enforces a visible truth policy: production is never called live without a visual production check.

## Run

1. Keep secrets in `C:\Documents2\global.env`.
2. Install Ollama, then run `ollama pull qwen3:4b`.
3. Open `3000Studios Boss` from the Windows desktop.

The service listens only on `http://localhost:3410`.

## Safety

The app does not expose secrets to the browser. Approval is still required for publishing, credentials, billing, deletion, payments, customer data, and domain changes.
