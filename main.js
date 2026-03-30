window.initCheckout = async function(countryCode = 'SG', currencyCode = 'SGD') {
    const loader = document.getElementById('loading-overlay');
    const successOverlay = document.getElementById('success-overlay');
    loader.style.display = 'block';

    try {
        const response = await fetch('/api/create-session', {
            method: 'POST',
            body: JSON.stringify({ countryCode, currencyCode }),
            headers: { 'Content-Type': 'application/json' }
        });
        const sessionData = await response.json();

        const checkout = await AdyenCheckout({
            environment: 'test',
            clientKey: 'test_767VMJ3TGVG53LK5KUWJZSL5KAZWTIT6',
            session: sessionData,
            onPaymentCompleted: (result) => {
                console.log("Payment Result:", result.resultCode);
                
                // If payment is successful, show the Garuda Success UI
                if (result.resultCode === 'Authorised' || result.resultCode === 'Pending') {
                    successOverlay.classList.remove('hide');
                    successOverlay.style.display = 'block';
                } else {
                    alert("Payment Status: " + result.resultCode);
                }
            },
            onError: (error) => console.error(error)
        });

        const dropin = checkout.create('dropin', { 
            showPayButton: false 
        }).mount('#dropin-container');

        // Update Price UI
        document.querySelector('.price-total-amount').innerText = 
            `${currencyCode} ${(sessionData.amount.value / 100).toLocaleString()}`;

        loader.style.display = 'none';

        // Link the external Garuda Red Button
        document.getElementById('ga-continue-btn').onclick = () => dropin.submit();

    } catch (error) {
        console.error(error);
        loader.style.display = 'none';
    }
};
