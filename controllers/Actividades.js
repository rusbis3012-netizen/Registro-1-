const listaActividades = document.getElementById("listaActividades");
// Busca en el HTML el elemento que tenga id listaActividades
let esAdministrador = false;
let actividades = [];
//arreglo vacio donde se guardan las variables que mandes de php
const formularioActividad = document.getElementById("formActividad");

async function solicitarApi(metodo, datos) {
//declaramos las funcion y le damos los metodos que va a recibir
    const opciones = {
        method: metodo,
        cache: "no-store",
        //asignas el valor que le dimos arriba en la funcion como parametro 
        headers: { 'Content-Type': 'application/json' },
    };

    if (datos) {
        opciones.body = JSON.stringify(datos);
        //verifica si la funcion recibio datos y 
        //el opciones.body es el contenido que envias a la peticion
        //y con el stringify los pasas a json
    }

    const respuesta = await fetch("../modelo/guardarActividades.php", opciones);
    //envia la solicitud al archivo php que es guardaractividades
    const resultado = await respuesta.json();
    //convertimos esa respuesta de arriba a json

    if (respuesta.status === 401) {//401 cuando el usuario no esta autenticado
        window.location.href = "login.html";
        //verifica si el usuario no esta autenticado
    }

    if (!respuesta.ok || !resultado.success) {
        throw new Error(resultado.mensaje || resultado.message || "Error en la solicitud");
        /* !respuesta.ok comprueba si la respuesta HTTP fue exitosa.
        !resultado.success comprueba si PHP informa que la operación se realizó correctamente.
        */
    }

    return resultado;
}

//Carga las actividades 
async function cargarActividades() {
    try {
        const resultado = await solicitarApi("GET");

        const rol = String(resultado.rol || "").trim().toLowerCase();
        if (!["admin", "administrador", "asociado"].includes(rol)) {
            throw new Error("No se pudo identificar el rol de la sesión.");
        }
        esAdministrador = rol === "admin" || rol === "administrador";
        configurarAcciones();
        actividades = resultado.actividades;
        mostrarActividades();
    } catch (error) {
        alert("Error al cargar las actividades: " + error.message);
    }
}

function mostrarActividades() {
    listaActividades.replaceChildren();

    // Crea una fila y guarda que no hay actividades disponibles, lo crea  solo si no encuentra las actividades en la base de datos.
    if (actividades.length === 0) {
        const fila = document.createElement("tr");
        const celda = document.createElement("td");
        celda.colSpan = esAdministrador ? 5 : 4; //Si es administrador crea 5 celdas , si no es admin crea 4 , trae lo de la base de datos.
        celda.className = "text-center py-4 text-muted";
        celda.textContent = "No hay actividades disponibles. ";
        fila.append(celda);
        listaActividades.append(fila);
        return;
    }

    actividades.forEach((actividad) => {
        const fila = document.createElement("tr");
        fila.append(
            crearCelda(actividad.nombreActividad),
            crearCelda(actividad.fechaEvento),
            crearCelda(actividad.municipio),
            crearCelda(actividad.totalRecaudado === null ? "Pendiente" : Number(actividad.totalRecaudado).toLocaleString("es-CO", { style: "currency", currency: "COP" })),
        );
        if (esAdministrador) {
            const acciones = document.createElement("td");
            acciones.className = "text-nowrap";

            const botonEditar = document.createElement("button");
            botonEditar.type = "button";
            botonEditar.className = "btn btn-sm btn-outline-primary me-2";
            botonEditar.innerHTML = '<i class="bi bi-pencil-square" aria-hidden="true"></i>';
            botonEditar.addEventListener("click", () => abrirEdicion(actividad));


            const botonEliminar = document.createElement("button");
            botonEliminar.type = "button";
            botonEliminar.className = "btn btn-sm btn-outline-danger";
            botonEliminar.innerHTML = '<i class="bi bi-trash3-fill" aria-hidden="true"></i>';
            botonEliminar.addEventListener("click", () => 
                eliminarActividad(actividad));

            acciones.append(botonEditar, botonEliminar);//.append agregar a la celda los botones.
            fila.append(acciones);

        }
        listaActividades.append(fila);
    });
}

function crearCelda(texto){
    const celda = document.createElement("td");
    celda.textContent = texto;
    return celda;
}

async function eliminarActividad(actividad){
    const confirmar = window.confirm(
        `¿Desea eliminar la actividad "${actividad.nombreActividad}"?`
    );

    if(!confirmar){
        return;
    }

    try {
        await solicitarApi ("DELETE",{idActividad:actividad.idActividad});
        await cargarActividades(); 
        alert("actividad eliminada correctamente");
    } catch (error) {
        alert(error.message);
    }
}

async function abrirEdicion(actividad) {
    sessionStorage.setItem("actividadEditar", JSON.stringify(actividad));
    window.location.href = "RegistroActividades.html";
}

function configurarAcciones(){
    const botonNueva = document.getElementById("nuevaActividad");
    const encabezadoAcciones = document.getElementById("encabezadoAcciones");

    if (botonNueva) {
        botonNueva.classList.toggle("d-none", !esAdministrador);
    }
    if (encabezadoAcciones) {
        encabezadoAcciones.classList.toggle("d-none", !esAdministrador);
    }
}
const rolLocal = (localStorage.getItem("rol") || "").trim().toLowerCase();
if (formularioActividad && !["admin", "administrador"].includes(rolLocal)) {
    sessionStorage.removeItem("actividadEditar");
    window.location.replace("Actividades.html");
} else if (formularioActividad) {
    const actividadEditarTexto = sessionStorage.getItem("actividadEditar");

    if (actividadEditarTexto) {
        const actividadEditar = JSON.parse(actividadEditarTexto);
        document.getElementById("idActividad").value = actividadEditar.idActividad;
        document.getElementById("nombreActividad").value = actividadEditar.nombreActividad;
        document.getElementById("fechaEvento").value = actividadEditar.fechaEvento;
        document.getElementById("municipio").value = actividadEditar.municipio;
        document.getElementById("totalRecaudo").value = actividadEditar.totalRecaudado ?? "";
        document.querySelector("h2").textContent = "Editar actividad";
        formularioActividad.querySelector('button[type="submit"]').textContent = "Guardar cambios";
        sessionStorage.removeItem("actividadEditar");
    }

    formularioActividad.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const idActividad = document.getElementById("idActividad")?.value || "";
        const totalRecaudado = formularioActividad.elements.totalRecaudado.value;
        const datos = {
            nombreActividad: formularioActividad.elements.nombreActividad.value.trim(),
            fechaEvento: formularioActividad.elements.fechaEvento.value,
            municipio: formularioActividad.elements.municipio.value.trim(),
            totalRecaudado: totalRecaudado === "" ? null : Number(totalRecaudado)
        };

        if (idActividad) {
            datos.idActividad = Number(idActividad);
        }

        try {
            await solicitarApi(idActividad ? "PUT" : "POST", datos);
            alert(idActividad ? "Actividad actualizada correctamente" : "Actividad creada correctamente");
            window.location.href = "Actividades.html";
        } catch (error) {
            alert(error.message);
        }
    });
}

if (listaActividades) {
    cargarActividades();
}