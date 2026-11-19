# Workshop backend

Flask API for the Workshop application, using Supabase for data storage.

## Deploy on Render

This folder includes a `render.yaml` Blueprint. When creating the Blueprint, use `backend/render.yaml` as the Blueprint file path. The service runs from `backend/`, installs `requirements.txt`, binds Gunicorn to Render's assigned port, and checks `/health`.

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

## Redeploy on Render

1. Commit and push the backend changes to the branch connected to Render.
2. In Render, open the `workshop-backend` service and choose **Manual Deploy → Deploy latest commit** (or wait for auto-deploy if enabled).
3. Confirm `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are set in the service's **Environment** settings. Do not upload `.env`; keep the values in Render's environment settings.
4. Wait for the deploy to finish, then open `https://<your-service>.onrender.com/health`. A healthy service returns `{"status":"ok"}`.

If the deploy fails, check the service's **Logs** for the first build or startup error. Missing Supabase environment variables prevent the app from starting; a failed health check usually means the service did not start or is not reachable on Render's assigned port.
