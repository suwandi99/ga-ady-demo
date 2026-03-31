let checkoutInstance = null;
let activeDropin = null; // Track the dropin component specifically

window.initCheckout = async function(countryCode = 'SG', currencyCode = 'SGD') {
    const loader = document.getElementById('loading-overlay');
    const container = document.getElementById('dropin-container');
    const successOverlay = document.getElementById('success-overlay');
    
    if (loader) loader.style.display = 'block';
    if (successOverlay) successOverlay.style.display = 'none';

    // --- CRITICAL FIX: DESTROY PREVIOUS SECURE FIELDS ---
    if (activeDropin) {
        try {
            // Unmount the dropin component to remove iframes properly
            activeDropin.unmount();
        } catch (e) {
            console.error("Error unmounting dropin:", e);
        }
        activeDropin = null;
    }
    
    // Clear the HTML and reset the checkout instance
    container.innerHTML = ''; 
    checkoutInstance = null;

    try {
        const response = await fetch('/api/create-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ countryCode, currencyCode })
        });

        if (!response.ok) throw new Error("Backend failed to create session");
        const sessionData = await response.json();

        // 1. Initialize Adyen Checkout
        checkoutInstance = await AdyenCheckout({
            environment: 'test',
            clientKey: 'test_767VMJ3TGVG53LK5KUWJZSL5KAZWTIT6', 
            session: sessionData,
            onPaymentCompleted: (result) => {
                if (result.resultCode === 'Authorised' || result.resultCode === 'Pending') {
                    document.getElementById('success-overlay').style.display = 'block';
                }
            },
            locale: countryCode === 'ID' ? "id-ID" : "en-GB"
        });

        // 2. Create the dropin and store it in activeDropin
        activeDropin = checkoutInstance.create('dropin', {
            showPayButton: false 
        });

        // 3. Mount the dropin
        activeDropin.mount('#dropin-container');

        // Link the Garuda Red Button to the specific active instance
        document.getElementById('ga-continue-btn').onclick = () => activeDropin.submit();

        // Update UI Price Labels
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
        console.error("Checkout Error:", error);
        container.innerHTML = `<p style="color:red; padding:20px;">Failed to load: ${error.message}</p>`;
        if (loader) loader.style.display = 'none';
    }
};

// Dropdown listener
const selector = document.getElementById('country-selector');
if (selector) {
    selector.onchange = (e) => {
        const opt = e.target.options[e.target.selectedIndex];
        window.initCheckout(e.target.value, opt.getAttribute('data-currency'));
    };
}
