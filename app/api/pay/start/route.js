// app/api/pay/start/route.js
import { NextResponse } from "next/server";
import crypto from "crypto";

// 토큰 유틸
function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", process.env.TOKEN_SECRET || "dev-secret")
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

function verifyCategoryMatch(itemName, reqName) {
  // 이름으로 상품 매칭 (필요 시 id로 바꾸면 더 견고해짐)
  return String(itemName || "").trim() === String(reqName || "").trim();
}

export async function POST(req) {
  try {
    const { oid, goodsName } = await req.json(); // 폼에서 보낼 값
    if (!oid || !goodsName) {
      return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
    }

    // 1) 시트에서 상품 목록 불러와서 서버측 검증
    const url = process.env.PRODUCTS_URL;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error("PRODUCTS_FETCH_FAIL");
    const data = await r.json();
    if (!data.ok || !Array.isArray(data.items)) throw new Error("BAD_PRODUCTS_PAYLOAD");

    const found = data.items.find((it) => verifyCategoryMatch(it.name, goodsName));
    if (!found) return NextResponse.json({ ok: false, error: "PRODUCT_NOT_FOUND" }, { status: 404 });

    // 2) 금액은 **시트 값**으로 결정 (클라 값 무시)
    const amount = Number(String(found.price).replace(/,/g, "")) || 0;
    if (amount <= 0) return NextResponse.json({ ok: false, error: "INVALID_PRICE" }, { status: 400 });

    // 3) 서명 토큰 발급 (유효기간 30분)
    const payload = {
      oid,
      goodsName: found.name,
      amount,
      ts: Date.now(),
      exp: Date.now() + 30 * 60 * 1000,
    };
    const token = sign(payload);

    return NextResponse.json({ ok: true, token });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err.message || err) }, { status: 500 });
  }
}
