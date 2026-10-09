let experiencias = [];
let reservas = [];
let textoBusqueda = "";
let categoriaActual = "todas";
let ordenActual = "normal";
let indiceOrden = 0;
let confirmandoVaciar = false;

const ciclosOrden = ["normal", "ascendente", "descendente"];
const etiquetasOrden = [
  "Ordenar por precio",
  "Precio: menor a mayor",
  "Precio: mayor a menor",
];

const catalogo = document.querySelector("#catalogo");
const contador = document.querySelector("#contador");
const buscador = document.querySelector("#buscador");
const botonesCategoria = document.querySelectorAll("[data-categoria]");
const btnOrdenar = document.querySelector("#btnOrdenar");
const precioMaximo = document.querySelector("#precioMaximo");
const listaReservas = document.querySelector("#listaReservas");
const total = document.querySelector("#total");
const totalPersonas = document.querySelector("#totalPersonas");
const btnVaciar = document.querySelector("#btnVaciar");
const mensaje = document.querySelector("#mensaje");

async function cargarExperiencias() {
  try {
    const respuesta = await fetch("./data/experiencias.json");
    if (!respuesta.ok) throw new Error("No fue posible cargar las experiencias");
    experiencias = await respuesta.json();
    actualizarCatalogo();
  } catch (error) {
    contador.textContent = "Error al cargar la información";
    console.error(error);
  }
}

function obtenerResultados() {
  let resultados = [...experiencias];

  if (categoriaActual !== "todas") {
    resultados = resultados.filter(e => e.categoria === categoriaActual);
  }
  if (textoBusqueda) {
    resultados = resultados.filter(e =>
      e.nombre.toLowerCase().includes(textoBusqueda) ||
      e.categoria.toLowerCase().includes(textoBusqueda));
  }
  if (precioMaximo.value !== "") {
    const limite = Number(precioMaximo.value);
    resultados = resultados.filter(e => e.precio <= limite);
  }
  if (ordenActual === "ascendente") resultados.sort((a, b) => a.precio - b.precio);
  if (ordenActual === "descendente") resultados.sort((a, b) => b.precio - a.precio);

  return resultados;
}

function actualizarCatalogo() {
  const resultados = obtenerResultados();

  if (resultados.length === 0) {
    catalogo.innerHTML = `<p class="sin-resultados">No se encontraron experiencias</p>`;
    contador.textContent = "0 experiencias encontradas";
    return;
  }

  catalogo.innerHTML = resultados.map(e => `
    <article class="tarjeta">
      <div class="imagen">${e.icono}</div>
      <div class="informacion">
        <span class="etiqueta">${e.categoria}</span>
        <h3>${e.nombre}</h3>
        <p>Cupo disponible: ${e.cupo}</p>
        <p class="precio">$${e.precio} MXN</p>
        <label>Personas:
          <input type="number" id="cantidad-${e.id}" min="1" max="${e.cupo}" value="1">
        </label>
        <button class="btn-reservar" data-id="${e.id}">Agregar</button>
      </div>
    </article>`).join("");

  contador.textContent = `${resultados.length} experiencia${resultados.length !== 1 ? "s" : ""}`;

  document.querySelectorAll(".btn-reservar").forEach(boton =>
    boton.addEventListener("click", () => agregarReserva(Number(boton.dataset.id))));
}

function mostrarMensaje(texto) {
  mensaje.textContent = texto;
}

function cancelarConfirmacionVaciar() {
  confirmandoVaciar = false;
  btnVaciar.textContent = "Vaciar reservación";
}

function agregarReserva(id) {
  cancelarConfirmacionVaciar();

  const experiencia = experiencias.find(e => e.id === id);
  const cantidad = Number(document.querySelector(`#cantidad-${id}`).value);

  if (!Number.isInteger(cantidad) || cantidad < 1) {
    mostrarMensaje("La cantidad debe ser un número entero mayor a 0.");
    return;
  }

  const existente = reservas.find(r => r.experienciaId === id);
  const yaReservado = existente ? existente.cantidad : 0;

  if (yaReservado + cantidad > experiencia.cupo) {
    mostrarMensaje(`Solo quedan ${experiencia.cupo - yaReservado} lugares para ${experiencia.nombre}.`);
    return;
  }

  if (existente) {
    existente.cantidad += cantidad;
    existente.subtotal = existente.cantidad * experiencia.precio;
  } else {
    reservas.push({
      experienciaId: id,
      nombre: experiencia.nombre,
      precio: experiencia.precio,
      cantidad,
      subtotal: experiencia.precio * cantidad
    });
  }

  mostrarMensaje("");
  mostrarReservas();
}

