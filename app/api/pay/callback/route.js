// apps/api/pay/callback/route.js  (Next.js App Router)
import crypto from "crypto";

export async function POST(req) {
  try {
    // NICE에서 보내주는 form-data 받기
    const form = await req.formData();
    const authResultCode = form.get("authResultCode");
    const tid      = form.get("tid");
    const amount   = form.get("amount");
    const orderId  = form.get("orderId");
    // goodsName은 폼에서 누락될 수 있으니 "승인 응답"에서 다시 받는다.

    const secret   = process.env.NICE_SECRET_BASE64; // e.g. base64(clientId:secretKey)
    const GAS_TOKEN_URL = process.env.GAS_TOKEN_URL;
// 🔴 여기에 1단계에서 만든 웹앱 URL 넣기

    // 인증 실패 시 바로 실패 페이지
    if (authResultCode !== "0000") {
      return Response.redirect("https://easysaju-test.vercel.app/payment-fail.html");
    }

    // 1) NICE 승인 API
    const approve = await fetch(`https://api.nicepay.co.kr/v1/payments/${tid}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${secret}`,
      },
      body: JSON.stringify({ amount }),
    });

    const result = await approve.json();

    // 2) 승인 성공 시 토큰 저장 + 리다이렉트
    if (result.resultCode === "0000") {
      const token = crypto.randomBytes(12).toString("base64url");

      // ✅ 승인 응답에서 확정 값 사용(상품명/금액/영수증URL 등)
      const payload = {
        mode: "saveToken",
        token,
        orderId,
        goodsName: result.goodsName || "상품명없음",
        amount: result.amount || amount || 0,
        payDate: result.paidAt || new Date().toISOString(),
        payStatus: "결제완료",
        receiptUrl: result.receiptUrl || "",
      };

      // GAS 토큰 서버에 JSON으로 저장
      await fetch(GAS_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // thankyou로 토큰 전달
      return Response.redirect(`https://easysaju-test.vercel.app/thankyou.html?token=${token}`);
      // 테스트 도메인이면 위 URL을 https://easysaju-test.vercel.app/thankyou.html?token=... 로 교체
    }

    // 승인 실패
    return Response.redirect("https://easysaju-test.vercel.app/thankyou.html/payment-fail.html");
  } catch (err) {
    console.error("callback error:", err);
    return Response.redirect("https://easysaju-test.vercel.app/payment-fail.html");
  }
}
