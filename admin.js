
// JEHOVÁ JIREH - Administración

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

function showMessage(message, isError = true) {
  loginMessage.textContent = message;
  loginMessage.style.color = isError ? "#ffb3a7" : "#a8e6b0";
}

// Iniciar sesión
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  showMessage("Verificando acceso...", false);

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({
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

// Comprobar sesión existente
async function checkSession() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    showMessage("Error al verificar la sesión.");
    return;
  }

  if (data.session) {
    currentUser = data.session.user;
    await showDashboard();
  }
}

// Mostrar panel
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
        <input id="product-price" type="number" min="0" step="0.01" required>

        <label>Existencias</label>
        <input id="product-stock" type="number" min="0" step="1" required>

        <label>Fotografía del producto</label>
        <input id="product-image" type="file" accept="image/*">

        <button type="submit">Guardar producto</button>
      </form>
    </section>

    <hr>

    <h3>Productos registrados</h3>
    <div id="product-list">Cargando...</div>
  `;

  document.getElementById("product-form")
    .addEventListener("submit", saveProduct);

  document.getElementById("logout-button")
    .addEventListener("click", logout);

  await loadProducts();
}

// Cargar productos
async function loadProducts() {
  const message = document.getElementById("admin-message");
  const list = document.getElementById("product-list");

  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    message.textContent = "No se pudieron cargar los productos: " + error.message;
    list.textContent = "";
    return;
  }

  products = data || [];
  message.textContent = `Productos registrados: ${products.length}`;

  renderProducts();
}

// Mostrar productos
function renderProducts() {
  const list = document.getElementById("product-list");
  list.innerHTML = "";

  if (products.length === 0) {
    list.textContent = "Todavía no tienes productos registrados.";
    return;
  }

  products.forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-admin-card";

    const title = document.createElement("h4");
    title.textContent = product.name;

    const details = document.createElement("p");
    details.textContent =
      `${product.category} | $${Number(product.price).toFixed(2)} MXN | Existencias: ${product.stock}`;

    const status = document.createElement("p");
    status.textContent = product.active ? "Visible en la tienda" : "Oculto en la tienda";

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
    visibilityButton.textContent = product.active ? "Ocultar" : "Mostrar";
    visibilityButton.addEventListener("click", () => toggleProduct(product));

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Eliminar";
    deleteButton.addEventListener("click", () => deleteProduct(product));

    card.append(editButton, visibilityButton, deleteButton);
    list.appendChild(card);
  });
}

// Subir imagen y guardar producto
async function saveProduct(event) {
  event.preventDefault();

  const message = document.getElementById("admin-message");
  message.textContent = "Guardando producto...";

  const name = document.getElementById("product-name").value.trim();
  const description = document.getElementById("product-description").value.trim();
  const category = document.getElementById("product-category").value;
  const price = Number(document.getElementById("product-price").value);
  const stock = Number(document.getElementById("product-stock").value);
  const imageFile = document.getElementById("product-image").files[0];

  if (!name || !Number.isFinite(price) || price < 0 ||
      !Number.isInteger(stock) || stock < 0) {
    message.textContent = "Revisa el nombre, precio y existencias.";
    return;
  }

  let imageUrl = null;

  if (imageFile) {
    if (!imageFile.type.startsWith("image/")) {
      message.textContent = "Selecciona un archivo de imagen válido.";
      return;
    }

    const extension = imageFile.name.split(".").pop().toLowerCase();
    const filePath = `${currentUser.id}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabaseClient.storage
      .from("product-images")
      .upload(filePath, imageFile);

    if (uploadError) {
      message.textContent = "Error al subir la imagen: " + uploadError.message;
      return;
    }

    const { data: publicData } = supabaseClient.storage
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
    message.textContent = "Error al guardar: " + error.message;
    return;
  }

  document.getElementById("product-form").reset();
  message.textContent = "¡Producto guardado correctamente!";
  await loadProducts();
}

// Editar precio y existencias
async function editProduct(product) {
  const newPrice = prompt("Nuevo precio en MXN:", product.price);
  if (newPrice === null) return;

  const newStock = prompt("Nuevas existencias:", product.stock);
  if (newStock === null) return;

  const price = Number(newPrice);
  const stock = Number(newStock);

  if (!Number.isFinite(price) || price < 0 ||
      !Number.isInteger(stock) || stock < 0) {
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

// Mostrar u ocultar producto
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

// Eliminar producto
async function deleteProduct(product) {
  if (!confirm(`¿Deseas eliminar "${product.name}"?`)) return;

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

// Cerrar sesión
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

checkSession();
