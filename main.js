let checkoutInstance = null;
let activeDropin = null;

window.initCheckout = async function(countryCode = 'SG', currencyCode = 'SGD', isManualChange = false) {
    const loader = document.getElementById('loading-overlay');
    const container = document.getElementById('dropin-container');
    const successOverlay = document.getElementById('success-overlay');
    
    // 1. Check for Adyen redirect markers in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');

    if (loader) loader.style.display = 'block';
    if (successOverlay) successOverlay.style.display = 'none';

    try {
        let sessionData;

        // 2. Decide: Resume existing session from URL or Create new one
        // If it's a manual country change, we ignore the URL and force a new session
        if (sessionId && !isManualChange) {
            sessionData = { id: sessionId };
        } else {
            // Standard reset for new sessions
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

        // 3. Initialize Adyen Checkout with your specific credentials
        checkoutInstance = await AdyenCheckout({
            environment: 'test',
            clientKey: 'test_767VMJ3TGVG53LK5KUWJZSL5KAZWTIT6', 
            session: sessionData,
            onPaymentCompleted: (result) => {
                console.log("Payment Result Status:", result.resultCode);
                
                // These statuses indicate a successful redirect or card payment
                if (['Authorised', 'Pending', 'Received'].includes(result.resultCode)) {
                    if (successOverlay) successOverlay.style.display = 'block';
                    // Clean the URL so a refresh doesn't trigger the success logic again
                    window.history.replaceState({}, document.title, window.location.pathname);
                } else if (result.resultCode === 'Refused') {
                    alert("Payment Refused. Please try another method.");
                }
                
                if (loader) loader.style.display = 'none';
            },
            onError: (error) => {
                console.error("Adyen SDK Error:", error);
                if (loader) loader.style.display = 'none';
            },
            locale: countryCode === 'ID' ? "id-ID" : "en-GB"
        });

        // 4. Create and Mount Drop-in
        // We mount it even on redirect return so the SDK can process the URL parameters
        activeDropin = checkoutInstance.create('dropin', { 
            showPayButton: false 
        }).mount('#dropin-container');

        // 5. Link the Garuda Red "Continue Payment" Button
        const gaBtn = document.getElementById('ga-continue-btn');
        if (gaBtn) {
            gaBtn.onclick = (e) => {
                e.preventDefault();
                if (activeDropin) {
                    activeDropin.submit();
                }
            };
        }

        // 6. Update UI Price Labels
        // Only update if we have a full session object (not just a resume ID)
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
        if (container) container.innerHTML = `<p style="color:red; padding:20px;">Error loading checkout.</p>`;
        if (loader) loader.style.display = 'none';
    }
};

// Listener for the Country Selection dropdown
const selector = document.getElementById('country-selector');
if (selector) {
    selector.onchange = (e) => {
        const opt = e.target.options[e.target.selectedIndex];
        const country = e.target.value;
        const currency = opt.getAttribute('data-currency');
        // Passing 'true' for isManualChange forces a fresh session
        window.initCheckout(country, currency, true);
    };
}

// Initial load on page entry
window.initCheckout('SG', 'SGD');
