export async function onRequest(context) {
  const { env, request } = context;
  
  // 1. Initialize Defaults
  let countryCode = "SG";
  let currencyCode = "SGD";
  const baseAmountSGD = 379.70; // The price from your screenshot

  // 2. Parse Incoming Selection
  if (request.method === "POST") {
    const body = await request.json();
    countryCode = body.countryCode || "SG";
    currencyCode = body.currencyCode || "SGD";
  }

  try {
    // 3. Fetch Live FX Rates (SGD as Base)
    // Free API Key-less endpoint for demo purposes
    const fxResponse = await fetch(`https://open.er-api.com/v6/latest/SGD`);
    const fxData = await fxResponse.json();
    
    // Get rate for selected currency, fallback to 1 if not found
    const rate = fxData.rates[currencyCode] || 1;
    const convertedAmount = baseAmountSGD * rate;

    // 4. Convert to Adyen Minor Units
    // Most currencies use 2 decimals (IDR uses 0, but Adyen handles this if currency is correct)
    const adyenValue = Math.round(convertedAmount * 100);

    // 5. Create Adyen Session
    const adyenResponse = await fetch("https://checkout-test.adyen.com/v71/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": env.ADYEN_API_KEY,
      },
      body: JSON.stringify({
        amount: { 
          value: adyenValue, 
          currency: currencyCode 
        },
        reference: `GARUDA_${countryCode}_${Date.now()}`,
        merchantAccount: env.ADYEN_MERCHANT_ACCOUNT,
        returnUrl: "https://ga-ady-demo.pages.dev",
        countryCode: countryCode,
        shopperLocale: countryCode === "ID" ? "id-ID" : "en-GB",
        // Optional: Ensure specific payment methods like GoPay show up for ID
        lineItems: [
          { quantity: 1, amountIncludingTax: adyenValue, description: "Flight Ticket" }
        ]
      }),
    });

    const data = await adyenResponse.json();
    
    // Return Adyen data + our calculated amount so the frontend UI can update the total
    return new Response(JSON.stringify(data), { 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
