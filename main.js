// Keep the instance global to prevent multiple overlays
let currentCheckout = null;

window.initCheckout = async function(countryCode = 'SG', currencyCode = 'SGD') {
    const loader = document.getElementById('loading-overlay');
    const container = document.getElementById('dropin-container');
    const successOverlay = document.getElementById('success-overlay');
    
    // Show loader and clear container immediately
    if (loader) loader.style.display = 'block';
    if (successOverlay) successOverlay.style.display = 'none';
    
    // Completely wipe the container to force a fresh Adyen load
    container.innerHTML = '<p style="text-align:center;">Updating local payment methods...</p>';

    try {
        // 1. Fetch from your specific API path
        const response = await fetch('/api/create-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ countryCode, currencyCode })
        });

        if (!response.ok) throw new Error("Backend failed to create session");
        const sessionData = await response.json();

        // 2. Clear "Updating..." message before mounting new Adyen UI
        container.innerHTML = ''; 

        // 3. Initialize Adyen Checkout
        // We use a local variable to ensure we don't conflict with previous runs
        const checkout = await AdyenCheckout({
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
            locale: countryCode === 'ID' ? "id-ID" : "en-GB"
        });

        // 4. Create and mount Drop-in
        const dropin = checkout.create('dropin', {
            showPayButton: false 
        }).mount('#dropin-container');

        // 5. Update the Garuda Red Button Click Event
        document.getElementById('ga-continue-btn').onclick = (e) => {
            e.preventDefault();
            dropin.submit();
        };

        // 6. Update UI Price Labels
        document.querySelectorAll('.currency').forEach(el => el.innerText = currencyCode);
        document.querySelectorAll('.total-amount').forEach(el => {
            const val = sessionData.amount.value / 100;
            el.innerText = val.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        });

        if (loader) loader.style.display = 'none';

    } catch (error) {
        console.error("Initialization Error:", error);
        container.innerHTML = `<p style="color:red; text-align:center; padding:20px;">
            <strong>Error:</strong> ${error.message}<br>Check console for details.</p>`;
        if (loader) loader.style.display = 'none';
    }
};

// Setup the dropdown listener once
document.addEventListener('DOMContentLoaded', () => {
    const selector = document.getElementById('country-selector');
    if (selector) {
        selector.onchange = (e) => {
            const opt = e.target.options[e.target.selectedIndex];
            const country = e.target.value;
            const currency = opt.getAttribute('data-currency');
            window.initCheckout(country, currency);
        };
    }
});
