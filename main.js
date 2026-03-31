// 1. Keep these variables global so the click listener can always find them
let checkoutInstance = null;
let activeDropin = null;

window.initCheckout = async function(countryCode = 'SG', currencyCode = 'SGD', isManualChange = false) {
    const loader = document.getElementById('loading-overlay');
    const container = document.getElementById('dropin-container');
    const successOverlay = document.getElementById('success-overlay');
    
    // Check URL for Adyen redirect markers (e.g., after returning from Alipay)
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');

    if (loader) loader.style.display = 'block';
    if (successOverlay) successOverlay.style.display = 'none';

    try {
        let sessionData;

        // 2. Decide: Resume existing session from URL or Create new one
        if (sessionId && !isManualChange) {
            // Shopper returned from redirect; use the existing ID to finalize
            sessionData = { id: sessionId };
        } else {
            // New session: Standard reset to prevent SecureFields errors
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
                console.log("Payment Result Status:", result.resultCode);
                
                // Show success overlay for Authorized, Pending, or Received statuses
                if (['Authorised', 'Pending', 'Received'].includes(result.resultCode)) {
                    if (successOverlay) successOverlay.style.display = 'block';
                    // Clean URL so a refresh doesn't trigger the success logic again
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

        // 5. Update Garuda UI Price Labels
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

// 6. GLOBAL BUTTON LISTENER
// This ensures the Garuda Red Button always works, even if the Drop-in reloads
document.addEventListener('click', function (e) {
    const btn = e.target.closest('#ga-continue-btn');
    if (btn) {
        e.preventDefault();
        console.log("Garuda Button Clicked - Submitting active Drop-in");
        if (activeDropin) {
            activeDropin.submit();
        } else {
            console.error("No active Drop-in found to submit.");
        }
    }
});

// 7. Country Selector Listener
const selector = document.getElementById('country-selector');
if (selector) {
    selector.onchange = (e) => {
        const opt = e.target.options[e.target.selectedIndex];
        window.initCheckout(e.target.value, opt.getAttribute('data-currency'), true);
    };
}

// 8. Initial Load on Page Entry
window.initCheckout('SG', 'SGD');
