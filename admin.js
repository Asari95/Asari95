// ==========================================
// JEHOVÁ JIREH - ADMINISTRACIÓN
// Inventario automático al completar ventas
// ==========================================

const cfg = window.JJ_CONFIG;

const supabaseClient = supabase.createClient(
  cfg.SUPABASE_URL,
  cfg.SUPABASE_PUBLISHABLE_KEY
);

const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");
const loginSection = document.getElementById("login-section");
const dashboard = document.getElementById("dashboard");
const adminContent = document.getElementById("admin-content");

let currentUser = null;
let products = [];
let allOrders = [];
let inventoryMovements = [];

function money(amount) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN"
  }).format(Number(amount) || 0);
}

function createTextElement(tag, text) {
  const element = document.createElement(tag);
  element.textContent = text;
  return element;
}

function showMessage(message, isError = true) {
  loginMessage.textContent = message;
  loginMessage.style.color = isError ? "#ffb3a7" : "#a8e6b0";
}

// ==========================================
// RECUPERACIÓN DE CONTRASEÑA
// ==========================================

supabaseClient.auth.onAuthStateChange((event) => {
  if (event !== "PASSWORD_RECOVERY") return;

  loginSection.hidden = true;
  dashboard.hidden = false;

  adminContent.innerHTML = `
    <h2>Restablecer contraseña</h2>
    <p>Escribe tu nueva contraseña para JEHOVÁ JIREH.</p>

    <form id="recovery-form">
      <label>Nueva contraseña</label>
      <input type="password" id="new-password"
        minlength="8" required placeholder="Mínimo 8 caracteres">

      <label>Confirmar contraseña</label>
      <input type="password" id="confirm-password"
        minlength="8" required placeholder="Repite tu contraseña">

      <button type="submit">Guardar nueva contraseña</button>
      <p id="recovery-message"></p>
    </form>
  `;

  document.getElementById("recovery-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const password =
        document.getElementById("new-password").value;

      const confirmation =
        document.getElementById("confirm-password").value;

      const message =
        document.getElementById("recovery-message");

      if (password !== confirmation) {
        message.textContent = "Las contraseñas no coinciden.";
        return;
      }

      message.textContent = "Actualizando contraseña...";

      const { error } = await supabaseClient.auth.updateUser({
        password
      });

      if (error) {
        message.textContent = "Error: " + error.message;
        return;
      }

      message.textContent =
        "¡Contraseña actualizada correctamente!";

      await supabaseClient.auth.signOut();

      dashboard.hidden = true;
      loginSection.hidden = false;
      loginForm.reset();

      showMessage(
        "Ya puedes iniciar sesión con tu nueva contraseña.",
        false
      );
    });
});

// ==========================================
// INICIAR SESIÓN
// ==========================================

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  showMessage("Verificando acceso...", false);

  const email =
    document.getElementById("email").value.trim();

  const password =
    document.getElementById("password").value;

  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

  if (error) {
    showMessage("No se pudo iniciar sesión: " + error.message);
    return;
  }

  currentUser = data.user;
  await showDashboard();
});

// ==========================================
// RECUPERAR CONTRASEÑA
// ==========================================

const recoveryButton = document.createElement("button");

recoveryButton.type = "button";
recoveryButton.textContent = "¿Olvidaste tu contraseña?";
recoveryButton.style.marginTop = "12px";

loginForm.insertAdjacentElement("afterend", recoveryButton);

recoveryButton.addEventListener("click", async () => {
  const email =
    document.getElementById("email").value.trim();

  if (!email) {
    showMessage("Primero escribe tu correo electrónico.", true);
    return;
  }

  showMessage("Solicitando enlace de recuperación...", false);

  const { error } =
    await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo:
        "https://asari95.github.io/Asari95/admin.html"
    });

  if (error) {
    showMessage("No se pudo enviar el correo: " + error.message);
    return;
  }

  showMessage(
    "Solicitud enviada. Revisa tu correo electrónico.",
    false
  );
});

// ==========================================
// COMPROBAR SESIÓN
// ==========================================

