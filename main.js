let checkoutInstance = null;
let activeDropin = null;

window.initCheckout = async function(countryCode = 'SG', currencyCode = 'SGD', isManualChange = false) {
    const loader = document.getElementById('loading-overlay');
    const container = document.getElementById('dropin-container');
    const successOverlay = document.getElementById('success-overlay');
    
    // Check for redirect return
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');

    if (loader) loader.style.display = 'block';
    if (successOverlay) successOverlay.style.display = 'none';

    // 1. DEEP CLEAN: This prevents the "securedFields" error 
    if (activeDropin) {
        try { activeDropin.unmount(); } catch (e) {}
        activeDropin = null;
    }
    container.innerHTML = ''; 

    try {
        let sessionData;

        // 2. Fetch Session
        if (sessionId && !isManualChange) {
            sessionData = { id: sessionId };
        } else {
            const response = await fetch('/api/create-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ countryCode, currencyCode })
            });
            sessionData = await response.json();
        }

        // 3. Initialize Adyen
        checkoutInstance = await AdyenCheckout({
            environment: 'test',
            clientKey: 'test_767VMJ3TGVG53LK5KUWJZSL5KAZWTIT6',
            session: sessionData,
            onPaymentCompleted: (result) => {
                console.log("Result:", result.resultCode);
                if (['Authorised', 'Pending', 'Received'].includes(result.resultCode)) {
                    successOverlay.style.display = 'block';
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
                if (loader) loader.style.display = 'none';
            },
            onError: (err) => {
                console.error("Adyen Error:", err);
                if (loader) loader.style.display = 'none';
            },
            locale: countryCode === 'ID' ? "id-ID" : "en-GB"
        });

        // 4. Create and Mount Drop-in
        activeDropin = checkoutInstance.create('dropin', { showPayButton: false });
        activeDropin.mount('#dropin-container');

        // 5. DIRECT BUTTON BINDING
        // We re-bind the click every time we init to ensure it hits the NEW activeDropin
        document.getElementById('ga-continue-btn').onclick = (e) => {
            e.preventDefault();
            console.log("Submitting payment...");
            if (activeDropin) {
                activeDropin.submit();
            }
        };

        // 6. UI Price Updates
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

// Initial Call
window.initCheckout('SG', 'SGD');
