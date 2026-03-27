export async function onRequestPost(context) {
  const { env } = context;

  const response = await fetch("https://checkout-test.adyen.com/v71/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": env.ADYEN_API_KEY, // We will set this in Cloudflare dashboard
    },
    body: JSON.stringify({
      amount: { value: 150000000, currency: "IDR" }, // 1.5M IDR
      reference: `GARUDA_${Date.now()}`,
      returnUrl: "https://your-subdomain.pages.dev", 
      merchantAccount: env.ADYEN_MERCHANT_ACCOUNT,
      countryCode: "ID",
      shopperLocale: "id-ID"
    }),
  });

  const data = await response.json();
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}
