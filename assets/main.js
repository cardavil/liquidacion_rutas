// ===================== util: cargar componentes HTML =====================
async function loadComponent(containerId, file) {
  const el = document.getElementById(containerId);
  try {
    const res = await fetch(file, { cache: "no-cache" });
    if (!res.ok) throw new Error(file + " no encontrado");
    el.innerHTML = await res.text();
  } catch (err) {
    console.error("Error al cargar componente:", err);
    el.innerHTML = '<p style="color:red">Error al cargar ' + file + '</p>';
  }
}

// ===================== estado: página desde ?p= =====================
const params = new URLSearchParams(location.search);
const page = params.get("p") || "formularios"; // "formularios" | "visualizaciones"
const STORAGE_KEYS = {
  formularios: "conecta_last_form",
  visualizaciones: "conecta_last_viz",
};

// ===================== flujo principal =====================
(async () => {
  // 1) Cargar header y footer
  await loadComponent("header", "./components/header.html");
  await loadComponent("footer", "./components/footer.html");

  // El script inline del footer NO se ejecuta al inyectar.
  // Seteamos el año aquí para garantizarlo en GitHub Pages:
  const y = document.querySelector("#footer #y");
  if (y) y.textContent = new Date().getFullYear();

  // 2) Marcar botón activo del header y wire de navegación
  const btnForms = document.getElementById("btnForms");
  const btnDash  = document.getElementById("btnDash");
  if (btnForms && btnDash) {
    btnForms.classList.toggle("active", page === "formularios");
    btnDash.classList.toggle("active",  page === "visualizaciones");
    btnForms.onclick = () => (location.href = "?p=formularios");
    btnDash .onclick = () => (location.href = "?p=visualizaciones");
  }

  // 3) Cargar sidebar según la página
  if (page === "formularios") {
    await loadComponent("sidebar", "./components/sidebar-formularios.html");
  } else {
    await loadComponent("sidebar", "./components/sidebar-visualizaciones.html");
  }

  // 4) Cargar viewer (sin contenedor extra, evita "recuadro del recuadro")
  await loadComponent("viewerContainer", "./components/viewer.html");

  // 5) Lógica del visor (sin setTimeout; listeners por delegación)
  const iframe = document.getElementById("viewer");           // iframe verdadero
  const viewerTitle = document.getElementById("viewerTitle");
  const openNew = document.getElementById("openNew");
  const copyLink = document.getElementById("copyLink");
  const editForm = document.getElementById("editForm");
  const sidebar = document.getElementById("sidebar");

  function select(btn){
    // estilos activos
    document.querySelectorAll(".item-btn.active").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // datos
    const title = btn.dataset.title || "";
    const url   = btn.dataset.url || "";
    const edit  = btn.dataset.edit || "";

    // aplicar en visor
    if (viewerTitle) viewerTitle.textContent = title;
    if (iframe) iframe.src = url || "";

    // Abrir en pestaña nueva
    if (openNew) {
      openNew.disabled = !url;
      openNew.onclick = () => url && window.open(url, "_blank");
    }

    // Copiar Enlace
    if (copyLink) {
      copyLink.disabled = !url;
      copyLink.onclick = async () => {
        if (!url) return;
        try {
          await navigator.clipboard.writeText(url);
          copyLink.textContent = "¡Copiado!";
          setTimeout(() => (copyLink.textContent = "Copiar Enlace"), 900);
        } catch (e) {
          prompt("Copia el enlace:", url);
        }
      };
    }

    // Editar formulario
    if (editForm) {
      if (edit) {
        editForm.setAttribute("href", edit);
        editForm.setAttribute("aria-disabled", "false");
      } else {
        editForm.setAttribute("href", "");
        editForm.setAttribute("aria-disabled", "true");
      }
    }


    // persistencia
    const key = STORAGE_KEYS[page];
    if (key) {
      localStorage.setItem(key, JSON.stringify({ title, url }));
    }
  }
  
  // Delegación: cualquier click en un botón del sidebar
  if (sidebar) {
    sidebar.addEventListener("click", (e) => {
      const btn = e.target.closest(".item-btn");
      if (!btn) return;
      select(btn);
    });
  }

  // 6) Restaurar última selección (igual que 3-HTML)
  const restoreKey = STORAGE_KEYS[page];
  const saved = restoreKey && localStorage.getItem(restoreKey);
  if (saved) {
    try {
      const { title } = JSON.parse(saved);
      const match = Array.from(document.querySelectorAll(".item-btn"))
        .find(b => b.dataset.title === title);
      if (match) select(match);
    } catch (e) { /* no-op */ }
  }
})();
