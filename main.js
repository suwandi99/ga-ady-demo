// Global variable to track and destroy the previous instance
let adyenCheckoutInstance = null;

window.initCheckout = async function(countryCode = 'SG', currencyCode = 'SGD') {
    const loader = document.getElementById('loading-overlay');
    const container = document.getElementById('dropin-container');
    const successOverlay = document.getElementById('success-overlay');
    
    if (loader) loader.style.display = 'block';
    if (successOverlay) successOverlay.style.display = 'none';
    
    // --- DEEP RESET ---
    // 1. Clear the HTML container
    container.innerHTML = ''; 
    // 2. If an instance already exists, unmount it to free up the session
    if (adyenCheckoutInstance) {
        // This is the official way to kill the previous session state
        adyenCheckoutInstance = null; 
    }

    try {
        // Fetch from your specific API path
        const response = await fetch('/api/create-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ countryCode, currencyCode })
        });

        if (!response.ok) throw new Error("Backend failed to create session");
        const sessionData = await response.json();

        // --- RE-INITIALIZE CHECKOUT ---
        // We create a fresh instance with the new sessionData
        adyenCheckoutInstance = await AdyenCheckout({
            environment: 'test',
            clientKey: 'test_767VMJ3TGVG53LK5KUWJZSL5KAZWTIT6', 
            session: sessionData, // The raw JSON from your /sessions response
            onPaymentCompleted: (result) => {
                if (result.resultCode === 'Authorised' || result.resultCode === 'Pending') {
                    document.getElementById('success-overlay').style.display = 'block';
                } else {
                    alert("Payment Status: " + result.resultCode);
                }
            },
            onError: (error) => console.error("Adyen Error:", error),
            // Ensure the UI language and method sorting matches the country
            locale: countryCode === 'ID' ? "id-ID" : "en-GB"
        });

        // --- MOUNT NEW DROP-IN ---
        const dropin = adyenCheckoutInstance.create('dropin', {
            showPayButton: false 
        }).mount('#dropin-container');

        // Link the Garuda Red Button
        document.getElementById('ga-continue-btn').onclick = (e) => {
            e.preventDefault();
            dropin.submit();
        };

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
        console.error("Initialization Error:", error);
        container.innerHTML = `<p style="color:red; text-align:center; padding:20px;">
            <strong>Error:</strong> ${error.message}</p>`;
        if (loader) loader.style.display = 'none';
    }
};

// Dropdown listener
const countrySelector = document.getElementById('country-selector');
if (countrySelector) {
    countrySelector.onchange = (e) => {
        const opt = e.target.options[e.target.selectedIndex];
        const country = e.target.value;
        const currency = opt.getAttribute('data-currency');
        window.initCheckout(country, currency);
    };
}
