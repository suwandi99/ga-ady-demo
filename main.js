// Track instances globally so we can clean them up
let checkoutInstance = null;

window.initCheckout = async function(countryCode = 'SG', currencyCode = 'SGD') {
    const loader = document.getElementById('loading-overlay');
    const container = document.getElementById('dropin-container');
    const successOverlay = document.getElementById('success-overlay');
    
    if (loader) loader.style.display = 'block';
    if (successOverlay) successOverlay.style.display = 'none';

    // 1. HARD RESET: Clear the container and the global instance
    container.innerHTML = '<p style="text-align:center;">Updating local payment methods...</p>';
    checkoutInstance = null;

    try {
        // 2. Fetch new session from your specific path
        const response = await fetch('/api/create-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ countryCode, currencyCode })
        });

        if (!response.ok) throw new Error("Backend failed to create session");
        const sessionData = await response.json();

        // 3. Initialize Adyen Checkout
        // Explicitly set the configuration for the new country/currency
        checkoutInstance = await AdyenCheckout({
            environment: 'test',
            clientKey: 'test_767VMJ3TGVG53LK5KUWJZSL5KAZWTIT6', 
            session: sessionData,
            onPaymentCompleted: (result) => {
                if (result.resultCode === 'Authorised' || result.resultCode === 'Pending') {
                    document.getElementById('success-overlay').style.display = 'block';
                } else {
                    alert("Payment Status: " + result.resultCode);
                }
            },
            onError: (error) => console.error("Adyen Error:", error),
            locale: countryCode === 'ID' ? "id-ID" : "en-GB",
            paymentMethodsConfiguration: {
                card: {
                    hasHolderName: true,
                    holderNameRequired: true
                }
            }
        });

        // 4. Mount the NEW Drop-in
        const dropin = checkoutInstance.create('dropin', {
            showPayButton: false 
        }).mount('#dropin-container');

        // 5. Re-link the Garuda Red Button
        document.getElementById('ga-continue-btn').onclick = () => dropin.submit();

        // 6. Force Update UI Price Labels
        document.querySelectorAll('.currency').forEach(el => el.innerText = currencyCode);
        document.querySelectorAll('.total-amount').forEach(el => {
            const numericValue = sessionData.amount.value / 100;
            el.innerText = numericValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        });

        if (loader) loader.style.display = 'none';

    } catch (error) {
        console.error("Initialization Error:", error);
        container.innerHTML = `<p style="color:red; text-align:center; padding:20px;">
            <strong>Checkout Error:</strong> ${error.message}</p>`;
        if (loader) loader.style.display = 'none';
    }
};

// Dropdown listener setup
const countrySelector = document.getElementById('country-selector');
if (countrySelector) {
    countrySelector.onchange = (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const country = e.target.value;
        const currency = selectedOption.getAttribute('data-currency');
        window.initCheckout(country, currency);
    };
}
