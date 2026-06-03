import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-import-key",
  "Access-Control-Max-Age": "86400",
};

const COL_KEYS = [
  "col_1",
  "col_2",
  "col_3",
  "col_4",
  "col_5",
  "col_6",
  "col_7",
  "col_8",
  "col_9",
  "col_10",
] as const;

type RecordRow = Record<(typeof COL_KEYS)[number], string | null>;

function normalizeRow(raw: unknown): RecordRow | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const row: RecordRow = {
    col_1: null,
    col_2: null,
    col_3: null,
    col_4: null,
    col_5: null,
    col_6: null,
    col_7: null,
    col_8: null,
    col_9: null,
    col_10: null,
  };
  for (const key of COL_KEYS) {
    const v = obj[key];
    if (v === undefined || v === null || v === "") {
      row[key] = null;
    } else {
      row[key] = String(v);
    }
  }
  return row;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const importSecret = Deno.env.get("DATA_IMPORT_SECRET");
  if (importSecret) {
    const key = req.headers.get("X-Import-Key");
    if (key !== importSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { rows?: unknown; replace?: boolean };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return new Response(JSON.stringify({ error: "rows array required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (body.rows.length > 2000) {
    return new Response(JSON.stringify({ error: "Max 2000 rows per request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rows: RecordRow[] = [];
  for (const raw of body.rows) {
    const row = normalizeRow(raw);
    if (row) rows.push(row);
  }

  if (rows.length === 0) {
    return new Response(JSON.stringify({ error: "No valid rows" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  if (body.replace === true) {
    const { error: delError } = await supabase
      .from("dataset_records")
      .delete()
      .gte("id", 0);
    if (delError) {
      return new Response(JSON.stringify({ error: delError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const { error } = await supabase.from("dataset_records").insert(rows);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ ok: true, inserted: rows.length, replaced: body.replace === true }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
