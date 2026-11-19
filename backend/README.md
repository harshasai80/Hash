# Workshop backend

Flask API for the Workshop application, using Supabase for data storage.

## Deploy on Render

This folder includes a `render.yaml` Blueprint. Connect the repository to Render and create a Blueprint; Render will install `requirements.txt`, start the API with Gunicorn, and check `/health`.

Set these environment variables in the Render service settings:

- `SUPABASE_URL`: the Supabase project URL
- `SUPABASE_PUBLISHABLE_KEY`: the project's publishable (formerly `anon`) key

The same variables are needed for local development. Copy `.env.example` to `.env` and enter the project values. Install and run locally with:

```sh
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
gunicorn app:app
```

The API is served on Render's assigned port. The health endpoint is `GET /health`.
