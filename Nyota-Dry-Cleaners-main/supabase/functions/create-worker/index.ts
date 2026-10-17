// supabase/functions/create-worker/index.ts
//
// Deploy with: supabase functions deploy create-worker
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically by
// Supabase for every deployed Edge Function — no manual `supabase secrets
// set` needed for those two.
//
// This is the ONLY place the service_role key should ever be used. It lets
// an authenticated admin create a real Supabase Auth user (with a securely
// hashed password) plus the matching `profiles` row, or reset an existing
// worker's password to a new temporary one — all without ever exposing
// that key to the browser.
//
// Two actions, selected by an `action` field in the request body:
//   { action: "create", full_name, email, phone, role, temp_password }
//   { action: "reset_password", worker_id, temp_password }
// Omitting `action` defaults to "create" for backward compatibility.

import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Browsers send a CORS preflight (an OPTIONS request) before the real POST
// whenever a fetch crosses origins — which calling this function from the
// deployed site always does, since the function lives on a different host
// (*.supabase.co) than the site itself. Without these headers, the browser
// blocks the request before it ever reaches the code below and reports it
// to JavaScript simply as "Failed to fetch" — no other detail. This is the
// single most common cause of that exact message with Supabase functions.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return json({ error: "Missing authorization" }, 401);

    // Client scoped to the caller's own JWT — used only to verify who is calling.
    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await callerClient.auth.getUser(jwt);
    if (userErr || !user) return json({ error: "Not authenticated" }, 401);

    // Confirm the caller is an admin before doing anything privileged.
    const { data: callerProfile } = await callerClient.from("profiles").select("role, full_name").eq("id", user.id).single();
    if (!callerProfile || callerProfile.role !== "admin") {
      return json({ error: "Only admins can manage staff accounts" }, 403);
    }

    const body = await req.json();
    const action = body.action || "create";
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    if (action === "reset_password") {
      const { worker_id, temp_password } = body;
      if (!worker_id || !temp_password || temp_password.length < 8) {
        return json({ error: "worker_id and a temp_password of at least 8 characters are required" }, 400);
      }
      const { error: resetErr } = await adminClient.auth.admin.updateUserById(worker_id, { password: temp_password });
      if (resetErr) return json({ error: resetErr.message }, 400);

      await adminClient.from("activity_logs").insert({
        actor_id: user.id, actor_label: callerProfile.full_name || "admin",
        action: "worker_password_reset", target_table: "profiles", target_id: worker_id,
      });
      return json({ ok: true });
    }

    // action === "create"
    const { full_name, email, phone, role, temp_password } = body;
    if (!full_name || !email || !role || !temp_password) {
      return json({ error: "full_name, email, role and temp_password are required" }, 400);
    }
    if (!["manager", "worker"].includes(role)) {
      return json({ error: "role must be 'manager' or 'worker'" }, 400);
    }

    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password: temp_password, // Supabase hashes this; never stored in plaintext anywhere.
      email_confirm: true,
    });
    if (createErr) return json({ error: createErr.message }, 400);

    const { error: profileErr } = await adminClient.from("profiles").insert({
      id: created.user.id,
      full_name,
      phone: phone || null,
      role,
      is_active: true,
    });
    if (profileErr) return json({ error: profileErr.message }, 400);

    await adminClient.from("activity_logs").insert({
      actor_id: user.id,
      actor_label: callerProfile.full_name || "admin",
      action: "worker_created",
      target_table: "profiles",
      target_id: created.user.id,
    });

    return json({ ok: true, userId: created.user.id });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}

