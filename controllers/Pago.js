
const formularioPago = document.getElementById("formularioPago");
// la tabla 
const listaPagos = document.getElementById("listaPagos");
// Obtiene el título del modal para cambiarlo entre crear y editar.
const tituloModalPago = document.getElementById("tituloModalPago");
let esAdministrador = false;
let esAsociado = false;
// Guarda los préstamos del asociado que tienen una cuota disponible este mes.
let prestamosParaPago = [];

const idPrestamoAdministrador = document.getElementById("idPrestamo");
const idPrestamoAsociado = document.getElementById("idPrestamoAsociado");
// Guarda el botón que abre el formulario para crear un pago.
const nuevoPago = document.getElementById("nuevoPago");

async function solicitarPagos(metodo, datos) {
    // Define el método HTTP, el tipo de datos y el almacenamiento en caché.
    const opciones = {
        method: metodo,
        cache: "no-store",
        headers: { "Content-Type": "application/json" }
    };
    
    if (datos) {
        opciones.body = JSON.stringify(datos);
    }

    // Realiza la petición al archivo PHP encargado de los pagos.
    const respuesta = await fetch("../modelo/guardarPagos.php", opciones);
    // Convierte la respuesta del servidor al formato JSON.
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

// Consulta los pagos y prepara la página según el rol del usuario.
async function cargarPagos() {
    try {
        // Solicita al servidor la lista de pagos y los datos disponibles.
        const resultado = await solicitarPagos("GET");
        // Convierte el rol recibido a texto en minúsculas y sin espacios.
        const rol = String(resultado.rol || "").trim().toLowerCase();
        if (!["admin", "administrador", "asociado"].includes(rol)) {
            throw new Error("No se pudo identificar el rol de la sesión.");
        }

        esAdministrador = rol === "admin" || rol === "administrador";
        esAsociado = rol === "asociado";
        // Oculta o muestra la columna de acciones solo para administradores.
        document.getElementById("encabezadoAcciones").classList.toggle("d-none", !esAdministrador);
        nuevoPago.classList.toggle("d-none", !esAdministrador && !esAsociado);
        // Guarda los préstamos que el asociado puede pagar este mes.
        prestamosParaPago = resultado.prestamosParaPago || [];
        // Ajusta los campos del formulario al rol actual.
        configurarFormularioPago();
        mostrarPagos(resultado.pagos);
    } catch (error) {
  
        alert(error.message);
    }
}

// Ajusta los campos visibles y disponibles según el rol del usuario.
function configurarFormularioPago() {
  
    const camposAdministrador = document.getElementById("camposPagoAdministrador");
    const etiquetaPrestamo = document.getElementById("etiquetaPrestamo");
    const etiquetaPrestamoAsociado = document.getElementById("etiquetaPrestamoAsociado");
    const infoCuotaAsociado = document.getElementById("infoCuotaAsociado");
    const valorCuota = document.getElementById("valorCuota");
    const fechaPago = document.getElementById("fechaPago");
    const mensajeSinCuotas = document.getElementById("mensajeSinCuotas");

    // El asociado no debe ver ni usar el campo normal de préstamo.
    //toggle oculta o muestra clases de css
    etiquetaPrestamo.classList.toggle("d-none", esAsociado);
    idPrestamoAdministrador.classList.toggle("d-none", esAsociado);
    idPrestamoAdministrador.disabled = esAsociado;

    // Muestra al asociado un selector exclusivo para sus préstamos.
    etiquetaPrestamoAsociado.classList.toggle("d-none", !esAsociado);
    idPrestamoAsociado.classList.toggle("d-none", !esAsociado);
    idPrestamoAsociado.disabled = !esAsociado;

    // Oculta los campos manuales y muestra el resumen de cuota del asociado.
    camposAdministrador.classList.toggle("d-none", esAsociado);
    valorCuota.disabled = esAsociado;
    fechaPago.disabled = esAsociado;
    infoCuotaAsociado.classList.toggle("d-none", !esAsociado);

    // Desactiva el registro si el asociado no tiene cuotas disponibles.
    nuevoPago.disabled = esAsociado && prestamosParaPago.length === 0;
    // Informa al asociado cuando no tiene préstamos disponibles este mes.
    mensajeSinCuotas.classList.toggle(
        "d-none",
        !esAsociado || prestamosParaPago.length > 0
    );
    // Cambia el título según quién esté realizando el pago.
    tituloModalPago.textContent = esAsociado ? "Pago mensual" : "Registro de pago";

    // Borra las opciones anteriores del selector de préstamos.
    idPrestamoAsociado.replaceChildren();
    // Crea la opción inicial para indicar qué debe seleccionar el asociado.
    const opcionInicial = document.createElement("option");
    opcionInicial.value = "";
    opcionInicial.textContent = prestamosParaPago.length
        ? "Selecciona un préstamo"
        : "No tienes cuotas disponibles este mes";
    idPrestamoAsociado.append(opcionInicial);

    // Agrega cada préstamo disponible como una opción del selector.
    prestamosParaPago.forEach((prestamo) => {
        const opcion = document.createElement("option");
        opcion.value = prestamo.idPrestamo;
        opcion.textContent = `Préstamo #${prestamo.idPrestamo} — ${formatearMoneda(prestamo.valorCuota)}`;
        idPrestamoAsociado.append(opcion);
    });

    // Actualiza el valor mostrado de la cuota seleccionada.
    actualizarCuotaAsociado();
}

// Busca el préstamo elegido y muestra el valor de su cuota.
function actualizarCuotaAsociado() {
    // Compara el identificador seleccionado con cada préstamo disponible.
    const prestamoSeleccionado = prestamosParaPago.find(
        (prestamo) => String(prestamo.idPrestamo) === idPrestamoAsociado.value
    );
    // Muestra la cuota en moneda o pide al usuario seleccionar un préstamo.
    document.getElementById("valorCuotaAsociado").textContent = prestamoSeleccionado
        ? formatearMoneda(prestamoSeleccionado.valorCuota)
        : "Selecciona un préstamo";
}

// Convierte un número a formato de moneda usado en Colombia.
function formatearMoneda(valor) {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 2
    }).format(Number(valor));
}

