export async function onRequestPost(context) {
  const { env } = context;
  try {
    const response = await fetch("https://checkout-test.adyen.com/v71/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": env.ADYEN_API_KEY,
      },
      body: JSON.stringify({
        amount: { value: 100000000, currency: "IDR" }, // 1 Million IDR
        reference: "GARUDA_TEST_1",
        returnUrl: "https://google.com", // Temporary
        merchantAccount: env.ADYEN_MERCHANT_ACCOUNT,
        countryCode: "ID",
        shopperLocale: "id-ID"
      }),
    });
    const data = await response.json();
    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
