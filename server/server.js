/*
    Run server: npm run devStart (with nodemon in server dir)
                node server.js
*/

require("dotenv").config();

const express = require("express");
const app = express();
app.use(express.json());
app.use(express.static("public"));

const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);

const storeItems = new Map([
    [1, { priceInCents: 10000, name: "Item 1" }],
    [2, { priceInCents: 20000, name: "Item 2" }],
]);


app.get('/config', (req, res) => {
    res.send({
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
});

app.post('/checkout-session', async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: req.body.items.map(item => {
                const storeItem = storeItems.get(item.id)
                return {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: storeItem.name
                        },
                        unit_amount: storeItem.priceInCents
                    },
                    quantity: item.quantity
                }
            }),
            success_url: `${process.env.SERVER_URL}/success.html`,
            cancel_url: `${process.env.SERVER_URL}/cancel.html`
        })
        res.json({ url: session.url })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.post('/checkout-session-fpx', async (req, res) => {
    const { paymentMethodType, currency } = req.body;

    // Each payment method type has support for different currencies. In order to
    // support many payment method types and several currencies, this server
    // endpoint accepts both the payment method type and the currency as
    // parameters.
    //
    // Some example payment method types include `card`, `ideal`, and `alipay`.
    const params = {
        payment_method_types: [paymentMethodType],
        amount: 1999,
        currency: currency,
    }

    // If this is for an ACSS payment, we add payment_method_options to create
    // the Mandate.
    if (paymentMethodType === 'acss_debit') {
        params.payment_method_options = {
            acss_debit: {
                mandate_options: {
                    payment_schedule: 'sporadic',
                    transaction_type: 'personal',
                },
            },
        }
    }

    // Create a PaymentIntent with the amount, currency, and a payment method type.
    //
    // See the documentation [0] for the full list of supported parameters.
    //
    // [0] https://stripe.com/docs/api/payment_intents/create
    try {
        const paymentIntent = await stripe.paymentIntents.create(params);

        // Send publishable key and PaymentIntent details to client
        res.send({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (e) {
        return res.status(400).send({
            error: {
                message: e.message,
            },
        });
    }
});

app.listen(3000);