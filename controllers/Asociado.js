const formularioRegistro = document.getElementById("formRegistro");
const formularioAsociados = document.getElementById("formularioAsociado");
const listaAsociados = document.getElementById("listaAsociados");
let esAdministrador = false;
let documentoEditar = null;

const hoy = new Date();
const fechaMaximaNacimiento = new Date(
    hoy.getFullYear() - 18,
    hoy.getMonth(),
    hoy.getDate()
);
const fechaMaximaNacimientoISO = [
    fechaMaximaNacimiento.getFullYear(),
    String(fechaMaximaNacimiento.getMonth() + 1).padStart(2, "0"),
    String(fechaMaximaNacimiento.getDate()).padStart(2, "0")
].join("-");
document.querySelectorAll('input[name="fechaNacimiento"]').forEach((input) => {
    input.max = fechaMaximaNacimientoISO;
});

if (formularioRegistro) {
    formularioRegistro.addEventListener("submit", async function (event) {
        event.preventDefault();

        const botonGuardar = formularioRegistro.querySelector('button[type="submit"]');
        const asociado = Object.fromEntries(new FormData(formularioRegistro).entries());
        const mensaje = document.getElementById("mensajeRegistro");

        if (asociado.contrasena !== asociado.confirmarContrasena) {
            mensaje.textContent = "Las contraseñas no coinciden.";
            return;
        }

        asociado.Contraseña = asociado.contrasena;
        delete asociado.contrasena;
        delete asociado.confirmarContrasena;

        botonGuardar.disabled = true;

        try {
            mensaje.textContent = "Guardando...";
            const respuesta = await fetch(formularioRegistro.action, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(asociado)
            });

            const resultado = await respuesta.json();
            mensaje.textContent = resultado.message;

            if (respuesta.ok && resultado.success) {
                formularioRegistro.reset();
            }
        } catch (error) {
            console.error("Error al enviar el formulario:", error);
            mensaje.textContent = error.message || "Ocurrio un error al enviar el formulario.";
        } finally {
            botonGuardar.disabled = false;
        }
    });
}

if (formularioAsociados) {
    formularioAsociados.addEventListener("submit", async function (event) {
        event.preventDefault();

        const botonGuardar = formularioAsociados.querySelector('button[type="submit"]');
        const asociado = Object.fromEntries(new FormData(formularioAsociados).entries());

        if (asociado.contrasena !== asociado.confirmarContrasena) {
            alert("Las contraseñas no coinciden.");
            return;
        }

        asociado.Contraseña = asociado.contrasena;
        delete asociado.contrasena;
        delete asociado.confirmarContrasena;
        delete asociado.fechaIngreso;
        delete asociado.estado;

        botonGuardar.disabled = true;

        try {
                const metodo = documentoEditar ? "PUT" : "POST";
                    if (documentoEditar) {
                    asociado.documentoOriginal = documentoEditar;
                }
            const respuesta = await fetch(formularioAsociados.action, {
                method: metodo,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(asociado)
            });
            const resultado = await respuesta.json();

            if (!respuesta.ok || !resultado.success) {
                throw new Error(resultado.message || "No fue posible guardar el asociado.");
            }

            formularioAsociados.reset();
            documentoEditar = null;
            document.getElementById("tituloModalAsociado").textContent = "Registro de Asociados";
            await cargarAsociados();
            bootstrap.Modal.getOrCreateInstance(document.getElementById("modalAsociado")).hide();
        } catch (error) {
            console.error("Error al guardar el asociado:", error);
            alert(error.message);
        } finally {
            botonGuardar.disabled = false;
        }
    });
}

async function cargarAsociados() {
    if (!listaAsociados) {
        return;
    }

    try {
        const respuesta = await fetch("../modelo/guardarAsociado.php", {
            method: "GET",
            cache: "no-store"
        });
        const resultado = await respuesta.json();

        if (respuesta.status === 401) {
            window.location.href = "login.html";
            return;
        }

        if (!respuesta.ok || !resultado.success) {
            throw new Error(resultado.message || "No fue posible cargar los asociados.");
        }

        const rol = String(resultado.rol || "").trim().toLowerCase();
        if (!["admin", "administrador", "asociado"].includes(rol)) {
            throw new Error("No se pudo identificar el rol de la sesión.");
        }

        esAdministrador = rol === "admin" || rol === "administrador";
        const botonNuevoAsociado = document.getElementById("nuevoAsociado");
        if (botonNuevoAsociado) {
            botonNuevoAsociado.classList.toggle("d-none", !esAdministrador);
        }

        configurarAcciones();
        mostrarAsociados(resultado.asociados);
    } catch (error) {
        listaAsociados.innerHTML =
            '<tr><td colspan="5" class="text-center py-4 text-danger">' +
            error.message +
            "</td></tr>";
    }
}

