async function initCheckout() {
    try {
        const response = await fetch('/api/create-session', { method: 'POST' });
        const session = await response.json();

        if (session.error || !session.id) {
            alert("Backend Error: " + (session.error || "No Session ID"));
            return;
        }

        const checkout = await AdyenCheckout({
            environment: 'test',
            clientKey: 'your_client_key_here', // Double check this!
            session: session,
            onPaymentCompleted: (result) => alert(result.resultCode)
        });

        checkout.create('dropin').mount('#dropin-container');
    } catch (e) {
        alert("Frontend Error: " + e.message);
    }
}
initCheckout();
