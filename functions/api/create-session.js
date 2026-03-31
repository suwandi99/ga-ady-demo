export async function onRequest(context) {
  const { env, request } = context;
  
  let countryCode = "SG";
  let currencyCode = "SGD";
  const baseAmountSGD = 379.70;

  if (request.method === "POST") {
    const body = await request.json();
    countryCode = body.countryCode || "SG";
    currencyCode = body.currencyCode || "SGD";
  }

  try {
    const fxResponse = await fetch(`https://open.er-api.com/v6/latest/SGD`);
    const fxData = await fxResponse.json();
    const rate = fxData.rates[currencyCode] || 1;
    const adyenValue = Math.round(baseAmountSGD * rate * 100);

    const adyenResponse = await fetch("https://checkout-test.adyen.com/v71/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": env.ADYEN_API_KEY,
      },
      // Inside your create-session.js
body: JSON.stringify({
    amount: { value: adyenValue, currency: currencyCode },
    reference: `GARUDA_${countryCode}_${Date.now()}`,
    merchantAccount: env.ADYEN_MERCHANT_ACCOUNT,
    returnUrl: "https://ga-ady-demo.pages.dev",
    countryCode: countryCode,
    shopperLocale: countryCode === "ID" ? "id-ID" : "en-GB",
    // GRABPAY REQUIREMENT: Add shopper data for risk checks
    shopperEmail: "shopper@example.com",
    shopperReference: "USER_12345",
    deliveryAddress: {
        city: "Singapore",
        country: countryCode,
        houseNumberOrName: "1",
        postalCode: "018989",
        street: "Marina Boulevard"
    },
    lineItems: [
        {
            quantity: 1,
            amountExcludingTax: adyenValue,
            taxAmount: 0,
            amountIncludingTax: adyenValue,
            description: "Garuda Indonesia Flight Ticket",
            id: "item1"
        }
    ]
}),
    });

    const data = await adyenResponse.json();
    
    // Return only the JSON object from Adyen
    return new Response(JSON.stringify(data), { 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
