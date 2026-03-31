// functions/api/webhook.js

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // 1. Get the raw body (required for HMAC validation)
    const body = await request.json();
    
    // Adyen sends an array of notification items
    const notificationItems = body.notificationItems;
    if (!notificationItems || notificationItems.length === 0) {
      return new Response("No items", { status: 400 });
    }

    for (const item of notificationItems) {
      const notification = item.NotificationRequestItem;

      // 2. Validate HMAC Signature
      // In a real app, you MUST validate the HMAC to ensure the request came from Adyen.
      // For Cloudflare, you can use a helper function (see Step 2 below).
      const isValid = await validateHmac(notification, env.ADYEN_HMAC_KEY);

      if (!isValid) {
        console.error("Invalid HMAC signature");
        return new Response("Unauthorized", { status: 401 });
      }

      // 3. Process the event
      console.log(`Received event: ${notification.eventCode} for ${notification.pspReference}`);
      
      if (notification.eventCode === "AUTHORISATION" && notification.success === "true") {
        // Handle successful payment here (e.g., update your DB, send email)
        // Note: Use env.DB or env.KV if you have a database bound to Cloudflare
      }
    }

    // 4. IMPORTANT: Adyen requires the exact string "[accepted]" to acknowledge receipt
    return new Response("[accepted]", { 
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });

  } catch (err) {
    console.error("Webhook Error:", err);
    return new Response("Internal Error", { status: 500 });
  }
}

/**
 * Helper to validate Adyen HMAC Signature in Cloudflare Workers environment
 */
async function validateHmac(notification, hmacKey) {
  // Adyen HMAC is calculated by concatenating specific fields:
  // pspReference + eventCode + paymentMethod + amount.currency + amount.value + merchantReference + merchantAccount
  const data = 
    notification.pspReference +
    notification.eventCode +
    notification.paymentMethod +
    notification.amount.currency +
    notification.amount.value +
    notification.merchantReference +
    notification.merchantAccount;

  // Conversion of hex HMAC key to byte array
  const keyBuffer = Uint8Array.from(hmacKey.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  const dataBuffer = new TextEncoder().encode(data);

  const key = await crypto.subtle.importKey(
    "raw", keyBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
  );

  // The signature sent by Adyen is in notification.additionalData.hmacSignature
  const signatureHex = notification.additionalData?.hmacSignature;
  if (!signatureHex) return false;
  
  const signatureBuffer = Uint8Array.from(signatureHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

  return await crypto.subtle.verify("HMAC", key, signatureBuffer, dataBuffer);
}
