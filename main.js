let checkoutInstance = null;
let activeDropin = null;

window.initCheckout = async function(countryCode = 'SG', currencyCode = 'SGD', isManualChange = false) {
    const loader = document.getElementById('loading-overlay');
    const container = document.getElementById('dropin-container');
    const successOverlay = document.getElementById('success-overlay');
    
    // Check URL for redirect results
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');
    const redirectResult = urlParams.get('redirectResult');

    if (loader) loader.style.display = 'block';
    if (successOverlay) successOverlay.style.display = 'none';

    try {
        let sessionData;

        // If it's a manual country change, we IGNORE the URL parameters and force a new session
        if (sessionId && redirectResult && !isManualChange) {
            // CASE A: Shopper redirected back from Alipay/Redirect method
            sessionData = { id: sessionId };
        } else {
            // CASE B: Initial load or manual Country Selection change
            if (activeDropin) { 
                activeDropin.unmount(); 
                activeDropin = null; 
            }
            container.innerHTML = ''; 
            checkoutInstance = null;

            const response = await fetch('/api/create-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ countryCode, currencyCode })
            });
            
            if (!response.ok) throw new Error("Backend failed");
            sessionData = await response.json();
        }

        checkoutInstance = await AdyenCheckout({
            environment: 'test',
            clientKey: 'test_767VMJ3TGVG53LK5KUWJZSL5KAZWTIT6', 
            session: sessionData,
            onPaymentCompleted: (result) => {
                if (result.resultCode === 'Authorised' || result.resultCode === 'Pending') {
                    document.getElementById('success-overlay').style.display = 'block';
                    // Clean URL so refresh doesn't re-trigger success
                    window.history.replaceState({}, document.title, window.location.pathname);
                } else {
                    alert("Payment Status: " + result.resultCode);
                }
            },
            onError: (error) => console.error("Adyen Error:", error),
            locale: countryCode === 'ID' ? "id-ID" : "en-GB"
        });

        activeDropin = checkoutInstance.create('dropin', { showPayButton: false });
        activeDropin.mount('#dropin-container');

        document.getElementById('ga-continue-btn').onclick = () => activeDropin.submit();

        // Update UI Prices (Only update labels if we aren't resuming a redirect)
        if (!sessionId || isManualChange) {
            document.querySelectorAll('.currency').forEach(el => el.innerText = currencyCode);
            document.querySelectorAll('.total-amount').forEach(el => {
                const val = sessionData.amount.value / 100;
                el.innerText = val.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
            });
        }

        if (loader) loader.style.display = 'none';

    } catch (error) {
        console.error("Checkout Error:", error);
        container.innerHTML = `<p style="color:red; padding:20px;">Failed to load: ${error.message}</p>`;
        if (loader) loader.style.display = 'none';
    }
};

// Update the dropdown listener to pass the 'isManualChange' flag as true
const selector = document.getElementById('country-selector');
if (selector) {
    selector.onchange = (e) => {
        const opt = e.target.options[e.target.selectedIndex];
        const country = e.target.value;
        const currency = opt.getAttribute('data-currency');
        // The third parameter 'true' forces a fresh session
        window.initCheckout(country, currency, true);
    };
}
