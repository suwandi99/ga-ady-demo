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

        // 2. LOGIC: Determine if we are finalizing a redirect OR starting fresh
        // If it is a manual country change, we ignore the URL parameters entirely.
        if (sessionId && redirectResult && !isManualChange) {
            // CASE A: FINALIZING A REDIRECT
            // Pass the sessionId and the redirectResult directly to the configuration
            checkoutConfig = {
                environment: 'test',
                clientKey: 'test_767VMJ3TGVG53LK5KUWJZSL5KAZWTIT6',
                session: { 
                    id: sessionId,
                    data: redirectResult // Pass redirect data back to the session 
                }
            };
        } else {
            // CASE B: INITIAL LOAD OR COUNTRY SWITCH
            // Completely destroy any previous secure fields instance [cite: 1682-1686]
            if (activeDropin) { 
                activeDropin.unmount(); 
                activeDropin = null; 
            }
            container.innerHTML = ''; 
            checkoutInstance = null;

            // Fetch a fresh session from your Cloudflare API path
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

        // 3. Set standard Adyen Checkout behaviors
        checkoutConfig.onPaymentCompleted = (result) => {
            console.log("Payment Result Status:", result.resultCode);
            // Authorised, Pending, and Received are successful outcomes 
            if (['Authorised', 'Pending', 'Received'].includes(result.resultCode)) {
                if (successOverlay) successOverlay.style.display = 'block';
                // Remove redirect parameters from URL for a clean state
                window.history.replaceState({}, document.title, window.location.pathname);
            } else {
                alert("Payment Status: " + result.resultCode);
            }
        };
        checkoutConfig.onError = (error) => console.error("Adyen SDK Error:", error);
        checkoutConfig.locale = countryCode === 'ID' ? "id-ID" : "en-GB";

        // 4. Initialize the Checkout and Mount Drop-in
        checkoutInstance = await AdyenCheckout(checkoutConfig);
        activeDropin = checkoutInstance.create('dropin', { showPayButton: false });
        activeDropin.mount('#dropin-container');

        // Link the external Garuda Red Button ("Continue Payment") [cite: 604]
        const gaBtn = document.getElementById('ga-continue-btn');
        if (gaBtn) gaBtn.onclick = () => activeDropin.submit();

        // 5. Update UI Price Labels
        // Update only if we are on a fresh session (or manual change)
        if (!sessionId || isManualChange) {
            document.querySelectorAll('.currency').forEach(el => el.innerText = currencyCode);
            document.querySelectorAll('.total-amount').forEach(el => {
                // Determine the correct amount from either case
                const sessionObj = checkoutConfig.session;
                const amountValue = sessionObj.amount ? sessionObj.amount.value : 0;
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

// Setup the Dropdown listener
const selector = document.getElementById('country-selector');
if (selector) {
    selector.onchange = (e) => {
        const opt = e.target.options[e.target.selectedIndex];
        // The 'true' flag ensures the script ignores URL redirect params 
        window.initCheckout(e.target.value, opt.getAttribute('data-currency'), true);
    };
}