async function checkSession() {
  const { data, error } =
    await supabaseClient.auth.getSession();

  if (error) {
    showMessage(
      "Error al verificar la sesión: " + error.message
    );
    return;
  }

  if (data.session) {
    currentUser = data.session.user;
    await showDashboard();
  }
}

// ==========================================
// PANEL DE ADMINISTRACIÓN
// ==========================================

async function showDashboard() {
  loginSection.hidden = true;
  dashboard.hidden = false;

  adminContent.innerHTML = `
    <h2>Administrar productos</h2>
    <p id="admin-message">Cargando productos...</p>

    <section class="product-form">
      <h3>Agregar nuevo producto</h3>

      <form id="product-form">
        <label>Nombre del producto</label>
        <input id="product-name" type="text" required>

        <label>Descripción</label>
        <textarea id="product-description"></textarea>

        <label>Categoría</label>
        <select id="product-category" required>
          <option value="Pulseras">Pulseras</option>
          <option value="Collares">Collares</option>
          <option value="Anillos">Anillos</option>
          <option value="Aretes">Aretes</option>
          <option value="Accesorios">Accesorios</option>
        </select>

        <label>Precio (MXN)</label>
        <input id="product-price" type="number"
          min="0" step="0.01" required>

        <label>Existencias</label>
        <input id="product-stock" type="number"
          min="0" step="1" required>

        <label>Fotografía del producto</label>
        <input id="product-image" type="file" accept="image/*">

        <button type="submit">Guardar producto</button>
      </form>
    </section>

    <hr>

    <h3>Productos registrados</h3>
    <div id="product-list">Cargando...</div>

    <hr>

    <section id="inventory-history-section">
      <h2>Historial de inventario 📦</h2>
      <p id="inventory-message">Cargando movimientos...</p>
      <button type="button" id="reload-inventory">
        Actualizar historial
      </button>
      <div id="inventory-list"></div>
    </section>

    <hr>

    <section id="orders-section">
      <h2>Pedidos recibidos 🛍️</h2>

      <div class="sales-summary" id="sales-summary"></div>

      <h3>Buscar y filtrar pedidos</h3>

      <input type="search" id="order-search"
        placeholder="Buscar por nombre o teléfono...">

      <select id="order-filter">
        <option value="all">Todos los pedidos</option>
        <option value="pending">Pendientes</option>
        <option value="confirmed">Confirmados</option>
        <option value="shipped">Enviados</option>
        <option value="completed">Completados</option>
        <option value="cancelled">Cancelados</option>
      </select>

      <p id="orders-message">Cargando pedidos...</p>

      <button type="button" id="reload-orders">
        Actualizar pedidos
      </button>

      <div id="orders-list"></div>
    </section>
  `;

  document.getElementById("product-form")
      .addEventListener("submit", saveProduct);

  document.getElementById("logout-button")
    .addEventListener("click", logout);

  document.getElementById("reload-orders")
    .addEventListener("click", async () => {
      await loadOrders();
      await loadProducts();
      await loadInventoryMovements();
    });

  document.getElementById("reload-inventory")
    .addEventListener("click", loadInventoryMovements);

  document.getElementById("order-search")
    .addEventListener("input", renderOrders);

  document.getElementById("order-filter")
    .addEventListener("change", renderOrders);

  await loadProducts();
  await loadOrders();
  await loadInventoryMovements();
}

// ==========================================
// CARGAR PRODUCTOS
// ==========================================

async function loadProducts() {
  const message = document.getElementById("admin-message");
  const list = document.getElementById("product-list");

  if (!message || !list) return;

  message.textContent = "Cargando productos...";
  list.textContent = "Cargando...";

  try {
    const { data, error } = await supabaseClient
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      message.textContent =
        "No se pudieron cargar los productos: " + error.message;
      list.textContent = "";
      return;
    }

    products = data || [];

    message.textContent =
      `Productos registrados: ${products.length}`;

    renderProducts();

  } catch (error) {
    message.textContent =
      "Error inesperado: " + error.message;
    list.textContent = "";
  }
}

// ==========================================
// CARGAR PEDIDOS
// ==========================================

