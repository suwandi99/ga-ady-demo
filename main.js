let checkoutInstance = null;
let activeDropin = null;

window.initCheckout = async function(countryCode = 'SG', currencyCode = 'SGD', isManualChange = false) {
    const loader = document.getElementById('loading-overlay');
    const container = document.getElementById('dropin-container');
    const successOverlay = document.getElementById('success-overlay');
    
    // 1. Check for existing session in URL (Redirect Return)
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');

    if (loader) loader.style.display = 'block';
    if (successOverlay) successOverlay.style.display = 'none';

    try {
        let sessionData;

        // 2. Determine Session Source
        if (sessionId && !isManualChange) {
            // Case: Shopper returned from Alipay
            sessionData = { id: sessionId };
        } else {
            // Case: Initial load or manual Country Switch
            // Clean up previous instance to avoid SecureFields errors
            if (activeDropin) { 
                activeDropin.unmount(); 
                activeDropin = null; 
            }
            container.innerHTML = ''; 
            
            const response = await fetch('/api/create-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ countryCode, currencyCode })
            });
            
            if (!response.ok) throw new Error("Backend failed to create session");
            sessionData = await response.json();
        }

        // 3. Create THE ONLY Adyen Instance
        checkoutInstance = await AdyenCheckout({
            environment: 'test',
            clientKey: 'test_767VMJ3TGVG53LK5KUWJZSL5KAZWTIT6', 
            session: sessionData,
            onPaymentCompleted: (result) => {
                console.log("Payment Result:", result.resultCode);
                if (['Authorised', 'Pending', 'Received'].includes(result.resultCode)) {
                    if (successOverlay) successOverlay.style.display = 'block';
                    // Clean URL so a refresh doesn't trigger success again
                    window.history.replaceState({}, document.title, window.location.pathname);
                } else if (result.resultCode === 'Refused') {
                    alert("Payment Refused. Please try another card/method.");
                }
                if (loader) loader.style.display = 'none';
            },
            onError: (error) => {
                console.error("Adyen Error:", error);
                if (loader) loader.style.display = 'none';
            },
            locale: countryCode === 'ID' ? "id-ID" : "en-GB"
        });

        // 4. Create and Mount the Drop-in
        activeDropin = checkoutInstance.create('dropin', {
            showPayButton: false // Use Garuda Red Button instead
        });
        
        activeDropin.mount('#dropin-container');

        // 5. Link the Garuda Red Button
        const gaBtn = document.getElementById('ga-continue-btn');
        if (gaBtn) {
            gaBtn.onclick = (e) => {
                e.preventDefault();
                console.log("Garuda Button Clicked - Submitting Drop-in");
                if (activeDropin) {
                    activeDropin.submit();
                } else {
                    console.error("No active Drop-in instance found!");
                }
            };
        }

        // 6. Update UI Prices (Only if we have fresh session data)
        if (sessionData.amount) {
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
        console.error("Fatal Init Error:", error);
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

// First run on page load
window.initCheckout('SG', 'SGD');
