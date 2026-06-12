(function () {
  const CART_KEY = 'natural-skin-cart';

  const cartToggle = document.getElementById('cart-toggle');
  const cartDrawer = document.getElementById('cart-drawer');
  const cartBackdrop = document.getElementById('cart-backdrop');
  const cartClose = document.getElementById('cart-close');
  const cartItemsEl = document.getElementById('cart-items');
  const cartEmptyEl = document.getElementById('cart-empty');
  const cartTotalEl = document.getElementById('cart-total');
  const cartCountEl = document.getElementById('cart-count');
  const checkoutBtn = document.getElementById('checkout-btn');
  const checkoutError = document.getElementById('checkout-error');
  const addToCartBtn = document.getElementById('add-to-cart');
  const qtySelect = document.getElementById('qty-select');

  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function formatPrice(cents) {
    return '$' + (cents / 100).toFixed(2);
  }

  function addToCart(item, qty) {
    const cart = loadCart();
    const existing = cart.find((line) => line.id === item.id);
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({ id: item.id, name: item.name, price: item.price, image: item.image, qty: qty });
    }
    saveCart(cart);
    renderCart();
  }

  function updateQty(id, delta) {
    const cart = loadCart();
    const line = cart.find((l) => l.id === id);
    if (!line) return;
    line.qty += delta;
    if (line.qty <= 0) {
      removeItem(id, cart);
      return;
    }
    saveCart(cart);
    renderCart();
  }

  function removeItem(id, cart) {
    const updated = (cart || loadCart()).filter((l) => l.id !== id);
    saveCart(updated);
    renderCart();
  }

  function calcTotal(cart) {
    return cart.reduce((sum, line) => sum + line.price * line.qty, 0);
  }

  function renderCart() {
    const cart = loadCart();
    const itemCount = cart.reduce((sum, line) => sum + line.qty, 0);
    cartCountEl.textContent = itemCount;

    cartItemsEl.innerHTML = '';

    if (cart.length === 0) {
      cartEmptyEl.hidden = false;
      cartItemsEl.appendChild(cartEmptyEl);
      checkoutBtn.disabled = true;
    } else {
      cartEmptyEl.hidden = true;
      checkoutBtn.disabled = false;

      cart.forEach((line) => {
        const item = document.createElement('div');
        item.className = 'cart-item';
        item.innerHTML = `
          <img src="${line.image}" alt="${line.name}" />
          <div>
            <p class="cart-item-name">${line.name}</p>
            <p class="cart-item-price">${formatPrice(line.price)} each</p>
            <div class="cart-item-qty">
              <button class="qty-btn" data-action="decrease" data-id="${line.id}" aria-label="Decrease quantity">&minus;</button>
              <span>${line.qty}</span>
              <button class="qty-btn" data-action="increase" data-id="${line.id}" aria-label="Increase quantity">+</button>
            </div>
          </div>
          <div>
            <p class="cart-item-total">${formatPrice(line.price * line.qty)}</p>
            <button class="cart-item-remove" data-action="remove" data-id="${line.id}">Remove</button>
          </div>
        `;
        cartItemsEl.appendChild(item);
      });
    }

    cartTotalEl.textContent = formatPrice(calcTotal(cart));
  }

  // Cart item interactions (delegated)
  cartItemsEl.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const id = target.dataset.id;
    const action = target.dataset.action;
    if (action === 'increase') updateQty(id, 1);
    if (action === 'decrease') updateQty(id, -1);
    if (action === 'remove') removeItem(id);
  });

  // Drawer open/close
  function openCart() {
    cartDrawer.classList.add('is-open');
    cartBackdrop.classList.add('is-open');
  }

  function closeCart() {
    cartDrawer.classList.remove('is-open');
    cartBackdrop.classList.remove('is-open');
  }

  cartToggle.addEventListener('click', openCart);
  cartClose.addEventListener('click', closeCart);
  cartBackdrop.addEventListener('click', closeCart);

  // Add to cart
  addToCartBtn.addEventListener('click', () => {
    const item = {
      id: addToCartBtn.dataset.id,
      name: addToCartBtn.dataset.name,
      price: parseInt(addToCartBtn.dataset.price, 10),
      image: addToCartBtn.dataset.image,
    };
    const qty = parseInt(qtySelect.value, 10);
    addToCart(item, qty);
    openCart();
  });

  // Gallery thumbnails
  document.querySelectorAll('.thumb').forEach((thumb) => {
    thumb.addEventListener('click', () => {
      document.querySelectorAll('.thumb').forEach((t) => t.classList.remove('is-active'));
      thumb.classList.add('is-active');
      document.getElementById('gallery-main-img').src = thumb.dataset.img;
    });
  });

  // Checkout
  checkoutBtn.addEventListener('click', async () => {
    const cart = loadCart();
    if (cart.length === 0) return;

    checkoutError.hidden = true;
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'Redirecting…';

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((line) => ({ id: line.id, name: line.name, price: line.price, qty: line.qty })),
        }),
      });

      let data;
      try {
        data = await res.json();
      } catch (e) {
        throw new Error('Checkout is unavailable right now. Please try again shortly.');
      }

      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Could not start checkout.');
      }

      window.location.href = data.url;
    } catch (err) {
      checkoutError.textContent = err.message || 'Something went wrong starting checkout.';
      checkoutError.hidden = false;
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = 'Checkout';
    }
  });

  // Footer year
  document.getElementById('year').textContent = new Date().getFullYear();

  renderCart();
})();
