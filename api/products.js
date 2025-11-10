// api/products.js
export default async function handler(req, res) {
  // ✅ CORS 허용
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const url = process.env.PRODUCTS_URL 
      || 'https://script.google.com/macros/s/AKfycbzhi4556hgBKctN3KVBlPdkl1vFD3oG7Wv7Hdm6pk16VGG8OF6q6EaPT8t_5WTX87Jb/exec';

    const r = await fetch(url, { method: 'GET', cache: 'no-store' });
    if (!r.ok) throw new Error(`Apps Script error: ${r.status}`);

    const data = await r.json();
    if (!data.ok) throw new Error(data.error || 'products fetch failed');

    let items = Array.isArray(data.items) ? data.items : [];

    // ✅ URL 파라미터에서 category 읽기
    const category = req.query.category;
    if (category) {
      items = items.filter(it => String(it.category).trim() === String(category).trim());
    }

    return res.status(200).json({ ok: true, items });
  } catch (err) {
    console.error("❌ products error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
