(() => {
  const config = window.JJ_CONFIG || {};
  const statusEl = document.getElementById("status");
  const productsEl = document.getElementById("products");
  const countEl = document.getElementById("product-count");

  const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));

  const money = value => new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN"
  }).format(Number(value || 0));

  function showError(message) {
    statusEl.textContent = message;
    statusEl.classList.add("error");
  }

  async function loadProducts() {
    if (!window.supabase || !config.SUPABASE_URL || !config.SUPABASE_PUBLISHABLE_KEY ||
        config.SUPABASE_URL.includes("PEGA_AQUI") ||
        config.SUPABASE_PUBLISHABLE_KEY.includes("PEGA_AQUI")) {
      showError("Falta configurar la conexión de Supabase en config.js.");
      return;
    }

    const client = window.supabase.createClient(
      config.SUPABASE_URL,
      config.SUPABASE_PUBLISHABLE_KEY
    );

    const { data, error } = await client
      .from("products")
      .select("id, name, description, category, price, stock, image_url")
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      showError("No pudimos cargar los productos. Revisa las políticas de lectura de la tabla products.");
      return;
    }

    countEl.textContent = `${data.length} producto${data.length === 1 ? "" : "s"}`;
    statusEl.classList.remove("error");

    if (!data.length) {
      statusEl.textContent = "Próximamente encontrarás aquí nuestra colección. Estamos preparando los primeros productos.";
      return;
    }

    statusEl.textContent = "";
    productsEl.innerHTML = data.map(product => {
      const image = product.image_url
        ? `<img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}" loading="lazy">`
        : `<div class="image-placeholder">JEHOVÁ JIREH</div>`;
      const stockText = Number(product.stock) > 0 ? "Disponible" : "Agotado";
      return `<article class="product-card">
        <div class="product-image">${image}</div>
        <div class="product-info">
          <span class="category">${escapeHtml(product.category)}</span>
          <h3>${escapeHtml(product.name)}</h3>
          ${product.description ? `<p>${escapeHtml(product.description)}</p>` : ""}
          <div class="product-bottom"><strong>${money(product.price)}</strong><span class="${Number(product.stock) > 0 ? "in-stock" : "out-stock"}">${stockText}</span></div>
        </div>
      </article>`;
    }).join("");
  }

  loadProducts();
})();
