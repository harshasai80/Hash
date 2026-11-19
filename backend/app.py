import os
from uuid import UUID

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template_string, request
from postgrest import APIError
from supabase import Client, create_client

load_dotenv()

app = Flask(__name__)

supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_PUBLISHABLE_KEY")
if not supabase_url or not supabase_key:
    raise RuntimeError("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set")

supabase: Client = create_client(supabase_url, supabase_key)


@app.get("/")
def home():
    return render_template_string("""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#171327">
  <title>Campus Events API</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #211d31; background: #f8f7fc; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 56px 24px; }
    main { width: min(100%, 1000px); margin: 0 auto; }
    .eyebrow { color: #6e55bd; font-size: .76rem; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; }
    h1 { margin: 12px 0 10px; font-size: clamp(2rem, 5vw, 3.35rem); letter-spacing: -.055em; }
    .intro { margin: 0 0 30px; color: #696579; line-height: 1.6; }
    .table-wrap { overflow-x: auto; border: 1px solid #e9e5f1; border-radius: 16px; background: white; box-shadow: 0 14px 40px #2920440b; }
    table { width: 100%; border-collapse: collapse; min-width: 620px; }
    th, td { padding: 18px 20px; text-align: left; border-bottom: 1px solid #eeeaf4; }
    th { background: #eee8fb; color: #39314d; font-size: .83rem; letter-spacing: .04em; }
    tr:last-child td { border-bottom: 0; }
    .method { color: #6141ac; font-weight: 800; }
    code { color: #d65e22; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .95rem; font-weight: 700; }
    td:last-child { color: #5d596b; }
    footer { margin-top: 20px; color: #817d8e; font-size: .85rem; }
    footer a { color: #6141ac; text-decoration: none; font-weight: 700; }
    footer a:hover { text-decoration: underline; }
    @media (max-width: 600px) { body { padding: 36px 16px; } th, td { padding: 15px 14px; } }
  </style>
</head>
<body>
  <main>
    <div class="eyebrow">Campus · Developer reference</div>
    <h1>Events API</h1>
    <p class="intro">Browse campus events and manage event registrations with these endpoints.</p>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Method</th><th>Endpoint</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td class="method">GET</td><td><code>/api/events</code></td><td>Browse events.</td></tr>
          <tr><td class="method">GET</td><td><code>/api/events/{id}</code></td><td>Event details.</td></tr>
          <tr><td class="method">POST</td><td><code>/api/registrations</code></td><td>Create registration, 201 or 409.</td></tr>
          <tr><td class="method">GET</td><td><code>/api/me/registrations</code></td><td>Current user’s registrations.</td></tr>
          <tr><td class="method">GET</td><td><code>/api/events/{id}/registrations</code></td><td>Attendee list, owning organizer only.</td></tr>
        </tbody>
      </table>
    </div>
    <footer>Service status: <a href="/health">check API health</a>.</footer>
  </main>
</body>
</html>""")


@app.get("/health")
def health_check():
    return jsonify({"status": "ok"})


@app.after_request
def enable_open_cors(response):
    # Open CORS as requested. This does not provide identity or access control.
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response


def json_error(message, status):
    return jsonify({"error": message}), status


def valid_uuid(value):
    try:
        return str(UUID(str(value)))
    except (TypeError, ValueError, AttributeError):
        return None


def database_error(error):
    app.logger.exception("Supabase request failed: %s", error)
    return json_error("Database request failed", 500)


@app.get("/api/events")
def list_events():
    try:
        query = supabase.table("events").select("*")
        status = request.args.get("status")
        if status:
            query = query.eq("status", status)
        result = query.execute()
        return jsonify(result.data)
    except APIError as error:
        return database_error(error)


@app.get("/api/events/<event_id>")
def get_event(event_id):
    event_id = valid_uuid(event_id)
    if not event_id:
        return json_error("event_id must be a UUID", 400)
    try:
        result = supabase.table("events").select("*").eq("id", event_id).limit(1).execute()
        if not result.data:
            return json_error("Event not found", 404)
        return jsonify(result.data[0])
    except APIError as error:
        return database_error(error)


@app.post("/api/registrations")
def create_registration():
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return json_error("Request body must be a JSON object", 400)

    event_id = valid_uuid(body.get("event_id"))
    user_id = valid_uuid(body.get("user_id"))
    if not event_id or not user_id:
        return json_error("event_id and user_id are required UUIDs", 400)

    try:
        event_result = supabase.table("events").select("id,capacity,status").eq("id", event_id).limit(1).execute()
        if not event_result.data:
            return json_error("Event not found", 404)
        event = event_result.data[0]

        user_result = supabase.table("users").select("id").eq("id", user_id).limit(1).execute()
        if not user_result.data:
            return json_error("User not found", 404)

        existing = supabase.table("registrations").select("id").eq("event_id", event_id).eq("user_id", user_id).limit(1).execute()
        if existing.data:
            return jsonify({"error": "User is already registered for this event"}), 409

        if event.get("status", "").lower() not in ("open", "published", "active"):
            return json_error("Event is not open for registration", 409)

        registrations = supabase.table("registrations").select("id").eq("event_id", event_id).execute()
        capacity = event.get("capacity")
        if capacity is not None and len(registrations.data) >= capacity:
            return json_error("Event has reached capacity", 409)

        created = supabase.table("registrations").insert({"event_id": event_id, "user_id": user_id}).execute()
        return jsonify(created.data[0]), 201
    except APIError as error:
        # A concurrent duplicate insert may be rejected by a database unique constraint.
        if getattr(error, "code", None) == "23505":
            return json_error("User is already registered for this event", 409)
        return database_error(error)


@app.get("/api/me/registrations")
def my_registrations():
    # Without authentication, this is the caller-claimed user ID and can be spoofed.
    user_id = valid_uuid(request.args.get("user_id"))
    if not user_id:
        return json_error("user_id query parameter must be a UUID", 400)
    try:
        result = supabase.table("registrations").select("*").eq("user_id", user_id).execute()
        return jsonify(result.data)
    except APIError as error:
        return database_error(error)


@app.get("/api/events/<event_id>/registrations")
def event_registrations(event_id):
    # This comparison only verifies a caller-supplied claim; it is not secure
    # organizer authentication or authorization.
    event_id = valid_uuid(event_id)
    organizer_id = valid_uuid(request.args.get("organizer_id"))
    if not event_id or not organizer_id:
        return json_error("event_id and organizer_id must be UUIDs", 400)
    try:
        event_result = supabase.table("events").select("id,organizer_id").eq("id", event_id).limit(1).execute()
        if not event_result.data:
            return json_error("Event not found", 404)
        if event_result.data[0].get("organizer_id") != organizer_id:
            return json_error("Organizer does not own this event", 403)

        result = supabase.table("registrations").select("*").eq("event_id", event_id).execute()
        return jsonify(result.data)
    except APIError as error:
        return database_error(error)


@app.route("/api/<path:path>", methods=["OPTIONS"])
def api_preflight(path):
    return "", 204


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "5000")), debug=False)
