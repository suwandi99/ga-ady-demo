let checkoutInstance = null;

window.initCheckout = async function(countryCode = 'SG', currencyCode = 'SGD') {
    const loader = document.getElementById('loading-overlay');
    const container = document.getElementById('dropin-container');
    const successOverlay = document.getElementById('success-overlay');
    
    if (loader) loader.style.display = 'block';
    if (successOverlay) successOverlay.style.display = 'none';

    // IMPORTANT: If a checkout exists, we must remove it completely
    if (checkoutInstance) {
        container.innerHTML = ''; 
        checkoutInstance = null;
    }

    try {
        const response = await fetch('/api/create-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ countryCode, currencyCode })
        });

        if (!response.ok) throw new Error("Backend failed");
        
        // This 'data' IS the session object (contains .id and .sessionData)
        const session = await response.json();

        checkoutInstance = await AdyenCheckout({
            environment: 'test',
            clientKey: 'test_767VMJ3TGVG53LK5KUWJZSL5KAZWTIT6', 
            session: session, // Pass the object directly
            onPaymentCompleted: (result) => {
                if (result.resultCode === 'Authorised' || result.resultCode === 'Pending') {
                    document.getElementById('success-overlay').style.display = 'block';
                }
            },
            locale: countryCode === 'ID' ? "id-ID" : "en-GB"
        });

        const dropin = checkoutInstance.create('dropin', {
            showPayButton: false 
        }).mount('#dropin-container');

        document.getElementById('ga-continue-btn').onclick = () => dropin.submit();

        // Update Garuda Sidebar UI
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
        console.error("Error:", error);
        container.innerHTML = `<p style="color:red; padding:20px;">Failed to load: ${error.message}</p>`;
        if (loader) loader.style.display = 'none';
    }
};

// Ensure dropdown works
const selector = document.getElementById('country-selector');
if (selector) {
    selector.onchange = (e) => {
        const opt = e.target.options[e.target.selectedIndex];
        window.initCheckout(e.target.value, opt.getAttribute('data-currency'));
    };
}
