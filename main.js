window.initCheckout = async function(countryCode = 'SG', currencyCode = 'SGD') {
    const loader = document.getElementById('loading-overlay');
    const container = document.getElementById('dropin-container');
    const successOverlay = document.getElementById('success-overlay');
    
    // UI Feedback: Show loader and clear the success screen
    if (loader) loader.style.display = 'block';
    if (successOverlay) successOverlay.style.display = 'none';
    
    // 1. HARD RESET: Clear the HTML container to remove old iframes
    container.innerHTML = ''; 
    
    // 2. WIPE SDK: Remove the existing Adyen script tag to clear internal global state
    const oldScript = document.getElementById('adyen-script');
    if (oldScript) oldScript.remove();

    try {
        // 3. Fetch new session from your specific path
        const response = await fetch('/api/create-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ countryCode, currencyCode })
        });

        if (!response.ok) throw new Error("Backend failed to create session");
        const sessionData = await response.json();

        // 4. INJECT FRESH ADYEN SCRIPT: This forces a clean state for the new country
        const script = document.createElement('script');
        script.id = 'adyen-script';
        script.src = "https://checkoutshopper-test.adyen.com/checkoutshopper/sdk/5.66.0/adyen.js";
        
        script.onload = async () => {
            // 5. Initialize Checkout with your locked-in Client Key
            const checkout = await AdyenCheckout({
                environment: 'test',
                clientKey: 'test_767VMJ3TGVG53LK5KUWJZSL5KAZWTIT6', 
                session: sessionData,
                onPaymentCompleted: (result) => {
                    console.log("Payment Result:", result.resultCode);
                    if (result.resultCode === 'Authorised' || result.resultCode === 'Pending') {
                        document.getElementById('success-overlay').style.display = 'block';
                    } else {
                        alert("Payment Status: " + result.resultCode);
                    }
                },
                onError: (error) => console.error("Adyen Error:", error),
                // Locale triggers the correct language and local payment methods
                locale: countryCode === 'ID' ? "id-ID" : "en-GB"
            });

            // 6. Mount the NEW Drop-in
            const dropin = checkout.create('dropin', {
                showPayButton: false 
            }).mount('#dropin-container');

            // 7. Re-link the Garuda Red "Continue Payment" Button
            const gaBtn = document.getElementById('ga-continue-btn');
            if (gaBtn) {
                gaBtn.onclick = (e) => {
                    e.preventDefault();
                    dropin.submit();
                };
            }

            // 8. Update Garuda Sidebar UI labels
            document.querySelectorAll('.currency').forEach(el => el.innerText = currencyCode);
            document.querySelectorAll('.total-amount').forEach(el => {
                const val = sessionData.amount.value / 100;
                el.innerText = val.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
            });

            if (loader) loader.style.display = 'none';
        };

        document.body.appendChild(script);

    } catch (error) {
        console.error("Initialization Error:", error);
        container.innerHTML = `<p style="color:red; text-align:center; padding:20px;">
            <strong>Error:</strong> ${error.message}</p>`;
        if (loader) loader.style.display = 'none';
    }
};

// Initial setup for the dropdown listener
document.addEventListener('DOMContentLoaded', () => {
    const selector = document.getElementById('country-selector');
    if (selector) {
        selector.onchange = (e) => {
            const opt = e.target.options[e.target.selectedIndex];
            const country = e.target.value;
            const currency = opt.getAttribute('data-currency');
            window.initCheckout(country, currency);
        };
    }
});

// Manual first load trigger
window.initCheckout('SG', 'SGD');