function cambiarCantidad(id, cambio) {
  cancelarConfirmacionVaciar();

  const reserva = reservas.find(r => r.experienciaId === id);
  const experiencia = experiencias.find(e => e.id === id);
  const nuevaCantidad = reserva.cantidad + cambio;

  if (nuevaCantidad < 1) {
    eliminarReserva(id);
    return;
  }
  if (nuevaCantidad > experiencia.cupo) {
    mostrarMensaje(`Solo hay ${experiencia.cupo} lugares para ${experiencia.nombre}.`);
    return;
  }

  reserva.cantidad = nuevaCantidad;
  reserva.subtotal = nuevaCantidad * reserva.precio;
  mostrarMensaje("");
  mostrarReservas();
}

function eliminarReserva(id) {
  cancelarConfirmacionVaciar();
  reservas = reservas.filter(r => r.experienciaId !== id);
  mostrarMensaje("");
  mostrarReservas();
}

function mostrarReservas() {
  if (reservas.length === 0) {
    listaReservas.innerHTML = "<p>No hay experiencias seleccionadas.</p>";
    total.textContent = "$0 MXN";
    totalPersonas.textContent = "0";
    return;
  }

  listaReservas.innerHTML = reservas.map(r => `
    <article class="item-reserva">
      <div>
        <strong>${r.nombre}</strong>
        <p>
          <button class="btn-cantidad" data-id="${r.experienciaId}" data-cambio="-1" aria-label="Quitar una persona">−</button>
          <span>${r.cantidad}</span> persona(s) ×
          <button class="btn-cantidad" data-id="${r.experienciaId}" data-cambio="1" aria-label="Agregar una persona">+</button>
          $${r.precio}
        </p>
      </div>
      <div>
        <strong>$${r.subtotal} MXN</strong>
        <button class="btn-eliminar" data-id="${r.experienciaId}">Eliminar</button>
      </div>
    </article>`).join("");

  total.textContent = `$${reservas.reduce((suma, r) => suma + r.subtotal, 0)} MXN`;
  totalPersonas.textContent = reservas.reduce((suma, r) => suma + r.cantidad, 0);

  document.querySelectorAll(".btn-cantidad").forEach(boton =>
    boton.addEventListener("click", () =>
      cambiarCantidad(Number(boton.dataset.id), Number(boton.dataset.cambio))));

  document.querySelectorAll(".btn-eliminar").forEach(boton =>
    boton.addEventListener("click", () => eliminarReserva(Number(boton.dataset.id))));
}

function vaciarReservas() {
  if (reservas.length === 0) {
    mostrarMensaje("No hay reservaciones que vaciar.");
    return;
  }
  if (!confirmandoVaciar) {
    confirmandoVaciar = true;
    btnVaciar.textContent = "Confirmar vaciar";
    mostrarMensaje("Presiona otra vez para confirmar.");
    return;
  }

  reservas = [];
  cancelarConfirmacionVaciar();
  mostrarReservas();
  mostrarMensaje("Reservación vaciada.");
}

botonesCategoria.forEach(boton => {
  boton.addEventListener("click", () => {
    botonesCategoria.forEach(b => {
      b.classList.remove("activo");
      b.setAttribute("aria-pressed", "false");
    });
    boton.classList.add("activo");
    boton.setAttribute("aria-pressed", "true");
    categoriaActual = boton.dataset.categoria;
    actualizarCatalogo();
  });
});

buscador.addEventListener("input", () => {
  textoBusqueda = buscador.value.trim().toLowerCase();
  actualizarCatalogo();
});

precioMaximo.addEventListener("input", actualizarCatalogo);

btnOrdenar.textContent = etiquetasOrden[0];
btnOrdenar.addEventListener("click", () => {
  indiceOrden = (indiceOrden + 1) % ciclosOrden.length;
  ordenActual = ciclosOrden[indiceOrden];
  btnOrdenar.textContent = etiquetasOrden[indiceOrden];
  actualizarCatalogo();
});

btnVaciar.addEventListener("click", vaciarReservas);

cargarExperiencias();