"use strict";

const SMARTKARGO_TRACK_URL = "https://omanair.smartkargo.com/FrmAWBTracking.aspx";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS,
    },
    body: JSON.stringify(body),
  };
}

function digitsOnly(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

function grabLabel(html, id) {
  const re = new RegExp('id="' + id + '"[^>]*>([^<]*)', "i");
  const match = String(html || "").match(re);
  return match ? String(match[1]).trim() : "";
}

function parseSmartKargoHtml(html) {
  const dest = grabLabel(html, "lblDestination").toUpperCase();
  const origin = grabLabel(html, "lblOrigin").toUpperCase();
  const pcs = grabLabel(html, "lblPcs").replace(/[^\d]/g, "");
  const wtMatch = grabLabel(html, "lblGrossWt").replace(/,/g, "").match(/[\d.]+/);
  const wtNum = wtMatch ? parseFloat(wtMatch[0]) : NaN;
  const weight = Number.isFinite(wtNum) ? String(Math.round(wtNum)) : "";
  return { dest, origin, pcs, weight };
}

function hasShipment(data) {
  return Boolean(data && (data.dest || data.origin || data.pcs || data.weight));
}

async function fetchSmartKargo(prefix, serial) {
  const url =
    SMARTKARGO_TRACK_URL +
    "?AWBPrefix=" +
    encodeURIComponent(prefix) +
    "&AWBno=" +
    encodeURIComponent(serial);
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; SATS-Labels/1.0; +https://lbit.netlify.app/)",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) {
    const err = new Error("smartkargo_http_" + res.status);
    err.status = res.status;
    throw err;
  }
  return res.text();
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }
  if (event.httpMethod && event.httpMethod !== "GET") {
    return json(405, { ok: false, error: "method_not_allowed" });
  }

  const params = event.queryStringParameters || {};
  const combined = digitsOnly(params.awb);
  const prefix = digitsOnly(params.AWBPrefix || params.prefix).slice(0, 3) || combined.slice(0, 3);
  const serial =
    digitsOnly(params.AWBno || params.AWBNumber || params.number).slice(0, 8) ||
    combined.slice(3);
  const awb = (prefix + serial).slice(0, 11);

  if (awb.length !== 11 || prefix.length !== 3) {
    return json(400, { ok: false, error: "invalid_awb" });
  }

  try {
    const html = await fetchSmartKargo(prefix, serial);
    const parsed = parseSmartKargoHtml(html);
    if (!hasShipment(parsed)) {
      return json(404, { ok: false, error: "not_found", awb: prefix + serial });
    }
    return json(200, {
      ok: true,
      awb: prefix + serial,
      prefix,
      dest: parsed.dest,
      origin: parsed.origin,
      pcs: parsed.pcs,
      weight: parsed.weight,
    });
  } catch (err) {
    return json(502, {
      ok: false,
      error: "track_failed",
      detail: err && err.message ? String(err.message) : "unknown",
    });
  }
};

exports.parseSmartKargoHtml = parseSmartKargoHtml;