async function loadOrders() {
  const message = document.getElementById("orders-message");
  const list = document.getElementById("orders-list");

  if (!message || !list) return;

  message.textContent = "Cargando pedidos...";
  list.innerHTML = "";

  try {
    const { data, error } = await supabaseClient
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      message.textContent =
        "Error al cargar pedidos: " + error.message;
      return;
    }

    allOrders = data || [];

    message.textContent =
      `Pedidos recibidos: ${allOrders.length}`;

    renderSalesSummary();
    renderOrders();

  } catch (error) {
    message.textContent =
      "Error inesperado: " + error.message;
  }
}

// ==========================================
// HISTORIAL DE MOVIMIENTOS DE INVENTARIO
// ==========================================

async function loadInventoryMovements() {
  const message = document.getElementById("inventory-message");
  const list = document.getElementById("inventory-list");

  if (!message || !list) return;

  message.textContent = "Cargando movimientos...";
  list.textContent = "";

  try {
    const { data, error } = await supabaseClient
      .from("inventory_movements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      message.textContent =
        "No se pudo cargar el historial: " + error.message;
      return;
    }

    inventoryMovements = data || [];
    renderInventoryMovements();

  } catch (error) {
    message.textContent =
      "Error inesperado al cargar el historial: " + error.message;
  }
}

function renderInventoryMovements() {
  const message = document.getElementById("inventory-message");
  const list = document.getElementById("inventory-list");

  if (!message || !list) return;

  list.innerHTML = "";

  message.textContent =
    `Movimientos registrados: ${inventoryMovements.length}`;

  if (inventoryMovements.length === 0) {
    list.textContent =
      "Todavía no hay movimientos de inventario registrados.";
    return;
  }

  inventoryMovements.forEach(movement => {
    const card = document.createElement("article");
    card.className = "product-admin-card";

    const typeLabels = {
      sale: "Venta (salida de inventario)",
      restock: "Reabastecimiento (entrada de inventario)",
      adjustment: "Ajuste de inventario"
    };

    const title = createTextElement(
      "h3",
      movement.product_name || "Producto sin nombre"
    );

    const type = createTextElement(
      "p",
      "Movimiento: " +
        (typeLabels[movement.movement_type] ||
         movement.movement_type ||
         "No especificado")
    );

    const quantity = createTextElement(
      "p",
      "Cantidad: " + movement.quantity
    );

    const date = createTextElement(
      "p",
      "Fecha: " +
        new Date(movement.created_at).toLocaleString("es-MX")
    );

    const order = createTextElement(
      "p",
      movement.order_id
        ? "Pedido relacionado: #" + movement.order_id.slice(0, 8)
        : "Sin pedido relacionado"
    );

    const note = createTextElement(
      "p",
      "Nota: " + (movement.note || "Sin nota")
    );

    card.append(title, type, quantity, date, order, note);
    list.appendChild(card);
  });
}

// ==========================================
// RESUMEN DE VENTAS
// ==========================================

function renderSalesSummary() {
  const summary = document.getElementById("sales-summary");

  if (!summary) return;

  const validOrders = allOrders.filter(
    order => order.status !== "cancelled"
  );

  const totalSales = validOrders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  );

  const pending = allOrders.filter(
    order => order.status === "pending"
  ).length;

  const completed = allOrders.filter(
    order => order.status === "completed"
  ).length;

  summary.innerHTML = "";

  const cards = [
    {
      title: "Ventas no canceladas",
      value: money(totalSales)
    },
    {
      title: "Pedidos pendientes",
      value: pending
    },
    {
      title: "Pedidos completados",
      value: completed
    },
    {
      title: "Total de pedidos",
      value: allOrders.length
    }
  ];

  cards.forEach(item => {
    const card = document.createElement("article");
    card.className = "product-admin-card";

    card.append(
      createTextElement("h4", item.title),
      createTextElement("h2", String(item.value))
    );

    summary.appendChild(card);
  });
}

// ==========================================
// WHATSAPP
// ==========================================

function whatsappNumber(phone) {
  let number = String(phone || "").replace(/\D/g, "");

  if (!number) return "";

  if (number.startsWith("521") && number.length === 13) {
    return number;
  }

  if (number.startsWith("52") && number.length === 12) {
    return number;
  }

  if (number.length === 10) {
    return "52" + number;
  }

  return number;
}

