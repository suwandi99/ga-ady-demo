async function initCheckout() {
    // Call your Cloudflare Function
    const response = await fetch('/api/create-session', { method: 'POST' });
    const session = await response.json();

    const checkout = await AdyenCheckout({
        environment: 'test',
        clientKey: 'your_adyen_client_key', // This is public-safe
        session: {
            id: session.id,
            sessionData: session.sessionData
        },
        onPaymentCompleted: (result) => {
            window.location.href = `/status?type=${result.resultCode}`;
        }
    });

    checkout.create('dropin').mount('#dropin-container');
}
initCheckout();
