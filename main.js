async function initCheckout() {
    console.log("Starting Garuda Indonesia Checkout...");
    try {
        const response = await fetch('/api/create-session', { method: 'POST' });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server responded with ${response.status}: ${errorText}`);
        }

        const sessionData = await response.json();
        console.log("Session created successfully:", sessionData.id);

        const checkout = await AdyenCheckout({
            environment: 'test',
            clientKey: 'test_767VMJ3TGVG53LK5KUWJZSL5KAZWTIT6', // MUST start with "test_"
            session: {
                id: sessionData.id,
                sessionData: sessionData.sessionData
            },
            onPaymentCompleted: (result) => alert("Booking Status: " + result.resultCode),
            onError: (error) => console.error("Adyen SDK Error:", error)
        });

        checkout.create('dropin').mount('#dropin-container');
        console.log("Drop-in mounted!");

    } catch (e) {
        console.error("Critical Failure:", e);
        document.getElementById('dropin-container').innerHTML = 
            `<div style="color:red; padding:20px;">
                <strong>Demo Error:</strong> ${e.message}<br>
                Check the Browser Console (F12) for details.
            </div>`;
    }
}
