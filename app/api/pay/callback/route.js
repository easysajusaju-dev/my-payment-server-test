// app/api/pay/callback/route.js
import crypto from "crypto";

// ✅ 암호화 유틸
function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", process.env.TOKEN_SECRET || "dev-secret")
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

export async function POST(req) {
  try {
    // ✅ NICEPAY form-data 받기
    const form = await req.formData();
    const authResultCode = form.get("authResultCode");
    const tid = form.get("tid");
    const amount = form.get("amount");
    const orderId = form.get("orderId");

    // ✅ 환경변수 세팅
    const secret = process.env.NICE_SECRET_BASE64;
    const GAS_TOKEN_URL = process.env.GAS_TOKEN_URL;     // TokenStore 기록용
    const LOGGER_WEBHOOK_URL = process.env.LOGGER_WEBHOOK_URL; // Logger.gs 업데이트용

    // ❌ 인증 실패 시
    if (authResultCode !== "0000") {
      return Response.redirect("https://easysaju-test.vercel.app/payment-fail.html");
    }

    // ✅ NICEPAY 승인 API 호출
    const approve = await fetch(`https://api.nicepay.co.kr/v1/payments/${tid}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${secret}`,
      },
      body: JSON.stringify({ amount }),
    });

    const result = await approve.json();

    // ✅ 승인 성공
    if (result.resultCode === "0000") {
      const payload = {
        mode: "saveToken",
        orderId,
        goodsName: result.goodsName || "상품명없음",
        amount: result.amount || amount || 0,
        payDate: result.paidAt || new Date().toISOString(),
        payStatus: "결제완료",
        receiptUrl: result.receiptUrl || "",
      };

      // 1️⃣ TokenStore 시트 기록
      await fetch(GAS_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // 2️⃣ Logger 시트 업데이트 (결제상태/결제일만)
      if (LOGGER_WEBHOOK_URL) {
        try {
          await fetch(LOGGER_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "updatePaymentStatus",
              orderId,
              payStatus: "결제완료",
              payDate: payload.payDate,
            }),
          });
        } catch (err) {
          console.error("⚠️ Logger 업데이트 실패:", err);
        }
      }

      // 3️⃣ thankyou.html로 전달할 토큰 생성
      const thankyouToken = sign(payload);

      // 4️⃣ 리디렉트
      return Response.redirect(
        `https://easysaju-test.vercel.app/thankyou.html?token=${thankyouToken}`
      );
    }

    // ❌ 승인 실패 시
    return Response.redirect("https://easysaju-test.vercel.app/payment-fail.html");

  } catch (err) {
    console.error("callback error:", err);
    return Response.redirect("https://easysaju-test.vercel.app/payment-fail.html");
  }
}
