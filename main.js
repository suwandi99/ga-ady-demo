let checkoutInstance; 

window.initCheckout = async function(countryCode = 'SG', currencyCode = 'SGD') {
    const loader = document.getElementById('loading-overlay');
    const container = document.getElementById('dropin-container');
    const successOverlay = document.getElementById('success-overlay');
    
    if (loader) loader.style.display = 'block';
    if (successOverlay) successOverlay.style.display = 'none';
    container.innerHTML = ''; 

    try {
        const response = await fetch('/api/create-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ countryCode, currencyCode })
        });

        if (!response.ok) throw new Error("Backend failed to create session");

        const sessionData = await response.json();

        checkoutInstance = await AdyenCheckout({
            environment: 'test',
            clientKey: 'test_767VMJ3TGVG53LK5KUWJZSL5KAZWTIT6', 
            session: sessionData,
            onPaymentCompleted: (result) => {
                if (result.resultCode === 'Authorised' || result.resultCode === 'Pending') {
                    document.getElementById('success-overlay').style.display = 'block';
                } else {
                    alert("Payment Status: " + result.resultCode);
                }
            },
            onError: (error) => console.error("Adyen Error:", error),
            locale: countryCode === 'ID' ? "id-ID" : "en-GB"
        });

        const dropin = checkoutInstance.create('dropin', {
            showPayButton: false 
        }).mount('#dropin-container');

        document.getElementById('ga-continue-btn').onclick = () => dropin.submit();

        // --- IMPROVED PRICE UPDATE LOGIC ---
        // 1. Update Currency Text (e.g., SGD -> IDR)
        document.querySelectorAll('.currency').forEach(el => {
            el.innerText = currencyCode;
        });

        // 2. Update Amount Text
        document.querySelectorAll('.total-amount').forEach(el => {
            // sessionData.amount.value is in minor units (e.g., 37970)
            const numericValue = sessionData.amount.value / 100;
            
            // Format with commas and 2 decimal places
            el.innerText = numericValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        });

        if (loader) loader.style.display = 'none';

    } catch (error) {
        console.error("Initialization Error:", error);
        container.innerHTML = `<p style="color:red; text-align:center; padding:20px;">
            <strong>Checkout Error:</strong> ${error.message}</p>`;
        if (loader) loader.style.display = 'none';
    }
};

// Ensure the dropdown listener is active
const selector = document.getElementById('country-selector');
if (selector) {
    selector.onchange = (e) => {
        const opt = e.target.options[e.target.selectedIndex];
        window.initCheckout(e.target.value, opt.getAttribute('data-currency'));
    };
}
