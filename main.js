let checkoutInstance = null;

window.initCheckout = async function(countryCode = 'SG', currencyCode = 'SGD') {
    const loader = document.getElementById('loading-overlay');
    const container = document.getElementById('dropin-container');
    const successOverlay = document.getElementById('success-overlay');
    
    if (loader) loader.style.display = 'block';
    if (successOverlay) successOverlay.style.display = 'none';

    // Force a complete reset of the Drop-in UI
    container.innerHTML = ''; 
    checkoutInstance = null;

    try {
        const response = await fetch('/api/create-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ countryCode, currencyCode })
        });

        if (!response.ok) throw new Error("Backend failed to create session");
        const sessionData = await response.json();

        // Initialize a brand new Adyen instance
        checkoutInstance = await AdyenCheckout({
            environment: 'test',
            clientKey: 'test_767VMJ3TGVG53LK5KUWJZSL5KAZWTIT6', 
            session: sessionData,
            onPaymentCompleted: (result) => {
                if (result.resultCode === 'Authorised' || result.resultCode === 'Pending') {
                    document.getElementById('success-overlay').style.display = 'block';
                }
            },
            locale: countryCode === 'ID' ? "id-ID" : "en-GB"
        });

        const dropin = checkoutInstance.create('dropin', {
            showPayButton: false 
        }).mount('#dropin-container');

        // Re-bind the external Garuda Red Button
        document.getElementById('ga-continue-btn').onclick = () => dropin.submit();

        // Aggressively update all price labels in the UI
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
        console.error("Checkout Error:", error);
        container.innerHTML = `<p style="color:red; padding:20px;">Failed to load: ${error.message}</p>`;
        if (loader) loader.style.display = 'none';
    }
};

// Dropdown listener for country change
const selector = document.getElementById('country-selector');
if (selector) {
    selector.onchange = (e) => {
        const opt = e.target.options[e.target.selectedIndex];
        window.initCheckout(e.target.value, opt.getAttribute('data-currency'));
    };
}