function createWhatsAppMessage(order) {
  const details = Array.isArray(order.items)
    ? order.items.map(item =>
        `• ${item.name} | Cantidad: ${item.quantity} | Subtotal: ${money(item.subtotal)}`
      ).join("\n")
    : "Sin detalle de productos";

  return [
    "¡Hola " + order.customer_name + "! 👋",
        "",
    "Te contactamos de JEHOVÁ JIREH.",
    "Este es el detalle de tu pedido:",
    "",
    "Pedido #" + order.id.slice(0, 8),
    details,
    "",
    "Total: " + money(order.total),
    "",
    "¡Gracias por tu compra! 💚"
  ].join("\n");
}

// ==========================================
// MOSTRAR PEDIDOS
// ==========================================

function renderOrders() {
  const list = document.getElementById("orders-list");
  const search = document.getElementById("order-search");
  const filter = document.getElementById("order-filter");

  if (!list || !search || !filter) return;

  list.innerHTML = "";

  const searchText = search.value.trim().toLowerCase();
  const selectedStatus = filter.value;

  const statusLabels = {
    pending: "Pendiente",
    confirmed: "Confirmado",
    shipped: "Enviado",
    completed: "Completado",
    cancelled: "Cancelado"
  };

  const filteredOrders = allOrders.filter(order => {
    const matchesSearch =
      String(order.customer_name || "")
        .toLowerCase().includes(searchText) ||
      String(order.customer_phone || "")
        .toLowerCase().includes(searchText);

    const matchesStatus =
      selectedStatus === "all" ||
      order.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  if (!filteredOrders.length) {
    list.textContent =
      "No se encontraron pedidos con esos criterios.";
    return;
  }

  filteredOrders.forEach(order => {
    const card = document.createElement("article");
    card.className = "product-admin-card";

    const title = createTextElement(
      "h3",
      "Pedido #" + order.id.slice(0, 8)
    );

    const date = createTextElement(
      "p",
      "Fecha: " +
      new Date(order.created_at).toLocaleString("es-MX")
    );

    const customer = createTextElement(
      "p",
      "Cliente: " + (order.customer_name || "Sin nombre")
    );

    const phone = createTextElement(
      "p",
      "Teléfono: " + (order.customer_phone || "No indicado")
    );

    const delivery = createTextElement(
      "p",
      "Entrega: " +
      (order.delivery_method === "envio"
        ? "A domicilio"
        : "Recoger")
    );

    const address = createTextElement(
      "p",
      "Dirección: " + (order.customer_address || "No aplica")
    );

    const references = createTextElement(
      "p",
      "Referencias: " + (order.references_text || "Ninguna")
    );

    const productsTitle =
      createTextElement("strong", "Productos:");

    const productsDetails = createTextElement(
      "p",
      Array.isArray(order.items)
        ? order.items.map(item =>
            `${item.name} | Cantidad: ${item.quantity} | Subtotal: ${money(item.subtotal)}`
          ).join("\n")
        : "Sin detalle de productos"
    );

    productsDetails.style.whiteSpace = "pre-line";

    const total = createTextElement(
      "h3",
      "Total: " + money(order.total)
    );

    const statusText = createTextElement(
      "p",
      "Estado actual: " +
      (statusLabels[order.status] || order.status)
    );

    const select = document.createElement("select");

    Object.entries(statusLabels).forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      option.selected = order.status === value;

      // Evitar reactivar pedidos cancelados
      // o modificar pedidos completados

      if (
        order.status === "cancelled" ||
        order.status === "completed"
      ) {
        option.disabled = value !== order.status;
      }

      // No permitir regresar a pendiente

      if (
        order.status !== "pending" &&
        value === "pending"
      ) {
        option.disabled = true;
      }

      select.appendChild(option);
    });

    const updateButton = document.createElement("button");
    updateButton.type = "button";
    updateButton.textContent = "Actualizar estado";

    updateButton.disabled =
      order.status === "cancelled" ||
      order.status === "completed";

    updateButton.addEventListener("click", () => {
      updateOrderStatus(order.id, select.value, updateButton);
    });

    const whatsappButton = document.createElement("button");
    whatsappButton.type = "button";
    whatsappButton.textContent = "Contactar por WhatsApp";

    const number = whatsappNumber(order.customer_phone);

    if (number) {
      whatsappButton.addEventListener("click", () => {
        const url =
          "https://wa.me/" +
          number +
          "?text=" +
          encodeURIComponent(createWhatsAppMessage(order));

        window.open(url, "_blank", "noopener,noreferrer");
      });
    } else {
      whatsappButton.disabled = true;
      whatsappButton.textContent = "Cliente sin teléfono";
    }

    card.append(
      title,
      date,
      customer,
      phone,
      delivery,
      address,
      references,
      productsTitle,
      productsDetails,
      total,
      statusText,
      select,
      updateButton,
      whatsappButton
    );

    list.appendChild(card);
  });
}

