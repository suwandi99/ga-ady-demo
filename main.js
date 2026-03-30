let checkoutInstance; // Global variable to track the current session

window.initCheckout = async function(countryCode = 'SG', currencyCode = 'SGD') {
    const loader = document.getElementById('loading-overlay');
    const container = document.getElementById('dropin-container');
    
    if (loader) loader.style.display = 'block';
    container.innerHTML = ''; // Clear the container for the new load

    try {
        // Fetch session from your Cloudflare Function
        const response = await fetch('/api/create-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ countryCode, currencyCode })
        });

        if (!response.ok) throw new Error("Backend failed to create session");

        const sessionData = await response.json();

        // Initialize Adyen Checkout
        checkoutInstance = await AdyenCheckout({
            environment: 'test',
            clientKey: 'test_767VMJ3TGVG53LK5KUWJZSL5KAZWTIT6', // Ensure this is your CLIENT KEY
            session: sessionData,
            onPaymentCompleted: (result) => {
                if (result.resultCode === 'Authorised') {
                    document.getElementById('success-overlay').style.display = 'block';
                }
            },
            locale: countryCode === 'ID' ? "id-ID" : "en-GB"
        });

        // Create and Mount Drop-in
        const dropin = checkoutInstance.create('dropin', {
            showPayButton: false // We use the Garuda Red button instead
        }).mount('#dropin-container');

        // Link the Garuda Red Button to the new dropin instance
        document.getElementById('ga-continue-btn').onclick = () => dropin.submit();

        // Update UI Price
        document.querySelector('.price-total-amount').innerText = 
            `${currencyCode} ${(sessionData.amount.value / 100).toLocaleString()}`;

        if (loader) loader.style.display = 'none';

    } catch (error) {
        console.error("Initialization Error:", error);
        container.innerHTML = `<p style="color:red; text-align:center;">Error: ${error.message}</p>`;
        if (loader) loader.style.display = 'none';
    }
};
