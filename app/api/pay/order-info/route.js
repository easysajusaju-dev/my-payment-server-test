// app/api/pay/order-info/route.js
import { NextResponse } from "next/server";
import crypto from "crypto";

// 토큰 검증
function verify(token) {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) throw new Error("BAD_TOKEN");
  const expect = crypto
    .createHmac("sha256", process.env.TOKEN_SECRET || "dev-secret")
    .update(body)
    .digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) {
    throw new Error("SIGN_MISMATCH");
  }
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (payload.exp && Date.now() > payload.exp) throw new Error("TOKEN_EXPIRED");
  return payload;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    if (!token) return NextResponse.json({ ok: false, error: "NO_TOKEN" }, { status: 400 });

    const payload = verify(token);
    // 필요 필드만 반환 (시작 토큰/영수증 토큰 모두 동작)
    return NextResponse.json({ ok: true, ...payload });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err.message || err) }, { status: 400 });
  }
}
