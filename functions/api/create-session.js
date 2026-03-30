export async function onRequest(context) {
  const { env, request } = context;
  
  // Default values if no body is sent (initial load)
  let countryCode = "SG";
  let currencyCode = "SGD";
  let baseAmount = 37970; // Base price in SGD (minor units)

  if (request.method === "POST") {
    const body = await request.json();
    countryCode = body.countryCode || "SG";
    currencyCode = body.currencyCode || "SGD";
  }

  // Simplified FX Logic (Replace with a live API call to an FX provider if needed)
  const fxRates = { "SGD": 1, "IDR": 11500, "AUD": 1.12, "USD": 0.74 };
  const convertedValue = Math.round(baseAmount * (fxRates[currencyCode] || 1));

  try {
    const response = await fetch("https://checkout-test.adyen.com/v71/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": env.ADYEN_API_KEY,
      },
      body: JSON.stringify({
        amount: { value: convertedValue, currency: currencyCode },
        reference: "GARUDA_LOCALIZED_TEST",
        merchantAccount: env.ADYEN_MERCHANT_ACCOUNT,
        returnUrl: "https://your-site.pages.dev",
        countryCode: countryCode,
        shopperLocale: countryCode === "ID" ? "id-ID" : "en-GB"
      }),
    });
    
    const data = await response.json();
    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
