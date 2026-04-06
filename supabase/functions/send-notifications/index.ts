/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const r = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) r[i] = b.charCodeAt(i);
  return r;
}

function concat(...bufs: Uint8Array[]): Uint8Array {
  const len = bufs.reduce((a, b) => a + b.length, 0);
  const r = new Uint8Array(len);
  let o = 0;
  for (const b of bufs) { r.set(b, o); o += b.length; }
  return r;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm.buffer as ArrayBuffer, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: salt.buffer as ArrayBuffer, info: info.buffer as ArrayBuffer }, key, len * 8);
  return new Uint8Array(bits);
}

async function encryptPayload(clientPubB64: string, clientAuthB64: string, payload: string): Promise<{ body: Uint8Array }> {
  const clientPub = b64urlDecode(clientPubB64);
  const clientAuth = b64urlDecode(clientAuthB64);
  const serverKP = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const serverPub = new Uint8Array(await crypto.subtle.exportKey("raw", serverKP.publicKey));
  const clientKey = await crypto.subtle.importKey("raw", clientPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: clientKey }, serverKP.privateKey, 256));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const ikmInfo = concat(enc.encode("WebPush: info\0"), clientPub, serverPub);
  const ikm = await hkdf(clientAuth, shared, ikmInfo, 32);
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const plain = concat(enc.encode(payload), new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, plain));
  const rs = new Uint8Array([0, 0, 16, 0]);
  const idlen = new Uint8Array([serverPub.length]);
  return { body: concat(salt, rs, idlen, serverPub, ct) };
}

async function vapidHeaders(endpoint: string, pubKey: string, privKey: string) {
  const url = new URL(endpoint);
  const aud = `${url.protocol}//${url.host}`;
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64url(new TextEncoder().encode(JSON.stringify({ aud, exp: now + 43200, sub: "mailto:nad341@live.fr" })));
  const unsigned = `${head}.${body}`;
  const pubBytes = b64urlDecode(pubKey);
  const privBytes = b64urlDecode(privKey);
  const jwk = { kty: "EC", crv: "P-256", x: b64url(pubBytes.slice(1, 33)), y: b64url(pubBytes.slice(33, 65)), d: b64url(privBytes) };
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(unsigned));
  return { authorization: `vapid t=${unsigned}.${b64url(sig)}, k=${pubKey}` };
}

async function sendPush(sub: { endpoint: string; p256dh: string; auth_key: string }, payload: string, pubKey: string, privKey: string) {
  try {
    const { body } = await encryptPayload(sub.p256dh, sub.auth_key, payload);
    const { authorization } = await vapidHeaders(sub.endpoint, pubKey, privKey);
    const res = await fetch(sub.endpoint, {
      method: "POST",
      headers: { Authorization: authorization, "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: "86400", Urgency: "high" },
      body,
    });
    const detail = await res.text().catch(() => "");
    return { ok: res.status >= 200 && res.status < 300, status: res.status, detail };
  } catch (err) {
    return { ok: false, status: 0, detail: String(err) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPub = "BNcZOsiXX15afLFeaV4ZS27i2cBzL5fY2XGfIR_T0QKdi3f4u9E085iD7C1OxEt0HJbbSjz8Dtpm4te6F2X6BYs";
    const vapidPriv = "I0jkPQD9oCJ2Geq46M-VCf8Ew_CqgnKosdk18O8A9NA";
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const now = new Date().toISOString();
    const { data: notifications, error } = await supabase.from("scheduled_notifications").select("*").eq("sent", false).neq("is_active", false).lte("scheduled_at", now);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    let sentCount = 0, failCount = 0;
    const expired: string[] = [];
    const errors: string[] = [];
    for (const notif of notifications || []) {
      const targetId = notif.recipient_user_id || notif.user_id;
      const { data: subs } = await supabase.from("push_subscriptions").select("*").eq("user_id", targetId);
      if (!subs || subs.length === 0) { await supabase.from("scheduled_notifications").update({ sent: true }).eq("id", notif.id); sentCount++; continue; }
      const payload = JSON.stringify({ title: notif.title, body: notif.body || "", url: notif.module ? `/${notif.module}` : "/", tag: `n-${notif.id.slice(0, 8)}`, badgeCount: 1 });
      let delivered = false;
      for (const sub of subs) {
        const r = await sendPush(sub, payload, vapidPub, vapidPriv);
        if (r.ok) delivered = true;
        else if (r.status === 404 || r.status === 410) expired.push(sub.endpoint);
        else errors.push(`${r.status}: ${r.detail.slice(0, 100)}`);
      }
      await supabase.from("scheduled_notifications").update({ sent: true }).eq("id", notif.id);
      if (delivered) sentCount++; else failCount++;
    }
    for (const ep of expired) await supabase.from("push_subscriptions").delete().eq("endpoint", ep);
    return new Response(JSON.stringify({ success: true, sent: sentCount, failed: failCount, expiredCleaned: expired.length, errors: errors.slice(0, 5) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
