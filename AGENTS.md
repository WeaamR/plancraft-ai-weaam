<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- PlanCraft tables have RLS on with no public policies; all reads/writes go through validated server functions in src/lib/*.functions.ts using the service role — no auth yet, so the browser must never touch tables directly.
- n8n is triggered only from src/lib/generation.functions.ts via server env N8N_WEBHOOK_URL (+ optional N8N_WEBHOOK_SECRET); n8n writes project_plans and request status itself, the UI polls while status is processing.
