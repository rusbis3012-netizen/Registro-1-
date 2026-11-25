const formularioPago = document.getElementById("formularioPago");
const listaPagos = document.getElementById("listaPagos");
const tituloModalPago = document.getElementById("tituloModalPago");
let esAdministrador = false;
let esAsociado = false;
let prestamosParaPago = [];

const idPrestamoAdministrador = document.getElementById("idPrestamo");
const idPrestamoAsociado = document.getElementById("idPrestamoAsociado");
const nuevoPago = document.getElementById("nuevoPago");

async function solicitarPagos(metodo, datos) {
    const opciones = {
        method: metodo,
        cache: "no-store",
        headers: { "Content-Type": "application/json" }
    };
    if (datos) {
        opciones.body = JSON.stringify(datos);
    }

    const respuesta = await fetch("../modelo/guardarPagos.php", opciones);
    const resultado = await respuesta.json();
    if (respuesta.status === 401) {
        window.location.href = "login.html";
        return;
    }
    if (!respuesta.ok || !resultado.success) {
        throw new Error(resultado.message || "No fue posible procesar el pago.");
    }
    return resultado;
}

async function cargarPagos() {
    try {
        const resultado = await solicitarPagos("GET");
        const rol = String(resultado.rol || "").trim().toLowerCase();
        if (!["admin", "administrador", "asociado"].includes(rol)) {
            throw new Error("No se pudo identificar el rol de la sesión.");
        }

        esAdministrador = rol === "admin" || rol === "administrador";
        esAsociado = rol === "asociado";
        document.getElementById("encabezadoAcciones").classList.toggle("d-none", !esAdministrador);
        nuevoPago.classList.toggle("d-none", !esAdministrador && !esAsociado);
        prestamosParaPago = resultado.prestamosParaPago || [];
        configurarFormularioPago();
        mostrarPagos(resultado.pagos);
    } catch (error) {
        alert(error.message);
    }
}

function configurarFormularioPago() {
    const camposAdministrador = document.getElementById("camposPagoAdministrador");
    const etiquetaPrestamo = document.getElementById("etiquetaPrestamo");
    const etiquetaPrestamoAsociado = document.getElementById("etiquetaPrestamoAsociado");
    const infoCuotaAsociado = document.getElementById("infoCuotaAsociado");
    const valorCuota = document.getElementById("valorCuota");
    const fechaPago = document.getElementById("fechaPago");
    const mensajeSinCuotas = document.getElementById("mensajeSinCuotas");

    etiquetaPrestamo.classList.toggle("d-none", esAsociado);
    idPrestamoAdministrador.classList.toggle("d-none", esAsociado);
    idPrestamoAdministrador.disabled = esAsociado;

    etiquetaPrestamoAsociado.classList.toggle("d-none", !esAsociado);
    idPrestamoAsociado.classList.toggle("d-none", !esAsociado);
    idPrestamoAsociado.disabled = !esAsociado;

    camposAdministrador.classList.toggle("d-none", esAsociado);
    valorCuota.disabled = esAsociado;
    fechaPago.disabled = esAsociado;
    infoCuotaAsociado.classList.toggle("d-none", !esAsociado);

    nuevoPago.disabled = esAsociado && prestamosParaPago.length === 0;
    mensajeSinCuotas.classList.toggle(
        "d-none",
        !esAsociado || prestamosParaPago.length > 0
    );
    tituloModalPago.textContent = esAsociado ? "Pago mensual" : "Registro de pago";

    idPrestamoAsociado.replaceChildren();
    const opcionInicial = document.createElement("option");
    opcionInicial.value = "";
    opcionInicial.textContent = prestamosParaPago.length
        ? "Selecciona un préstamo"
        : "No tienes cuotas disponibles este mes";
    idPrestamoAsociado.append(opcionInicial);

    prestamosParaPago.forEach((prestamo) => {
        const opcion = document.createElement("option");
        opcion.value = prestamo.idPrestamo;
        opcion.textContent = `Préstamo #${prestamo.idPrestamo} — ${formatearMoneda(prestamo.valorCuota)}`;
        idPrestamoAsociado.append(opcion);
    });

    actualizarCuotaAsociado();
}