// Construye dinámicamente las filas visibles en la tabla de pagos.
function mostrarPagos(pagos) {
    // Elimina las filas anteriores antes de dibujar los nuevos datos.
    listaPagos.replaceChildren();

    // Presenta un mensaje cuando no existen pagos registrados.
    if (!pagos || pagos.length === 0) {
        listaPagos.innerHTML =
            `<tr><td colspan="${esAdministrador ? 6 : 5}" class="text-center py-4">No hay pagos registrados.</td></tr>`;
        return;
    }

    // Recorre cada pago recibido desde el servidor.
    pagos.forEach((pago) => {
        // Crea una nueva fila para mostrar un pago.
        const fila = document.createElement("tr");
        // Une el nombre y los apellidos si ambos existen.
        const nombre = [pago.nombres, pago.apellidos].filter(Boolean).join(" ");

        // Agrega las columnas principales del pago a la fila.
        fila.append(
            crearCelda(pago.documento),
            crearCelda(nombre),
            crearCelda(pago.valorCuota),
            crearCelda(pago.fechaPago),
            crearCelda(pago.idPrestamo)
        );

        // Los administradores también reciben botones para modificar cada pago.
        if (esAdministrador) {
            // Crea la celda que contendrá los botones de acción.
            const acciones = document.createElement("td");
            acciones.className = "text-nowrap";

            // Crea el botón para abrir el pago en modo edición.
            const botonEditar = document.createElement("button");
            botonEditar.type = "button";
            botonEditar.className = "btn btn-sm btn-outline-primary me-2";
            botonEditar.title = "Editar pago";
            botonEditar.innerHTML = '<i class="bi bi-pencil-square" aria-hidden="true"></i>';
            // Al hacer clic, envía este pago a la función de edición.
            botonEditar.addEventListener("click", () => editarPago(pago));

            // Crea el botón para solicitar la eliminación del pago.
            const botonEliminar = document.createElement("button");
            botonEliminar.type = "button";
            botonEliminar.className = "btn btn-sm btn-outline-danger";
            botonEliminar.title = "Eliminar pago";
            botonEliminar.innerHTML = '<i class="bi bi-trash3-fill" aria-hidden="true"></i>';
            // Al hacer clic, envía este pago a la función de eliminación.
            botonEliminar.addEventListener("click", () => eliminarPago(pago));

            // Coloca ambos botones dentro de la celda y luego en la fila.
            acciones.append(botonEditar, botonEliminar);
            fila.append(acciones);
        }
        // Agrega la fila completa a la tabla de pagos.
        listaPagos.append(fila);
    });
}

