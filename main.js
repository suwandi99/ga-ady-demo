let checkoutInstance = null;
let activeDropin = null;

window.initCheckout = async function(countryCode = 'SG', currencyCode = 'SGD', isManualChange = false) {
    const loader = document.getElementById('loading-overlay');
    const container = document.getElementById('dropin-container');
    const successOverlay = document.getElementById('success-overlay');
    
    // 1. Detect if we are returning from a redirect
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');

    if (loader) loader.style.display = 'block';
    if (successOverlay) successOverlay.style.display = 'none';

    try {
        let sessionData;

        // 2. Determine Session Logic
        if (sessionId && !isManualChange) {
            sessionData = { id: sessionId };
        } else {
            if (activeDropin) { activeDropin.unmount(); activeDropin = null; }
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

        // 3. Initialize Adyen Checkout
        checkoutInstance = await AdyenCheckout({
            environment: 'test',
            clientKey: 'test_767VMJ3TGVG53LK5KUWJZSL5KAZWTIT6', 
            session: sessionData,
            onPaymentCompleted: (result) => {
                console.log("Payment Result:", result.resultCode);
                if (['Authorised', 'Pending', 'Received'].includes(result.resultCode)) {
                    if (successOverlay) successOverlay.style.display = 'block';
                    window.history.replaceState({}, document.title, window.location.pathname);
                } else if (result.resultCode === 'Refused') {
                    alert("Payment Refused.");
                }
                if (loader) loader.style.display = 'none';
            },
            // This is critical for Redirects to actually fire
            onActionHandled: (data) => {
                console.log("Action handled:", data);
            },
            onError: (error) => {
                console.error("Adyen Error:", error);
                if (loader) loader.style.display = 'none';
            },
            locale: countryCode === 'ID' ? "id-ID" : "en-GB"
        });

        // 4. Create and Mount Drop-in
        activeDropin = checkoutInstance.create('dropin', { 
            showPayButton: false,
            // Ensure redirect happens automatically if needed
            instantPaymentTypes: ['alipay', 'wechatpay_web'] 
        }).mount('#dropin-container');

        // 5. LINK THE BUTTON (Ensuring the reference is fresh)
        const gaBtn = document.getElementById('ga-continue-btn');
        if (gaBtn) {
            // Remove any old listeners to prevent double-firing
            const newBtn = gaBtn.cloneNode(true);
            gaBtn.parentNode.replaceChild(newBtn, gaBtn);
            
            newBtn.onclick = (e) => {
                e.preventDefault();
                console.log("Garuda Button Clicked - Submitting Drop-in");
                if (activeDropin) {
                    activeDropin.submit();
                }
            };
        }

        // 6. Update Price Labels
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
        console.error("Init Error:", error);
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

// Start first load
window.initCheckout('SG', 'SGD');