function actualizarCuotaAsociado() {
    const prestamoSeleccionado = prestamosParaPago.find(
        (prestamo) => String(prestamo.idPrestamo) === idPrestamoAsociado.value
    );
    document.getElementById("valorCuotaAsociado").textContent = prestamoSeleccionado
        ? formatearMoneda(prestamoSeleccionado.valorCuota)
        : "Selecciona un préstamo";
}

function formatearMoneda(valor) {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 2
    }).format(Number(valor));
}

function mostrarPagos(pagos) {
    listaPagos.replaceChildren();

    if (!pagos || pagos.length === 0) {
        listaPagos.innerHTML =
            `<tr><td colspan="${esAdministrador ? 6 : 5}" class="text-center py-4">No hay pagos registrados.</td></tr>`;
        return;
    }

    pagos.forEach((pago) => {
        const fila = document.createElement("tr");
        const nombre = [pago.nombres, pago.apellidos].filter(Boolean).join(" ");

        fila.append(
            crearCelda(pago.documento),
            crearCelda(nombre),
            crearCelda(pago.valorCuota),
            crearCelda(pago.fechaPago),
            crearCelda(pago.idPrestamo)
        );

        if (esAdministrador) {
            const acciones = document.createElement("td");
            acciones.className = "text-nowrap";

            const botonEditar = document.createElement("button");
            botonEditar.type = "button";
            botonEditar.className = "btn btn-sm btn-outline-primary me-2";
            botonEditar.title = "Editar pago";
            botonEditar.innerHTML = '<i class="bi bi-pencil-square" aria-hidden="true"></i>';
            botonEditar.addEventListener("click", () => editarPago(pago));

            const botonEliminar = document.createElement("button");
            botonEliminar.type = "button";
            botonEliminar.className = "btn btn-sm btn-outline-danger";
            botonEliminar.title = "Eliminar pago";
            botonEliminar.innerHTML = '<i class="bi bi-trash3-fill" aria-hidden="true"></i>';
            botonEliminar.addEventListener("click", () => eliminarPago(pago));

            acciones.append(botonEditar, botonEliminar);
            fila.append(acciones);
        }
        listaPagos.append(fila);
    });
}

function crearCelda(texto) {
    const celda = document.createElement("td");
    celda.textContent = texto ?? "";
    return celda;
}

formularioPago.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    let datos = Object.fromEntries(new FormData(formularioPago).entries());
    const idPago = formularioPago.dataset.idPago;

    try {
        if (esAsociado) {
            datos = { idPrestamo: Number(idPrestamoAsociado.value) };
            if (!datos.idPrestamo) {
                throw new Error("Selecciona un préstamo con cuota disponible.");
            }
            await solicitarPagos("POST", datos);
        } else if (idPago) {
            datos.idPago = Number(idPago);
            await solicitarPagos("PUT", datos);
        } else {
            await solicitarPagos("POST", datos);
        }
        formularioPago.reset();
        delete formularioPago.dataset.idPago;
        tituloModalPago.textContent = "Registro de pago";
        bootstrap.Modal.getOrCreateInstance(document.getElementById("modalPago")).hide();
        await cargarPagos();
    } catch (error) {
        alert(error.message);
    }
});

idPrestamoAsociado.addEventListener("change", actualizarCuotaAsociado);

function editarPago(pago) {
    formularioPago.dataset.idPago = pago.idPago;
    document.getElementById("idPrestamo").value = pago.idPrestamo;
    document.getElementById("valorCuota").value = pago.valorCuota;
    document.getElementById("fechaPago").value = pago.fechaPago;
    tituloModalPago.textContent = "Editar pago";
    bootstrap.Modal.getOrCreateInstance(document.getElementById("modalPago")).show();
}

async function eliminarPago(pago) {
    if (!window.confirm("¿Desea eliminar este pago?")) {
        return;
    }
    try {
        await solicitarPagos("DELETE", { idPago: pago.idPago });
        await cargarPagos();
    } catch (error) {
        alert(error.message);
    }
}

cargarPagos();
