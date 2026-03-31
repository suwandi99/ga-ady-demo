// functions/api/webhook.js

export async function onRequestPost(context) {
  const { request } = context;

  try {
    // We just parse the JSON and immediately return [accepted]
    // This will bypass the 401 and give Adyen the "Success" it wants
    const body = await request.json();
    console.log("Payload received:", body);

    return new Response("[accepted]", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (err) {
    return new Response("Error", { status: 400 });
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
