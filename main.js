let checkoutInstance = null;
let activeDropin = null;

window.initCheckout = async function(countryCode = 'SG', currencyCode = 'SGD', isManualChange = false) {
    const loader = document.getElementById('loading-overlay');
    const container = document.getElementById('dropin-container');
    const successOverlay = document.getElementById('success-overlay');
    
    // 1. Detect if we are returning from a redirect (e.g., Alipay)
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');
    const redirectResult = urlParams.get('redirectResult');

    if (loader) loader.style.display = 'block';
    if (successOverlay) successOverlay.style.display = 'none';

    try {
        let sessionData;

        // 2. Determine if we resume a session or start a new one
        if (sessionId && !isManualChange) {
            // Shopper redirected back; use existing session ID to finalize results
            sessionData = { id: sessionId };
        } else {
            // New session needed (initial load or manual country switch)
            // Properly unmount previous secure fields to prevent "load count" errors
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
            
            if (!response.ok) throw new Error("Backend failed to create session");
            sessionData = await response.json();
        }

        // 3. Initialize Adyen Checkout with your specific clientKey
        checkoutInstance = await AdyenCheckout({
            environment: 'test',
            clientKey: 'test_767VMJ3TGVG53LK5KUWJZSL5KAZWTIT6', 
            session: sessionData,
            onPaymentCompleted: (result) => {
                console.log("Payment Result:", result.resultCode);
                // Authorized or Pending status triggers the success screen
                if (result.resultCode === 'Authorised' || result.resultCode === 'Pending') {
                    if (successOverlay) successOverlay.style.display = 'block';
                    // Clear redirect parameters from the URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                } else if (result.resultCode === 'Refused') {
                    alert("Payment Refused. Please try another payment method.");
                }
            },
            onError: (error) => console.error("Adyen Error:", error),
            locale: countryCode === 'ID' ? "id-ID" : "en-GB"
        });

        // 4. Create and mount Drop-in
        activeDropin = checkoutInstance.create('dropin', { showPayButton: false });
        activeDropin.mount('#dropin-container');

        // Link the Garuda Red Button in the sidebar to trigger the payment
        const gaBtn = document.getElementById('ga-continue-btn');
        if (gaBtn) gaBtn.onclick = () => activeDropin.submit();

        // 5. Update Garuda UI Labels
        // Skip label updates if only showing a redirect result, unless it was a manual change
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
        if (container) container.innerHTML = `<p style="color:red; padding:20px;">Failed to load checkout.</p>`;
        if (loader) loader.style.display = 'none';
    }
};

// Listener for the Country Selection dropdown
const selector = document.getElementById('country-selector');
if (selector) {
    selector.onchange = (e) => {
        const opt = e.target.options[e.target.selectedIndex];
        // Passing 'true' for isManualChange forces a fresh session call
        window.initCheckout(e.target.value, opt.getAttribute('data-currency'), true);
    };
}