function mostrarAsociados(asociados) {
    listaAsociados.replaceChildren();

    if (!asociados || asociados.length === 0) {
        const columnas = esAdministrador ? 5 : 4;
        listaAsociados.innerHTML =
            `<tr><td colspan="${columnas}" class="text-center py-4 text-muted">No hay asociados disponibles.</td></tr>`;
        return;
    }

    asociados.forEach((asociado) => {
        const fila = document.createElement("tr");
        const nombreCompleto = [asociado.nombres, asociado.apellidos].filter(Boolean).join(" ");

        fila.append(
            crearCelda(nombreCompleto),
            crearCelda(asociado.fechaNacimiento || ""),
            crearCelda(asociado.ciudad || ""),
            crearCelda(asociado.documento || "")
        );

        if (esAdministrador) {
            fila.append(crearCeldaAcciones(asociado));
        }

        listaAsociados.append(fila);
    });
}

function crearCelda(texto) {
    const celda = document.createElement("td");
    celda.textContent = texto;
    return celda;
}

function configurarAcciones() {
    const encabezadoAcciones = document.getElementById("encabezadoAcciones");
    if (encabezadoAcciones) {
        encabezadoAcciones.classList.toggle("d-none", !esAdministrador);
    }
}

function crearCeldaAcciones(asociado) {
    const celda = document.createElement("td");
    celda.className = "text-nowrap";

    const botonEditar = document.createElement("button");
    botonEditar.type = "button";
    botonEditar.className = "btn btn-sm btn-outline-primary me-2";
    botonEditar.title = "Editar asociado";
    botonEditar.setAttribute("aria-label", "Editar asociado");
    botonEditar.innerHTML = '<i class="bi bi-pencil-square" aria-hidden="true"></i>';
    botonEditar.addEventListener("click", () => editarAsociado(asociado));

    const botonEliminar = document.createElement("button");
    botonEliminar.type = "button";
    botonEliminar.className = "btn btn-sm btn-outline-danger";
    botonEliminar.title = "Eliminar asociado";
    botonEliminar.setAttribute("aria-label", "Eliminar asociado");
    botonEliminar.innerHTML = '<i class="bi bi-trash3-fill" aria-hidden="true"></i>';
    botonEliminar.addEventListener("click", () => eliminarAsociado(asociado));

    celda.append(botonEditar, botonEliminar);
    return celda;
}

function editarAsociado(asociado) {
    documentoEditar = asociado.documento;

    document.getElementById("documento").value = asociado.documento || "";
    document.getElementById("nombres").value = asociado.nombres || "";
    document.getElementById("apellidos").value = asociado.apellidos || "";
    document.getElementById("fechaNacimiento").value = asociado.fechaNacimiento || "";
    document.getElementById("telefono").value = asociado.telefono || "";
    document.getElementById("correo").value = asociado.email || "";
    document.getElementById("direccion").value = asociado.direccionResidencia || "";
    document.getElementById("ciudad").value = asociado.ciudad || "";
    document.getElementById("genero").value = asociado.genero || "";
    document.getElementById("contrasena").removeAttribute("required");
    document.getElementById("confirmarContrasena").removeAttribute("required");
    document.getElementById("tituloModalAsociado").textContent = "Editar asociado";

    bootstrap.Modal.getOrCreateInstance(document.getElementById("modalAsociado")).show();
}

async function eliminarAsociado(asociado) {
    const nombre = `${asociado.nombres || ""} ${asociado.apellidos || ""}`.trim();
    if (!window.confirm(`¿Desea eliminar al asociado "${nombre}"?`)) {
        return;
    }

    try {
        const respuesta = await fetch("../modelo/guardarAsociado.php", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ documento: asociado.documento })
        });
        const resultado = await respuesta.json();

        if (!respuesta.ok || !resultado.success) {
            throw new Error(resultado.message || "No fue posible eliminar el asociado.");
        }

        await cargarAsociados();
        alert("Asociado eliminado correctamente.");
    } catch (error) {
        alert(error.message);
    }
}

cargarAsociados();
