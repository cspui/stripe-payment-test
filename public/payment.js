document.addEventListener('DOMContentLoaded', async () => {


    //============stripe===============
    // Normal banking payment (USD)
    const normal_btn = document.querySelector("#normal")

    normal_btn.addEventListener("click", () => {
        // Make a call to the server for payment intent 
        fetch('/checkout-session', {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                items: [
                    { id: 1, quantity: 3 },
                    { id: 2, quantity: 2 }
                ],
            }),
        }).then(res => {
            if (res.ok) return res.json();
            return res.json().then(json => Promise.reject(json));
        }).then(({ url }) => {
            window.location = url;
        })
    })


    // FPX payment (RM)
    const {publishableKey} = await fetch('/config').then(r => r.json());
    const stripe = Stripe(publishableKey);

    const elements = stripe.elements();
    const fpxBank = elements.create('fpxBank', {
        accountHolderType: 'individual',
    });
    fpxBank.mount('#fpx-bank-element');

    // When the form is submitted...
    var form = document.getElementById('payment-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Make a call to the server to create a new
        // payment intent and store its client_secret.
        const { error: backendError, clientSecret } = await fetch(
            '/checkout-session-fpx',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    currency: 'myr',
                    paymentMethodType: 'fpx',
                }),
            }
        ).then((r) => r.json());

        if (backendError) {
            addMessage(backendError.message);
            return;
        }

        addMessage(`Client secret returned.`);

        // Confirm the fpxBank payment given the clientSecret
        // from the payment intent that was just created on
        // the server.
        const { error: stripeError, paymentIntent } = await stripe.confirmFpxPayment(
            clientSecret,
            {
                payment_method: {
                    fpx: fpxBank,
                },
                return_url: `${window.location.origin}/return.html`,
            }
        );

        if (stripeError) {
            addMessage(stripeError.message);
        }

        addMessage(`Payment ${paymentIntent.status}: ${paymentIntent.id}`);
    });




    //===========paypal=============
    let amountElement = document.getElementById("amount")
    paypal.Buttons({
        // Sets up the transaction when a payment button is clicked
        createOrder: function(data, actions) {
          return actions.order.create({
            purchase_units: [{
              amount: {
                value: amountElement.value 
              }
            }]
          });
        },

        // Finalize the transaction after payer approval
        onApprove: function(data, actions) {
          return actions.order.capture().then(function(orderData) {
            // Successful capture! For dev/demo purposes:
                console.log('Capture result', orderData, JSON.stringify(orderData, null, 2));
                var transaction = orderData.purchase_units[0].payments.captures[0];
                alert('Transaction '+ transaction.status + ': ' + transaction.id + '\n\nSee console for all available details');

            // When ready to go live, remove the alert and show a success message within this page. For example:
            // Or go to another URL:  actions.redirect('thank_you.html');
          });
        }
      }).render('#paypal');

});