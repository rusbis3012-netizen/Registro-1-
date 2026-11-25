const formularioPrestamo = document.getElementById("formularioPrestamo");
const listaPrestamos = document.getElementById("listaPrestamos");
const tituloModalPrestamo = document.getElementById("tituloModalPrestamo");
let esAdministrador = false;

async function solicitarPrestamos(metodo, datos) {
    const opciones = {
        method: metodo,
        cache: "no-store",
        headers: { "Content-Type": "application/json" }
    };
    if (datos) {
        opciones.body = JSON.stringify(datos);
    }

    const respuesta = await fetch("../modelo/guardarPrestamos.php", opciones);
    const resultado = await respuesta.json();
    if (respuesta.status === 401) {
        window.location.href = "login.html";
        return;
    }
    if (!respuesta.ok || !resultado.success) {
        throw new Error(resultado.message || "No fue posible procesar el prestamo.");
    }
    return resultado;
}

async function cargarPrestamos() {
    try {
        const resultado = await solicitarPrestamos("GET");
        const rol = String(resultado.rol || "").trim().toLowerCase();
        if (!["admin", "administrador", "asociado"].includes(rol)) {
            throw new Error("No se pudo identificar el rol de la sesión.");
        }

        esAdministrador = rol === "admin" || rol === "administrador";
        document.getElementById("encabezadoAcciones").classList.toggle("d-none", !esAdministrador);
        document.getElementById("nuevoPrestamo").classList.toggle("d-none", !esAdministrador);
        mostrarPrestamos(resultado.prestamos);
    } catch (error) {
        alert(error.message);
    }
}

function mostrarPrestamos(prestamos) {
    listaPrestamos.replaceChildren();

    if (!prestamos || prestamos.length === 0) {
        listaPrestamos.innerHTML =
            `<tr><td colspan="${esAdministrador ? 7 : 6}" class="text-center py-4">No hay préstamos registrados.</td></tr>`;
        return;
    }

    prestamos.forEach((prestamo) => {
        const fila = document.createElement("tr");
        const nombre = [prestamo.nombres, prestamo.apellidos].filter(Boolean).join(" ");

        fila.append(
            crearCelda(prestamo.documento),
            crearCelda(nombre),
            crearCelda(prestamo.valorPrestamo),
            crearCelda(prestamo.tasaInteres),
            crearCelda(prestamo.numeroCuotas),
            crearCelda(prestamo.fechaPrestamo)
        );

        if (esAdministrador) {
            const acciones = document.createElement("td");
            acciones.className = "text-nowrap";

            const botonEditar = document.createElement("button");
            botonEditar.type = "button";
            botonEditar.className = "btn btn-sm btn-outline-primary me-2";
            botonEditar.title = "Editar préstamo";
            botonEditar.innerHTML = '<i class="bi bi-pencil-square" aria-hidden="true"></i>';
            botonEditar.addEventListener("click", () => editarPrestamo(prestamo));

            const botonEliminar = document.createElement("button");
            botonEliminar.type = "button";
            botonEliminar.className = "btn btn-sm btn-outline-danger";
            botonEliminar.title = "Eliminar préstamo";
            botonEliminar.innerHTML = '<i class="bi bi-trash3-fill" aria-hidden="true"></i>';
            botonEliminar.addEventListener("click", () => eliminarPrestamo(prestamo));

            acciones.append(botonEditar, botonEliminar);
            fila.append(acciones);
        }
        listaPrestamos.append(fila);
    });
}

function crearCelda(texto) {
    const celda = document.createElement("td");
    celda.textContent = texto ?? "";
    return celda;
}

formularioPrestamo.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const datos = Object.fromEntries(new FormData(formularioPrestamo).entries());
    const idPrestamo = formularioPrestamo.dataset.idPrestamo;

    try {
        if (idPrestamo) {
            datos.idPrestamo = Number(idPrestamo);
            await solicitarPrestamos("PUT", datos);
        } else {
            await solicitarPrestamos("POST", datos);
        }
        formularioPrestamo.reset();
        delete formularioPrestamo.dataset.idPrestamo;
        tituloModalPrestamo.textContent = "Registro de préstamo";
        bootstrap.Modal.getOrCreateInstance(document.getElementById("modalPrestamo")).hide();
        await cargarPrestamos();
    } catch (error) {
        alert(error.message);
    }
});

function editarPrestamo(prestamo) {
    formularioPrestamo.dataset.idPrestamo = prestamo.idPrestamo;
    document.getElementById("documento").value = prestamo.documento;
    document.getElementById("asociado").value = `${prestamo.nombres} ${prestamo.apellidos}`;
    document.getElementById("valorPrestamo").value = prestamo.valorPrestamo;
    document.getElementById("tasaInteres").value = prestamo.tasaInteres;
    document.getElementById("numeroCuotas").value = prestamo.numeroCuotas;
    document.getElementById("fechaPrestamo").value = prestamo.fechaPrestamo;
    tituloModalPrestamo.textContent = "Editar préstamo";
    bootstrap.Modal.getOrCreateInstance(document.getElementById("modalPrestamo")).show();
}

async function eliminarPrestamo(prestamo) {
    if (!window.confirm("¿Desea eliminar este préstamo?")) {
        return;
    }
    try {
        await solicitarPrestamos("DELETE", { idPrestamo: prestamo.idPrestamo });
        await cargarPrestamos();
    } catch (error) {
        alert(error.message);
    }
}

cargarPrestamos();
