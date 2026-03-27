async function initCheckout() {
    try {
        // 1. Call your Cloudflare Function
        const response = await fetch('/api/create-session', { method: 'POST' });
        const sessionData = await response.json();

        // Check if the backend actually returned a valid session
        if (!sessionData.id || !sessionData.sessionData) {
            throw new Error("Invalid session response from backend. Check your API Key/Merchant Account.");
        }

        // 2. Initialize Adyen Checkout using the 'session' object
        const checkout = await AdyenCheckout({
            environment: 'test',
            clientKey: 'your_test_client_key...', // Double-check this is your CLIENT KEY, not API Key
            session: {
                id: sessionData.id,
                sessionData: sessionData.sessionData
            },
            onPaymentCompleted: (result, component) => {
                console.info(result);
                alert("Status: " + result.resultCode);
            },
            onError: (error, component) => {
                console.error(error.name, error.message);
            }
        });

        // 3. Create and mount the Drop-in
        const dropin = checkout.create('dropin').mount('#dropin-container');

    } catch (e) {
        console.error("Checkout Error:", e);
        alert("Frontend Error: " + e.message);
    }
}
