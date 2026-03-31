let adyenCheckoutInstance = null; // Track the current instance

window.initCheckout = async function(countryCode = 'SG', currencyCode = 'SGD') {
    const loader = document.getElementById('loading-overlay');
    const container = document.getElementById('dropin-container');
    const successOverlay = document.getElementById('success-overlay');
    
    if (loader) loader.style.display = 'block';
    if (successOverlay) successOverlay.style.display = 'none';

    // 1. CLEAR PREVIOUS INSTANCE
    // This removes the old iframe and clears internal SDK state
    container.innerHTML = ''; 
    adyenCheckoutInstance = null;

    try {
        // 2. FETCH LOCALIZED SESSION
        const response = await fetch('/api/create-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ countryCode, currencyCode })
        });

        if (!response.ok) throw new Error("Backend failed to create session");
        const session = await response.json();

        // 3. INITIALIZE ADYEN
        adyenCheckoutInstance = await AdyenCheckout({
            environment: 'test',
            clientKey: 'test_767VMJ3TGVG53LK5KUWJZSL5KAZWTIT6', 
            session: session, // Use the direct object from backend
            onPaymentCompleted: (result) => {
                if (result.resultCode === 'Authorised' || result.resultCode === 'Pending') {
                    document.getElementById('success-overlay').style.display = 'block';
                }
            },
            // Update locale to show local payment names for Indonesia
            locale: countryCode === 'ID' ? "id-ID" : "en-GB"
        });

        // 4. MOUNT DROP-IN
        const dropin = adyenCheckoutInstance.create('dropin', {
            showPayButton: false 
        }).mount('#dropin-container');

        // Link the Garuda Red Button in the sidebar
        document.getElementById('ga-continue-btn').onclick = () => dropin.submit();

        // 5. UPDATE SIDEBAR PRICE LABELS
        document.querySelectorAll('.currency').forEach(el => el.innerText = currencyCode);
        document.querySelectorAll('.total-amount').forEach(el => {
            const majorAmount = (session.amount.value / 100).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            el.innerText = majorAmount;
        });

        if (loader) loader.style.display = 'none';

    } catch (error) {
        console.error("Checkout Error:", error);
        container.innerHTML = `<p style="color:red; padding:20px;">Failed to load: ${error.message}</p>`;
        if (loader) loader.style.display = 'none';
    }
};

// Setup dropdown change listener
const selector = document.getElementById('country-selector');
if (selector) {
    selector.onchange = (e) => {
        const opt = e.target.options[e.target.selectedIndex];
        window.initCheckout(e.target.value, opt.getAttribute('data-currency'));
    };
}
