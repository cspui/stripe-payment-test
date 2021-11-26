const button = document.querySelector("button")

button.addEventListener("click", () => {
    fetch('/checkout-session', {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            items: [
                {id: 1, quantity: 3},
                {id: 2, quantity: 2}
            ],
        }),
    }).then(res => {
        if (res.ok) return res.json();
        return res.json().then(json => Promise.reject(json));
    }).then(({ url }) => {
        window.location = url;
    })
})