let checkoutInstance = null;
let activeDropin = null;

window.initCheckout = async function(countryCode = 'SG', currencyCode = 'SGD') {
    const loader = document.getElementById('loading-overlay');
    const container = document.getElementById('dropin-container');
    const successOverlay = document.getElementById('success-overlay');
    
    // Check if this is a redirect return (URL will have sessionId)
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');
    const redirectResult = urlParams.get('redirectResult');

    if (loader) loader.style.display = 'block';

    try {
        let sessionData;

        if (sessionId && redirectResult) {
            // CASE A: The shopper has just been redirected back
            sessionData = { id: sessionId };
        } else {
            // CASE B: Standard initial load or country change
            if (activeDropin) { activeDropin.unmount(); activeDropin = null; }
            container.innerHTML = ''; 
            
            const response = await fetch('/api/create-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ countryCode, currencyCode })
            });
            sessionData = await response.json();
        }

        checkoutInstance = await AdyenCheckout({
            environment: 'test',
            clientKey: 'test_767VMJ3TGVG53LK5KUWJZSL5KAZWTIT6', 
            session: sessionData,
            onPaymentCompleted: (result) => {
                // This triggers for both standard and redirected payments
                if (result.resultCode === 'Authorised' || result.resultCode === 'Pending') {
                    successOverlay.style.display = 'block';
                    // Clean up URL parameters so refresh doesn't trigger success again
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            },
            onError: (error) => console.error("Adyen Error:", error),
            locale: countryCode === 'ID' ? "id-ID" : "en-GB"
        });

        activeDropin = checkoutInstance.create('dropin', { showPayButton: false });
        activeDropin.mount('#dropin-container');

        document.getElementById('ga-continue-btn').onclick = () => activeDropin.submit();

        // Update UI Prices (skip if we are just finalizing a redirect)
        if (!sessionId) {
            document.querySelectorAll('.currency').forEach(el => el.innerText = currencyCode);
            document.querySelectorAll('.total-amount').forEach(el => {
                el.innerText = (sessionData.amount.value / 100).toLocaleString(undefined, {
                    minimumFractionDigits: 2, maximumFractionDigits: 2
                });
            });
        }

        if (loader) loader.style.display = 'none';

    } catch (error) {
        console.error("Checkout Error:", error);
        if (loader) loader.style.display = 'none';
    }
};
