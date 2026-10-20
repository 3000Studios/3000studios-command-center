# Token guard for 3000Studios Command Center

Normal chat uses local Ollama, with no automatic paid OpenAI fallback. Paid OpenAI responses require `mode: "cloud"` in the /chat request.

This dependency-free guard:
- Reserves a conservative estimate before each paid text call; blocks requests past the local budget.
- Limits paid output tokens.
- Caches identical prompt responses for up to 60 seconds in memory.
- Reconciles reservations with returned OpenAI usage.
- Exposes per-app accounting at GET http://127.0.0.1:3410/token-usage.

Optional settings in C:\Documents2\global.env:

```dotenv
CLOUD_DAILY_TOKEN_LIMIT=5000
CLOUD_MONTHLY_TOKEN_LIMIT=50000
CLOUD_MAX_OUTPUT_TOKENS=350
CLOUD_CACHE_TTL_SECONDS=60
```

Set either token limit to 0 to block **all** paid text calls from this app. This is a token-count budget, not an exact dollar cap; it uses estimated tokens before execution and provider-reported usage after. Budget limits are per local machine and can be exceeded by estimate errors or other applications. Ledger: %USERPROFILE%\.3000studios\token-usage.json (no prompts or keys stored).

Other projects, paid voice generation, Muse, third-party coding agents, and ChatGPT subscription quotas are not affected by this guard. This is not an API-account-wide remaining-balance reader.

Run tests with `node --test token-guard.test.mjs`.

Microsoft LLMLingua is available separately at https://github.com/microsoft/LLMLingua for long document prompt compression; not installed by this change because this command center's prompts are short and instruction-sensitive.
