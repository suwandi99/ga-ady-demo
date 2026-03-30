// Add 'window.' to make initCheckout globally visible for index.html's onload
window.initCheckout = async function() {
    console.log("Garuda Indonesia Revamped UI Initializing...");
    
    // Start the simulated countdown timer
    startCountdown(15 * 60); // 15 minutes

    try {
        // 1. Call your Cloudflare Backend Function
        // Ensure your fetch URL matches your file structure, /create-session or /api/create-session
        const response = await fetch('/create-session'); 
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server responded with ${response.status}: ${errorText}`);
        }

        const sessionData = await response.json();
        console.log("Session created successfully:", sessionData.id);

        // 2. Initialize Adyen Checkout
        const checkout = await AdyenCheckout({
            environment: 'test',
            clientKey: 'test_767VMJ3TGVG53LK5KUWJZSL5KAZWTIT6', // Use your test_... key, not secret API Key
            session: {
                id: sessionData.id,
                sessionData: sessionData.sessionData
            },
            
            // Branding and Customization for Garuda Blue/Gold
            analytics: { enabled: false },
            onPaymentCompleted: (result) => {
                alert("Simulated Booking Status: " + result.resultCode);
                
                if (result.resultCode === 'Authorised') {
                    document.getElementById('dropin-container').innerHTML = `
                        <div style="text-align:center; padding:40px; color:#002561;">
                            <h2 style="color: #2F6F7E;">✔ Booking Confirmed!</h2>
                            <p>Thank you for choosing Garuda Indonesia.</p>
                            <p>Your e-ticket has been sent.</p>
                        </div>`;
                }
            },
            
            // INDONESIA LOCALIZATION (Forces GoPay, DANA, etc. language)
            locale: "id-ID"
        });

        // 3. Create the Drop-in
        const dropin = checkout.create('dropin');
        
        // 4. Mount the Drop-in to the Left Column
        dropin.mount('#dropin-container');
        console.log("Drop-in mounted in Left Column.");

        // --- NEW: Handle the Red Sidebar "Continue Payment" Button ---
        // Since we hide the Adyen primary button in CSS, we must link 
        // the new sidebar button to the Adyen payment flow.
        document.getElementById('ga-final-continue-btn').addEventListener('click', () => {
            console.log("Sidebar button clicked. Submitting payment form...");
            // Force the Adyen form to submit (requires 'test_...' clientKey in main flow)
            dropin.submit();
        });

    } catch (e) {
        console.error("Critical Failure:", e);
        document.getElementById('dropin-container').innerHTML = 
            `<div style="color:red; padding:20px;"><strong>Error:</strong> ${e.message}<br>
            Please check Browser Console (F12) for details.</div>`;
    }
}

// --- Helper Function: Simulated Countdown Timer ---
function startCountdown(duration) {
    let timer = duration, minutes, seconds;
    const display = document.getElementById('countdown-timer');
    
    let countdownInterval = setInterval(function () {
        minutes = parseInt(timer / 60, 10);
        seconds = parseInt(timer % 60, 10);

        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        display.textContent = minutes + ":" + seconds;

        if (--timer < 0) {
            clearInterval(countdownInterval);
            display.textContent = "00:00 - EXPIRED";
            alert("This simulation has expired. Please refresh the page.");
        }
    }, 1000);
}
