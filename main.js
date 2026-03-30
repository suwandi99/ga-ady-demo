let checkout; // Store checkout instance globally to destroy it later

window.initCheckout = async function(countryCode = 'SG', currencyCode = 'SGD') {
    // 1. Clear existing container if re-initializing
    const container = document.getElementById('dropin-container');
    container.innerHTML = 'Connecting to Garuda Secure Payment...';

    try {
        // 2. Pass selection to backend
        const response = await fetch('/api/create-session', {
            method: 'POST',
            body: JSON.stringify({ countryCode, currencyCode }),
            headers: { 'Content-Type': 'application/json' }
        });
        const sessionData = await response.json();

        // 3. Initialize Adyen
        checkout = await AdyenCheckout({
            environment: 'test',
            clientKey: 'test_767VMJ3TGVG53LK5KUWJZSL5KAZWTIT6',
            session: sessionData,
            onPaymentCompleted: (result) => alert(result.resultCode),
            locale: countryCode === 'ID' ? "id-ID" : "en-US"
        });

        checkout.create('dropin', { showPayButton: false }).mount('#dropin-container');

        // Update UI price labels
        document.querySelector('.currency').innerText = currencyCode;
        // The backend should return the converted amount to display here
        document.querySelector('.total-amount').innerText = (sessionData.amount.value / 100).toFixed(2);

    } catch (error) {
        console.error(error);
    }
};

// Add Listener for Dropdown Change
document.getElementById('country-selector').addEventListener('change', (e) => {
    const selectedOption = e.target.options[e.target.selectedIndex];
    const country = e.target.value;
    const currency = selectedOption.getAttribute('data-currency');
    
    // Re-trigger the session call
    window.initCheckout(country, currency);
});