// ==========================================
// ACTUALIZAR ESTADO Y CONTROLAR INVENTARIO
// ==========================================

async function updateOrderStatus(orderId, newStatus, button) {
  const order = allOrders.find(item => item.id === orderId);

  if (!order) {
    alert("No se encontró el pedido.");
    return;
  }

  if (
    order.status === "cancelled" ||
    order.status === "completed"
  ) {
    alert("Este pedido ya tiene un estado definitivo.");
    return;
  }

  if (newStatus === "completed") {
    const confirmation = confirm(
      "¿Deseas completar esta venta?\n\n" +
      "Al continuar, se descontarán automáticamente " +
      "las existencias de los productos vendidos.\n\n" +
      "Esta acción no se puede revertir desde el panel."
    );

    if (!confirmation) return;
  }

  button.disabled = true;

  const originalText = button.textContent;
  button.textContent = "Actualizando...";

  try {
    // Utilizar la función SQL segura de Supabase.
    // El descuento sucede dentro de la misma transacción
    // que completa el pedido.

    const { data, error } = await supabaseClient.rpc(
      "update_order_status_with_inventory",
      {
        p_order_id: orderId,
        p_new_status: newStatus
      }
    );

    if (error) {
      alert(
        "No se pudo actualizar el pedido:\n\n" +
        error.message
      );
      return;
    }

    if (data && data.success === false) {
      alert(data.message || "No se pudo actualizar el pedido.");
      return;
    }

    if (newStatus === "completed") {
      alert(
        "¡Venta completada correctamente! 💚\n\n" +
        "Las existencias se descontaron automáticamente."
      );
    } else {
      alert(
        "¡Estado del pedido actualizado correctamente!"
      );
    }

    await loadOrders();
    await loadProducts();

    if (newStatus === "completed") {
      await loadInventoryMovements();
    }

  } catch (error) {
    alert("Error inesperado: " + error.message);

  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

// ==========================================
// MOSTRAR PRODUCTOS
// ==========================================

function renderProducts() {
  const list = document.getElementById("product-list");

  if (!list) return;

  list.innerHTML = "";

  if (products.length === 0) {
    list.textContent =
      "Todavía no tienes productos registrados.";
    return;
  }

  products.forEach(product => {
    const card = document.createElement("article");
    card.className = "product-admin-card";

    const title = createTextElement("h4", product.name);

    const details = createTextElement(
      "p",
      `${product.category} | ${money(product.price)} | Existencias: ${product.stock}`
    );

    const status = createTextElement(
      "p",
      product.active
        ? "Visible en la tienda"
        : "Oculto en la tienda"
    );

    card.append(title, details, status);

    if (product.image_url) {
      const image = document.createElement("img");
      image.src = product.image_url;
      image.alt = product.name;
      image.style.maxWidth = "130px";
      image.style.borderRadius = "8px";
      card.appendChild(image);
    }

    const editButton = document.createElement("button");
    editButton.textContent = "Editar precio y existencias";
    editButton.addEventListener("click", () => editProduct(product));

    const visibilityButton = document.createElement("button");
    visibilityButton.textContent =
      product.active ? "Ocultar" : "Mostrar";

    visibilityButton.addEventListener(
      "click",
      () => toggleProduct(product)
    );

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Eliminar";
    deleteButton.addEventListener(
      "click",
      () => deleteProduct(product)
    );

    card.append(editButton, visibilityButton, deleteButton);
    list.appendChild(card);
  });
}

// ==========================================
// GUARDAR PRODUCTO
// ==========================================

async function saveProduct(event) {
  event.preventDefault();

  const message = document.getElementById("admin-message");
  message.textContent = "Guardando producto...";

  const name =
    document.getElementById("product-name").value.trim();

  const description =
    document.getElementById("product-description").value.trim();

  const category =
    document.getElementById("product-category").value;

  const price =
    Number(document.getElementById("product-price").value);

  const stock =
    Number(document.getElementById("product-stock").value);

  const imageFile =
    document.getElementById("product-image").files[0];

  if (
    !name ||
    !Number.isFinite(price) ||
    price < 0 ||
    !Number.isInteger(stock) ||
    stock < 0
  ) {
    message.textContent =
      "Revisa el nombre, precio y existencias.";
    return;
  }

  let imageUrl = null;

  if (imageFile) {
    if (!imageFile.type.startsWith("image/")) {
      message.textContent =
        "Selecciona un archivo de imagen válido.";
      return;
    }

    const extension =
      imageFile.name.split(".").pop().toLowerCase();

    const filePath =
      `${currentUser.id}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } =
      await supabaseClient.storage
        .from("product-images")
        .upload(filePath, imageFile);

    if (uploadError) {
      message.textContent =
        "Error al subir la imagen: " + uploadError.message;
      return;
    }

    const { data: publicData } =
      supabaseClient.storage
        .from("product-images")
        .getPublicUrl(filePath);

    imageUrl = publicData.publicUrl;
  }

  const { error } = await supabaseClient
    .from("products")
    .insert({
      name,
      description,
      category,
      price,
      stock,
      image_url: imageUrl,
      active: true
    });

  if (error) {
    message.textContent =
      "Error al guardar: " + error.message;
    return;
  }

  document.getElementById("product-form").reset();

  message.textContent =
    "¡Producto guardado correctamente!";

  await loadProducts();
}

// ==========================================
// EDITAR PRODUCTO
// ==========================================

async function editProduct(product) {
  const newPrice =
    prompt("Nuevo precio en MXN:", product.price);

  if (newPrice === null) return;

  const newStock =
    prompt("Nuevas existencias:", product.stock);

  if (newStock === null) return;

  const price = Number(newPrice);
  const stock = Number(newStock);

  if (
    !Number.isFinite(price) ||
    price < 0 ||
    !Number.isInteger(stock) ||
    stock < 0
  ) {
    alert("Introduce un precio y existencias válidos.");
    return;
  }

  const { error } = await supabaseClient
    .from("products")
    .update({ price, stock })
    .eq("id", product.id);

  if (error) {
    alert("No se pudo actualizar: " + error.message);
    return;
  }

  await loadProducts();
}

// ==========================================
// MOSTRAR U OCULTAR PRODUCTO
// ==========================================

async function toggleProduct(product) {
  const { error } = await supabaseClient
    .from("products")
    .update({ active: !product.active })
    .eq("id", product.id);

  if (error) {
    alert("No se pudo cambiar la visibilidad: " + error.message);
    return;
  }

  await loadProducts();
}

// ==========================================
// ELIMINAR PRODUCTO
// ==========================================

async function deleteProduct(product) {
  if (!confirm(`¿Deseas eliminar "${product.name}"?`)) {
    return;
  }

  const { error } = await supabaseClient
    .from("products")
    .delete()
    .eq("id", product.id);

  if (error) {
    alert("No se pudo eliminar: " + error.message);
    return;
  }

  await loadProducts();
}

// ==========================================
// CERRAR SESIÓN
// ==========================================

async function logout() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    alert("No se pudo cerrar sesión: " + error.message);
    return;
  }

  currentUser = null;
  dashboard.hidden = true;
  loginSection.hidden = false;
  loginForm.reset();

  showMessage("Sesión cerrada correctamente.", false);
}

// ==========================================
// INICIAR
// ==========================================

checkSession();
