let checkoutInstance = null;
let activeDropin = null;

// --- 1. THE REDIRECT SAFETY NET (Always at the top) ---
window.addEventListener('load', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');
    const redirectResult = urlParams.get('redirectResult');

    if (sessionId && redirectResult) {
        const checkout = await AdyenCheckout({
            environment: 'test',
            clientKey: 'test_767VMJ3TGVG53LK5KUWJZSL5KAZWTIT6',
            session: { id: sessionId },
            onPaymentCompleted: (result) => {
                if (['Authorised', 'Pending', 'Received'].includes(result.resultCode)) {
                    document.getElementById('success-overlay').style.display = 'block';
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            }
        });
        // Explicitly handle the return trip
        checkout.submitDetails({ details: { redirectResult } });
    }
});

// --- 2. MAIN INITIALIZATION ---
window.initCheckout = async function(countryCode = 'SG', currencyCode = 'SGD', isManualChange = false) {
    const container = document.getElementById('dropin-container');
    const loader = document.getElementById('loading-overlay');
    
    if (loader) loader.style.display = 'block';

    if (activeDropin) { try { activeDropin.unmount(); } catch(e){} }
    container.innerHTML = ''; 

    try {
        const response = await fetch('/api/create-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ countryCode, currencyCode })
        });
        const sessionData = await response.json();

        checkoutInstance = await AdyenCheckout({
            environment: 'test',
            clientKey: 'test_767VMJ3TGVG53LK5KUWJZSL5KAZWTIT6',
            session: sessionData,
            onPaymentCompleted: (result) => {
                if (['Authorised', 'Pending', 'Received'].includes(result.resultCode)) {
                    document.getElementById('success-overlay').style.display = 'block';
                }
            },
            // Needed to handle complex redirects for wallets like GrabPay
            onAdditionalDetails: (state, component) => {
                return state;
            }
        });

        activeDropin = checkoutInstance.create('dropin', {
            showPayButton: false,
            // Optimization for GrabPay/Wallets
            paymentMethodsConfiguration: {
                grabpay_SG: { amount: sessionData.amount },
                grabpay_MY: { amount: sessionData.amount }
            }
        }).mount('#dropin-container');

        // Re-link the Garuda button
        document.getElementById('ga-continue-btn').onclick = (e) => {
            e.preventDefault();
            if (activeDropin) activeDropin.submit();
        };

        if (loader) loader.style.display = 'none';
    } catch (error) {
        console.error("Init Error:", error);
        if (loader) loader.style.display = 'none';
    }
};

window.initCheckout('SG', 'SGD');
