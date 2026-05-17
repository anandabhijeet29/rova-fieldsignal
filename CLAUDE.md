@AGENTS.md

## Security

Never read, cat, or access `.env.local`, `.env`, or any file containing API keys or secrets. If you need to verify environment variables are set, check for their existence only (e.g., `echo $NEXT_PUBLIC_SUPABASE_URL | wc -c`), never print their values.
