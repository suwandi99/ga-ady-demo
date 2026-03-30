window.initCheckout = async function() {
    try {
        const response = await fetch('/api/create-session'); // Your Cloudflare function
        const sessionData = await response.json();

        const checkout = await AdyenCheckout({
            environment: 'test',
            clientKey: 'test_767VMJ3TGVG53LK5KUWJZSL5KAZWTIT6', // Your Client Key
            session: {
                id: sessionData.id,
                sessionData: sessionData.sessionData
            },
            onPaymentCompleted: (result) => {
                if (result.resultCode === 'Authorised') {
                    window.location.href = "/success"; 
                }
            },
            // Branding to match Garuda Blue
            theme: "dark" 
        });

        const dropin = checkout.create('dropin', {
            // Hide the internal Adyen "Pay" button so we use Garuda's red one
            showPayButton: false 
        }).mount('#dropin-container');

        // Link Garuda's Red Button to Adyen's Submission [cite: 604]
        document.getElementById('ga-continue-btn').addEventListener('click', () => {
            dropin.submit();
        });

    } catch (error) {
        console.error("Checkout Error:", error);
    }
}
