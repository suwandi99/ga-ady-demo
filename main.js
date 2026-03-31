let checkoutInstance = null;
let activeDropin = null;

window.initCheckout = async function(countryCode = 'SG', currencyCode = 'SGD', isManualChange = false) {
    const loader = document.getElementById('loading-overlay');
    const container = document.getElementById('dropin-container');
    const successOverlay = document.getElementById('success-overlay');
    
    // 1. Manually extract redirect parameters from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');
    const redirectResult = urlParams.get('redirectResult');

    if (loader) loader.style.display = 'block';
    if (successOverlay) successOverlay.style.display = 'none';

    try {
        let checkoutConfig;

        // 2. Determine if we are returning from a redirect OR starting fresh
        if (sessionId && redirectResult && !isManualChange) {
            // CASE A: FINALIZING A REDIRECT
            // We pass the sessionId AND the redirectResult directly to the configuration
            checkoutConfig = {
                environment: 'test',
                clientKey: 'test_767VMJ3TGVG53LK5KUWJZSL5KAZWTIT6',
                session: { 
                    id: sessionId,
                    data: redirectResult // Explicitly pass the redirect data back to the session
                }
            };
        } else {
            // CASE B: INITIAL LOAD OR COUNTRY SWITCH
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
            const sessionData = await response.json();

            checkoutConfig = {
                environment: 'test',
                clientKey: 'test_767VMJ3TGVG53LK5KUWJZSL5KAZWTIT6',
                session: sessionData
            };
        }

        // 3. Common Configuration (Callbacks & Locale)
        checkoutConfig.onPaymentCompleted = (result) => {
            console.log("Payment Result Status:", result.resultCode);
            // Check for success statuses
            if (['Authorised', 'Pending', 'Received'].includes(result.resultCode)) {
                if (successOverlay) successOverlay.style.display = 'block';
                // Remove messy URL parameters for a clean experience
                window.history.replaceState({}, document.title, window.location.pathname);
            } else {
                alert("Payment Status: " + result.resultCode);
            }
        };
        checkoutConfig.onError = (error) => console.error("Adyen SDK Error:", error);
        checkoutConfig.locale = countryCode === 'ID' ? "id-ID" : "en-GB";

        // 4. Initialize and Mount
        checkoutInstance = await AdyenCheckout(checkoutConfig);
        activeDropin = checkoutInstance.create('dropin', { showPayButton: false });
        activeDropin.mount('#dropin-container');

        // Link external Garuda Red Button
        const gaBtn = document.getElementById('ga-continue-btn');
        if (gaBtn) gaBtn.onclick = () => activeDropin.submit();

        // 5. Update UI Price Labels (Skip if resuming a redirect unless it was manual)
        if (!sessionId || isManualChange) {
            document.querySelectorAll('.currency').forEach(el => el.innerText = currencyCode);
            document.querySelectorAll('.total-amount').forEach(el => {
                // Ensure sessionData is available for these updates
                const amountValue = checkoutConfig.session.amount ? checkoutConfig.session.amount.value : 0;
                if (amountValue) {
                    el.innerText = (amountValue / 100).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    });
                }
            });
        }

        if (loader) loader.style.display = 'none';

    } catch (error) {
        console.error("Critical Checkout Error:", error);
        if (container) container.innerHTML = `<p style="color:red; padding:20px;">Failed to process transaction.</p>`;
        if (loader) loader.style.display = 'none';
    }
};

// Dropdown change listener
const selector = document.getElementById('country-selector');
if (selector) {
    selector.onchange = (e) => {
        const opt = e.target.options[e.target.selectedIndex];
        window.initCheckout(e.target.value, opt.getAttribute('data-currency'), true);
    };
}
