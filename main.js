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

        // --- FIXED PRICE UPDATE LOGIC ---
        // Target the specific Garuda MHTML classes for the Booking Summary
        const currencyLabels = document.querySelectorAll('.currency');
        const amountLabels = document.querySelectorAll('.total-amount');

        // Update all instances of currency (e.g., SGD to IDR)
        currencyLabels.forEach(el => el.innerText = currencyCode);

        // Update all instances of the amount (using converted value from backend)
        amountLabels.forEach(el => {
            // Adyen gives us minor units (e.g. 37970), convert to major (379.70)
            const majorAmount = (sessionData.amount.value / 100).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            el.innerText = majorAmount;
        });

        if (loader) loader.style.display = 'none';

    } catch (error) {
        console.error("Initialization Error:", error);
        container.innerHTML = `<p style="color:red; text-align:center; padding:20px;">
            <strong>Checkout Error:</strong> ${error.message}</p>`;
        if (loader) loader.style.display = 'none';
    }
};

// Dropdown listener
const countrySelector = document.getElementById('country-selector');
if (countrySelector) {
    countrySelector.addEventListener('change', (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const country = e.target.value;
        const currency = selectedOption.getAttribute('data-currency');
        window.initCheckout(country, currency);
    });
}
