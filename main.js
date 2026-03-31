// ADD THIS TO THE TOP OF main.js
const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('sessionId');
const redirectResult = urlParams.get('redirectResult');

// If we see these in the URL, the shopper JUST came back from Alipay
if (sessionId && redirectResult) {
    console.log("Caught redirect result! Finalizing...");
    
    // Create a temporary checkout instance just to handle the result
    AdyenCheckout({
        environment: 'test',
        clientKey: 'test_767VMJ3TGVG53LK5KUWJZSL5KAZWTIT6',
        session: { id: sessionId },
        onPaymentCompleted: (result) => {
            console.log("Redirect Success:", result.resultCode);
            if (['Authorised', 'Pending', 'Received'].includes(result.resultCode)) {
                // Show the overlay immediately
                document.getElementById('success-overlay').style.display = 'block';
                // Clean the URL so it doesn't loop
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    }).then(checkout => {
        // Force the SDK to process the result from the URL
        checkout.submitDetails({ details: { redirectResult } });
    });
}

let checkoutInstance = null;
let activeDropin = null;

window.initCheckout = async function(countryCode = 'SG', currencyCode = 'SGD', isManualChange = false) {
    const loader = document.getElementById('loading-overlay');
    const container = document.getElementById('dropin-container');
    const successOverlay = document.getElementById('success-overlay');
    
    // 1. Check for redirect markers in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');
    const redirectResult = urlParams.get('redirectResult');

    if (loader) loader.style.display = 'block';
    if (successOverlay) successOverlay.style.display = 'none';

    try {
        let checkoutConfig = {
            environment: 'test',
            clientKey: 'test_767VMJ3TGVG53LK5KUWJZSL5KAZWTIT6',
            onPaymentCompleted: (result) => {
                console.log("Adyen Result:", result.resultCode);
                // Redirects often return 'Authorised', 'Pending', or 'Received'
                if (['Authorised', 'Pending', 'Received'].includes(result.resultCode)) {
                    if (successOverlay) successOverlay.style.display = 'block';
                    if (loader) loader.style.display = 'none';
                    // Clear the URL so refresh doesn't break the UI
                    window.history.replaceState({}, document.title, window.location.pathname);
                } else {
                    alert("Payment Status: " + result.resultCode);
                    if (loader) loader.style.display = 'none';
                }
            },
            onError: (error) => {
                console.error("Adyen Error:", error);
                if (loader) loader.style.display = 'none';
            },
            locale: countryCode === 'ID' ? "id-ID" : "en-GB"
        };

        // 2. Decide: Are we resuming a redirect or starting fresh?
        if (sessionId && redirectResult && !isManualChange) {
            // --- REDIRECT RESUME MODE ---
            checkoutConfig.session = { id: sessionId };
        } else {
            // --- FRESH SESSION MODE ---
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
            checkoutConfig.session = sessionData;

            // Update UI Price Labels
            document.querySelectorAll('.currency').forEach(el => el.innerText = currencyCode);
            document.querySelectorAll('.total-amount').forEach(el => {
                const val = sessionData.amount.value / 100;
                el.innerText = val.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
            });
        }

        // 3. Initialize and Mount
        checkoutInstance = await AdyenCheckout(checkoutConfig);
        activeDropin = checkoutInstance.create('dropin', { 
            showPayButton: false 
        }).mount('#dropin-container');

        // Link the Garuda Red Button
        const gaBtn = document.getElementById('ga-continue-btn');
        if (gaBtn) {
            gaBtn.onclick = (e) => {
                e.preventDefault();
                activeDropin.submit();
            };
        }

        if (loader) loader.style.display = 'none';

    } catch (error) {
        console.error("Initialization Error:", error);
        if (loader) loader.style.display = 'none';
    }
};

// Dropdown listener
const selector = document.getElementById('country-selector');
if (selector) {
    selector.onchange = (e) => {
        const opt = e.target.options[e.target.selectedIndex];
        window.initCheckout(e.target.value, opt.getAttribute('data-currency'), true);
    };
}
