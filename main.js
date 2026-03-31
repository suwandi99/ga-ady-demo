let checkoutInstance = null;
let activeDropin = null;

window.initCheckout = async function(countryCode = 'SG', currencyCode = 'SGD', isManualChange = false) {
    const loader = document.getElementById('loading-overlay');
    const container = document.getElementById('dropin-container');
    const successOverlay = document.getElementById('success-overlay');
    
    // 1. Extract redirect markers from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');
    const redirectResult = urlParams.get('redirectResult');

    if (loader) loader.style.display = 'block';
    if (successOverlay) successOverlay.style.display = 'none';

    try {
        let sessionData;

        // 2. Determine Session Path
        if (sessionId && redirectResult && !isManualChange) {
            // REDIRECT RETURN: Use the existing ID from the URL
            sessionData = { id: sessionId };
        } else {
            // FRESH START: Wipe old instances and fetch new session
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

        // 3. Initialize Adyen Checkout
        checkoutInstance = await AdyenCheckout({
            environment: 'test',
            clientKey: 'test_767VMJ3TGVG53LK5KUWJZSL5KAZWTIT6', 
            session: sessionData,
            onPaymentCompleted: (result) => {
                console.log("Final Payment Result:", result.resultCode);
                // Broad success check for redirect methods
                if (['Authorised', 'Pending', 'Received', 'Success'].includes(result.resultCode)) {
                    if (successOverlay) successOverlay.style.display = 'block';
                    // Clean URL so refresh doesn't loop the success
                    window.history.replaceState({}, document.title, window.location.pathname);
                } else {
                    alert("Payment Status: " + result.resultCode);
                }
                if (loader) loader.style.display = 'none';
            },
            onError: (error) => {
                console.error("Adyen Error:", error);
                if (loader) loader.style.display = 'none';
            },
            locale: countryCode === 'ID' ? "id-ID" : "en-GB"
        });

        // 4. THE REDIRECT FIX: 
        // If we have a redirectResult, we tell the checkout instance to process it explicitly
        if (sessionId && redirectResult && !isManualChange) {
            // This forces the SDK to evaluate the URL parameters and trigger onPaymentCompleted
            await checkoutInstance.submitDetails({ details: { redirectResult } });
            return; // Stop here; the callback above will handle the UI
        }

        // 5. Normal Mount (for fresh sessions)
        activeDropin = checkoutInstance.create('dropin', { showPayButton: false });
        activeDropin.mount('#dropin-container');

        // Link Garuda Red Button
        const gaBtn = document.getElementById('ga-continue-btn');
        if (gaBtn) {
            gaBtn.onclick = (e) => {
                e.preventDefault();
                activeDropin.submit();
            };
        }

        // Update UI Prices
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
        console.error("Initialization Error:", error);
        if (loader) loader.style.display = 'none';
    }
};

// Dropdown Listener
const selector = document.getElementById('country-selector');
if (selector) {
    selector.onchange = (e) => {
        const opt = e.target.options[e.target.selectedIndex];
        window.initCheckout(e.target.value, opt.getAttribute('data-currency'), true);
    };
}
