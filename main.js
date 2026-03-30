let checkoutInstance; // Global variable to track the session

window.initCheckout = async function(countryCode = 'SG', currencyCode = 'SGD') {
    const loader = document.getElementById('loading-overlay');
    const container = document.getElementById('dropin-container');
    const successOverlay = document.getElementById('success-overlay');
    
    if (loader) loader.style.display = 'block';
    if (successOverlay) successOverlay.style.display = 'none';

    // --- STEP 1: CLEAN RESET OF THE DROP-IN ---
    // Remove the old instance from memory and clear the HTML container
    if (checkoutInstance) {
        try {
            // This properly shuts down the previous SDK instance
            checkoutInstance.unmount(); 
        } catch (e) {
            console.log("No existing instance to unmount");
        }
    }
    container.innerHTML = ''; 

    try {
        // 1. Fetch new session from your specific path
        const response = await fetch('/api/create-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ countryCode, currencyCode })
        });

        if (!response.ok) throw new Error("Backend failed to create session");

        const sessionData = await response.json();

        // 2. Initialize Adyen Checkout with your specific Client Key
        // We assign it to the global checkoutInstance so we can destroy it next time
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

        // 3. Create and Mount the NEW Drop-in
        const dropin = checkoutInstance.create('dropin', {
            showPayButton: false 
        }).mount('#dropin-container');

        // 4. Update the Garuda Red Button to point to the NEW dropin
        document.getElementById('ga-continue-btn').onclick = () => dropin.submit();

        // 5. Update UI Price Labels
        document.querySelectorAll('.currency').forEach(el => el.innerText = currencyCode);
        document.querySelectorAll('.total-amount').forEach(el => {
            const numericValue = sessionData.amount.value / 100;
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

// Dropdown listener
const selector = document.getElementById('country-selector');
if (selector) {
    selector.onchange = (e) => {
        const opt = e.target.options[e.target.selectedIndex];
        window.initCheckout(e.target.value, opt.getAttribute('data-currency'));
    };
}
