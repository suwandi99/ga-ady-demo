let checkoutInstance = null;
let activeDropin = null;

window.initCheckout = async function(countryCode = 'SG', currencyCode = 'SGD', isManualChange = false) {
    const loader = document.getElementById('loading-overlay');
    const container = document.getElementById('dropin-container');
    const successOverlay = document.getElementById('success-overlay');
    
    // 1. Check URL for redirect markers
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');
    const redirectResult = urlParams.get('redirectResult');

    if (loader) loader.style.display = 'block';
    if (successOverlay) successOverlay.style.display = 'none';

    try {
        // 2. Logic: If we have a redirectResult, we ONLY handle that.
        if (sessionId && redirectResult && !isManualChange) {
            console.log("Processing redirect for session:", sessionId);
            
            const checkout = await AdyenCheckout({
                environment: 'test',
                clientKey: 'test_767VMJ3TGVG53LK5KUWJZSL5KAZWTIT6',
                session: { id: sessionId },
                onPaymentCompleted: (result) => {
                    console.log("Redirect Result:", result.resultCode);
                    if (['Authorised', 'Pending', 'Received'].includes(result.resultCode)) {
                        successOverlay.style.display = 'block';
                    } else {
                        alert("Payment Status: " + result.resultCode);
                    }
                    // CLEANUP: Remove parameters from URL so the page works normally on refresh
                    window.history.replaceState({}, document.title, window.location.pathname);
                    if (loader) loader.style.display = 'none';
                    
                    // Re-init a fresh checkout so the UI isn't empty
                    window.initCheckout('SG', 'SGD', true);
                },
                onError: (err) => {
                    console.error("Redirect Error:", err);
                    window.history.replaceState({}, document.title, window.location.pathname);
                    window.initCheckout('SG', 'SGD', true);
                }
            });
            return; // Exit early; the callback handles the rest
        }

        // 3. FRESH START MODE (Standard Load or Country Switch)
        if (activeDropin) { activeDropin.unmount(); activeDropin = null; }
        container.innerHTML = ''; 
        checkoutInstance = null;

        const response = await fetch('/api/create-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ countryCode, currencyCode })
        });
        
        const sessionData = await response.json();

        checkoutInstance = await AdyenCheckout({
            environment: 'test',
            clientKey: 'test_767VMJ3TGVG53LK5KUWJZSL5KAZWTIT6', 
            session: sessionData,
            onPaymentCompleted: (result) => {
                if (['Authorised', 'Pending', 'Received'].includes(result.resultCode)) {
                    successOverlay.style.display = 'block';
                }
            },
            locale: countryCode === 'ID' ? "id-ID" : "en-GB"
        });

        activeDropin = checkoutInstance.create('dropin', { showPayButton: false });
        activeDropin.mount('#dropin-container');

        // Link Garuda Red Button
        document.getElementById('ga-continue-btn').onclick = (e) => {
            e.preventDefault();
            if (activeDropin) activeDropin.submit();
        };

        // Update UI Prices
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

// Initial Call
window.initCheckout('SG', 'SGD');