// Crea una celda de tabla y coloca dentro el texto recibido.
function crearCelda(texto) {
    const celda = document.createElement("td");
    celda.textContent = texto ?? "";
    return celda;
}

// Gestiona el envío del formulario para crear o editar un pago.
formularioPago.addEventListener("submit", async (evento) => {
    // Evita que el navegador recargue la página al enviar el formulario.
    evento.preventDefault();
    // Lee todos los campos del formulario y los convierte en un objeto.
    let datos = Object.fromEntries(new FormData(formularioPago).entries());
    // Recupera el identificador si el formulario está editando un pago.
    const idPago = formularioPago.dataset.idPago;

    try {
        // El asociado solo puede seleccionar un préstamo disponible.
        if (esAsociado) {
            datos = { idPrestamo: Number(idPrestamoAsociado.value) };
            // Detiene el proceso si no seleccionó ningún préstamo válido.
            if (!datos.idPrestamo) {
                throw new Error("Selecciona un préstamo con cuota disponible.");
            }
            // Registra el pago mensual mediante una petición POST.
            await solicitarPagos("POST", datos);
        // El administrador identifica una edición por el idPago guardado.
        } else if (idPago) {
            datos.idPago = Number(idPago);
            // Actualiza el pago existente mediante una petición PUT.
            await solicitarPagos("PUT", datos);
        } else {
            // Registra un pago manual mediante una petición POST.
            await solicitarPagos("POST", datos);
        }
        // Limpia los campos y elimina el modo de edición.
        formularioPago.reset();
        delete formularioPago.dataset.idPago;
        // Restablece el título normal del modal.
        tituloModalPago.textContent = "Registro de pago";
        // Cierra el modal después de guardar correctamente.
        bootstrap.Modal.getOrCreateInstance(document.getElementById("modalPago")).hide();
        // Recarga la tabla para mostrar el pago actualizado.
        await cargarPagos();
    } catch (error) {
        // Muestra al usuario el error ocurrido al guardar.
        alert(error.message);
    }
});

// Actualiza el valor mostrado cuando cambia el préstamo seleccionado.
idPrestamoAsociado.addEventListener("change", actualizarCuotaAsociado);

// Carga los datos de un pago existente dentro del formulario.
function editarPago(pago) {
    // Guarda el identificador del pago para distinguir una edición.
    formularioPago.dataset.idPago = pago.idPago;
    // Copia los datos del pago a los campos del formulario.
    document.getElementById("idPrestamo").value = pago.idPrestamo;
    document.getElementById("valorCuota").value = pago.valorCuota;
    document.getElementById("fechaPago").value = pago.fechaPago;
    // Cambia el título y abre el modal en modo edición.
    tituloModalPago.textContent = "Editar pago";
    bootstrap.Modal.getOrCreateInstance(document.getElementById("modalPago")).show();
}

// Solicita confirmar y elimina el pago seleccionado.
async function eliminarPago(pago) {
    // Cancela la eliminación si el usuario no confirma.
    if (!window.confirm("¿Desea eliminar este pago?")) {
        return;
    }
    try {
        // Envía el identificador del pago al servidor mediante DELETE.
        await solicitarPagos("DELETE", { idPago: pago.idPago });
        // Recarga la tabla para quitar el pago eliminado.
        await cargarPagos();
    } catch (error) {
        // Muestra al usuario el error ocurrido durante la eliminación.
        alert(error.message);
    }
}

// Ejecuta la carga inicial de pagos al abrir la página.
cargarPagos();
