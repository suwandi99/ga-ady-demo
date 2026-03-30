window.initCheckout = async function(countryCode = 'SG', currencyCode = 'SGD') {
    const loader = document.getElementById('loading-overlay');
    loader.style.display = 'block'; // Show loader

    try {
        const response = await fetch('/api/create-session', {
            method: 'POST',
            body: JSON.stringify({ countryCode, currencyCode }),
            headers: { 'Content-Type': 'application/json' }
        });
        const sessionData = await response.json();

        // Destroy previous instance if it exists
        if (window.checkoutInstance) {
            document.getElementById('dropin-container').innerHTML = '';
        }

        window.checkoutInstance = await AdyenCheckout({
            environment: 'test',
            clientKey: 'test_767VMJ3TGVG53LK5KUWJZSL5KAZWTIT6',
            session: sessionData,
            onPaymentCompleted: (result) => alert(result.resultCode)
        });

        window.checkoutInstance.create('dropin', { 
            showPayButton: false 
        }).mount('#dropin-container');

        // Update UI Text
        document.querySelector('.price-total-amount').innerText = 
            `${currencyCode} ${(sessionData.amount.value / 100).toLocaleString()}`;

        loader.style.display = 'none'; // Hide loader when done
    } catch (error) {
        console.error(error);
        loader.style.display = 'none';
    }
};
