
(() => {
  const config = window.JJ_CONFIG || {};

  const statusEl = document.getElementById("status");
  const productsEl = document.getElementById("products");
  const countEl = document.getElementById("product-count");

  let products = [];
  let cart = [];
  let supabaseClient = null;
  let selectedCategory = "todas";

  const CART_KEY = "jj_shopping_cart";
  const WHATSAPP_PHONE = "529996165485";

  try {
    cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    if (!Array.isArray(cart)) cart = [];
  } catch {
    cart = [];
  }

  const escapeHtml = (value = "") =>
    String(value).replace(/[&<>"']/g, ch => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[ch]));

  const money = value =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN"
    }).format(Number(value || 0));

  function showError(message) {
    statusEl.textContent = message;
    statusEl.classList.add("error");
  }

  // CARRITO

  const cartEl = document.createElement("section");
  cartEl.id = "shopping-cart";

  cartEl.innerHTML = `
    <h2>Mi carrito 🛒</h2>
    <p id="cart-count">0 productos</p>
    <div id="cart-items"></div>

    <div class="cart-total">
      <strong>Total: <span id="cart-total">$0.00</span></strong>
    </div>

    <button id="checkout-whatsapp"
      class="add-cart-button"
      type="button">
      Finalizar pedido por WhatsApp
    </button>
  `;

  productsEl.insertAdjacentElement("beforebegin", cartEl);

  // FILTROS DE CATEGORÍAS

  const categoryFilterEl = document.createElement("div");
  categoryFilterEl.id = "category-filters";

  categoryFilterEl.innerHTML = `
    <p class="filter-title">EXPLORA POR CATEGORÍA</p>
    <div id="category-buttons"></div>
  `;

  productsEl.insertAdjacentElement("beforebegin", categoryFilterEl);

  // ESTILOS

  const style = document.createElement("style");

  style.textContent = `
    #shopping-cart {
      margin: 24px 0;
      padding: 22px;
      border: 1px solid #dfcba8;
      border-radius: 12px;
      background: #fffaf6;
      color: #4b3026;
    }

    #shopping-cart h2 {
      margin-top: 0;
      font-family: "Playfair Display", serif;
    }

    .cart-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid #eadbd0;
    }

    .cart-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .cart-controls button,
    .add-cart-button {
      border: 0;
      border-radius: 7px;
      padding: 10px 13px;
      cursor: pointer;
      background: #4b3026;
      color: white;
    }

    .cart-controls .remove-cart {
      background: #a33b32;
    }

    .cart-total {
      text-align: right;
      font-size: 19px;
      margin-top: 16px;
    }

    .add-cart-button {
      width: 100%;
      margin-top: 12px;
    }

    .add-cart-button:disabled {
      background: #aaa;
      cursor: not-allowed;
    }

    .empty-cart {
      color: #927d70;
      padding: 10px 0;
    }

    #category-filters {
      margin: 30px 0;
      text-align: center;
    }

    .filter-title {
      color: #927d70;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 2px;
      margin-bottom: 15px;
    }

    #category-buttons {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 10px;
    }

    .category-filter-button {
      width: auto;
      margin: 0;
      padding: 11px 19px;
      border: 1px solid #d9c5b7;
      border-radius: 30px;
      background: #fffaf6;
      color: #4b3026;
      font-size: 12px;
      letter-spacing: .4px;
      cursor: pointer;
      transition: .2s;
    }

    .category-filter-button:hover,
    .category-filter-button.active {
      background: #4b3026;
      border-color: #4b3026;
      color: white;
    }

    button {
      font-family: "DM Sans", sans-serif;
      transition: .2s;
    }

    button:disabled {
      cursor: not-allowed;
      opacity: .55;
    }

    @media(max-width: 600px) {
      #shopping-cart {
        padding: 16px;
      }

      .category-filter-button {
        padding: 9px 13px;
        font-size: 11px;
      }
    }
  `;

  document.head.appendChild(style);

  function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  // MOSTRAR CARRITO

  function renderCart() {
    const itemsEl = document.getElementById("cart-items");
    const totalEl = document.getElementById("cart-total");
    const cartCountEl = document.getElementById("cart-count");

    cart = cart.filter(item =>
      products.some(product => product.id === item.id)
    );

    let total = 0;
    let units = 0;

    if (!cart.length) {
      itemsEl.innerHTML =
        '<p class="empty-cart">Tu carrito está vacío.</p>';
    } else {
      itemsEl.innerHTML = cart.map(item => {
        const product = products.find(p => p.id === item.id);

        if (!product) return "";

        const subtotal = Number(product.price) * item.quantity;

        total += subtotal;
        units += item.quantity;

        return `
          <div class="cart-item">
            <div>
              <strong>${escapeHtml(product.name)}</strong>
              <div>${money(product.price)} × ${item.quantity}</div>
              <strong>Subtotal: ${money(subtotal)}</strong>
            </div>

            <div class="cart-controls">
              <button data-action="decrease"
                data-id="${escapeHtml(item.id)}">−</button>

              <span>${item.quantity}</span>

              <button data-action="increase"
                data-id="${escapeHtml(item.id)}">+</button>

              <button class="remove-cart"
                data-action="remove"
                data-id="${escapeHtml(item.id)}">
                Eliminar
              </button>
            </div>
          </div>
        `;
      }).join("");
    }

    cartCountEl.textContent =
      `${units} producto${units === 1 ? "" : "s"}`;

    totalEl.textContent = money(total);

    saveCart();
  }

  // AGREGAR PRODUCTO

  function addToCart(id) {
    const product = products.find(p => p.id === id);

    if (!product || Number(product.stock) <= 0) return;

    const existing = cart.find(item => item.id === id);

    if (existing) {
      if (existing.quantity >= Number(product.stock)) {
        alert("No hay más existencias disponibles de este producto.");
        return;
      }

      existing.quantity++;
    } else {
      cart.push({
        id,
        quantity: 1
      });
    }

    renderCart();
  }

  // CONSTRUIR CATEGORÍAS AUTOMÁTICAMENTE

  function renderCategories() {
    const buttonsEl = document.getElementById("category-buttons");

    const categories = [
      ...new Map(
        products
          .filter(product => product.category)
          .map(product => [
            String(product.category).trim().toLowerCase(),
            String(product.category).trim()
          ])
      ).values()
    ];

    const buttons = [
      { key: "todas", label: "Todas" },
      ...categories.map(category => ({
        key: category.toLowerCase(),
        label: category
      }))
    ];

    if (
      selectedCategory !== "todas" &&
      !categories.some(c => c.toLowerCase() === selectedCategory)
    ) {
      selectedCategory = "todas";
    }

    buttonsEl.innerHTML = buttons.map(category => `
      <button
        type="button"
        class="category-filter-button ${
          selectedCategory === category.key ? "active" : ""
        }"
        data-category="${escapeHtml(category.key)}">
        ${escapeHtml(category.label)}
      </button>
    `).join("");
  }

  // MOSTRAR PRODUCTOS

  function renderProducts() {
    const filteredProducts = selectedCategory === "todas"
      ? products
      : products.filter(product =>
          String(product.category || "").trim().toLowerCase()
          === selectedCategory
        );

    if (!filteredProducts.length) {
      productsEl.innerHTML = `
        <p style="grid-column:1/-1;text-align:center;color:#927d70;padding:30px;">
          No hay productos en esta categoría.
        </p>
      `;
      return;
    }

    productsEl.innerHTML = filteredProducts.map(product => {
      const stock = Number(product.stock);

      const image = product.image_url
        ? `<img src="${escapeHtml(product.image_url)}"
             alt="${escapeHtml(product.name)}"
             loading="lazy">`
        : `<div class="image-placeholder">JEHOVÁ JIREH</div>`;

      const stockText = stock > 0 ? "Disponible" : "Agotado";

      return `
        <article class="product-card">
          <div class="product-image">
            ${image}
          </div>

          <div class="product-info">
            <span class="category">
              ${escapeHtml(product.category || "Accesorios")}
            </span>

            <h3>${escapeHtml(product.name)}</h3>

            ${product.description
              ? `<p>${escapeHtml(product.description)}</p>`
              : ""}

            <div class="product-bottom">
              <strong>${money(product.price)}</strong>

              <span class="${stock > 0 ? "in-stock" : "out-stock"}">
                ${stockText}
              </span>
            </div>

            <button
              class="add-cart-button"
              data-add="${escapeHtml(product.id)}"
              ${stock <= 0 ? "disabled" : ""}>
              ${stock > 0 ? "Agregar al carrito 🛒" : "Agotado"}
            </button>
          </div>
        </article>
      `;
    }).join("");
  }

  // FILTRAR AL SELECCIONAR CATEGORÍA

  categoryFilterEl.addEventListener("click", event => {
    const button = event.target.closest("[data-category]");

    if (!button) return;

    selectedCategory = button.dataset.category;

    renderCategories();
    renderProducts();
  });

  // FINALIZAR PEDIDO

  document.getElementById("checkout-whatsapp")
    .addEventListener("click", async () => {

      if (!cart.length) {
        alert("Tu carrito está vacío.");
        return;
      }

      if (!supabaseClient) {
        alert("La conexión todavía no está lista. Inténtalo nuevamente.");
        return;
      }

      const name = prompt("¿Cuál es tu nombre completo?");

      if (!name || !name.trim()) {
        alert("Necesitamos tu nombre para continuar.");
        return;
      }

      const customerPhone = prompt(
        "¿Cuál es tu número de teléfono?"
      );

      if (!customerPhone || !customerPhone.trim()) {
        alert("Necesitamos tu teléfono para continuar.");
        return;
      }

      const delivery = prompt(
        "Selecciona el método de entrega:\n\n" +
        "1. Envío a domicilio\n" +
        "2. Recoger mi pedido"
      );

      if (delivery !== "1" && delivery !== "2") {
        alert("Selecciona 1 para envío o 2 para recoger.");
        return;
      }

      let address = "";
      let references = "";

      if (delivery === "1") {
        address = prompt("Escribe tu dirección completa:");

        if (!address || !address.trim()) {
          alert("Necesitamos tu dirección de entrega.");
          return;
        }

        references = prompt(
          "¿Tienes alguna referencia para localizar tu domicilio?"
        ) || "Sin referencias";
      }

      let total = 0;

      const details = cart.map(item => {
        const product = products.find(p => p.id === item.id);

        if (!product) return "";

        const subtotal = Number(product.price) * item.quantity;

        total += subtotal;

        return `• ${product.name}
Cantidad: ${item.quantity}
Precio unitario: ${money(product.price)}
Subtotal: ${money(subtotal)}`;
      }).filter(Boolean).join("\n\n");

      if (!details) {
        alert("No se encontraron los productos de tu carrito.");
        return;
      }

      const deliveryText = delivery === "1"
        ? "Envío a domicilio"
        : "Recoger pedido";

      const message = `¡Hola! Quiero realizar un pedido en JEHOVÁ JIREH.

DATOS DEL CLIENTE
Nombre: ${name.trim()}
Teléfono: ${customerPhone.trim()}
Entrega: ${deliveryText}
${delivery === "1"
  ? `Dirección: ${address.trim()}\nReferencias: ${references.trim()}`
  : ""}

DETALLE DEL PEDIDO

${details}

TOTAL: ${money(total)}

¡Gracias! Quedo pendiente de la confirmación de mi pedido.`;

      const confirmation = confirm(
        `RESUMEN DE TU PEDIDO\n\n` +
        `Cliente: ${name}\n` +
        `Entrega: ${deliveryText}\n` +
        `Total: ${money(total)}\n\n` +
        `¿Deseas continuar a WhatsApp?`
      );

      if (!confirmation) return;

      const orderItems = cart.map(item => {
        const product = products.find(p => p.id === item.id);

        if (!product) return null;

        return {
          product_id: product.id,
          name: product.name,
          quantity: item.quantity,
          unit_price: Number(product.price),
          subtotal: Number(product.price) * item.quantity
        };
      }).filter(Boolean);

      if (!orderItems.length) {
        alert("No se encontraron productos para registrar.");
        return;
      }

      const checkoutButton =
        document.getElementById("checkout-whatsapp");

      checkoutButton.disabled = true;
      checkoutButton.textContent = "Registrando pedido...";

      try {
        const { error: orderError } = await supabaseClient
          .from("orders")
          .insert({
            customer_name: name.trim(),
            customer_phone: customerPhone.trim(),
            customer_address: delivery === "1"
              ? address.trim()
              : null,
            delivery_method: delivery === "1"
              ? "envio"
              : "recoger",
            references_text: delivery === "1"
              ? references.trim()
              : null,
            items: orderItems,
            total: total,
            status: "pending"
          });

        if (orderError) {
          console.error("Error al guardar pedido:", orderError);
          alert(
            "No se pudo registrar tu pedido. Inténtalo nuevamente."
          );
          return;
        }

        const whatsappURL =
          `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;

        alert("Pedido guardado. Ahora se abrirá WhatsApp.");

        window.location.assign(whatsappURL);

      } catch (error) {
        console.error("Error inesperado:", error);
        alert("Ocurrió un problema al procesar tu pedido.");

      } finally {
        checkoutButton.disabled = false;
        checkoutButton.textContent =
          "Finalizar pedido por WhatsApp";
      }
    });

  // BOTONES PARA AGREGAR AL CARRITO

  productsEl.addEventListener("click", event => {
    const button = event.target.closest("[data-add]");

    if (button) {
      addToCart(button.dataset.add);
    }
  });

  // MODIFICAR O ELIMINAR PRODUCTOS

  cartEl.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    const id = button.dataset.id;
    const item = cart.find(entry => entry.id === id);
    const product = products.find(p => p.id === id);

    if (!item || !product) return;

    if (button.dataset.action === "increase") {
      if (item.quantity < Number(product.stock)) {
        item.quantity++;
      } else {
        alert("No hay más existencias disponibles.");
      }
    }

    if (button.dataset.action === "decrease") {
      item.quantity--;

      if (item.quantity <= 0) {
        cart = cart.filter(entry => entry.id !== id);
      }
    }

    if (button.dataset.action === "remove") {
      cart = cart.filter(entry => entry.id !== id);
    }

    renderCart();
  });

  // CARGAR PRODUCTOS DESDE SUPABASE

  async function loadProducts() {
    if (
      !window.supabase ||
      !config.SUPABASE_URL ||
      !config.SUPABASE_PUBLISHABLE_KEY ||
      config.SUPABASE_URL.includes("PEGA_AQUI") ||
      config.SUPABASE_PUBLISHABLE_KEY.includes("PEGA_AQUI")
    ) {
      showError("Falta configurar la conexión de Supabase en config.js.");
      return;
    }

    supabaseClient = window.supabase.createClient(
      config.SUPABASE_URL,
      config.SUPABASE_PUBLISHABLE_KEY
    );

    const { data, error } = await supabaseClient
      .from("products")
      .select(
        "id, name, description, category, price, stock, image_url"
      )
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error al cargar productos:", error);

      showError(
        "No pudimos cargar los productos. Revisa las políticas de lectura de products."
      );

      return;
    }

    products = data || [];

    countEl.textContent =
      `${products.length} producto${products.length === 1 ? "" : "s"}`;

    statusEl.classList.remove("error");

    if (!products.length) {
      statusEl.textContent =
        "Próximamente encontrarás aquí nuestra colección.";
    } else {
      statusEl.textContent = "";
    }

    renderCategories();
    renderProducts();
    renderCart();
  }

  // INICIAR TIENDA

  loadProducts();

})();

