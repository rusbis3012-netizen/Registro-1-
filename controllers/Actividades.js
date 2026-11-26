const listaActividades = document.getElementById("listaActividades");
// Busca en el HTML el elemento que tenga id listaActividades
let esAdministrador = false; // cuando ingresa aun no lo ha identificado
let esAsociado = false;
let actividades = [];
//arreglo vacio donde se guardan las variables que mandes de php
const formularioActividad = document.getElementById("formActividad");

async function solicitarApi(metodo, datos) {
//declaramos las funcion y le damos los metodos que va a recibir
    const opciones = {
        method: metodo,
        cache: "no-store", //evita que se almacene en cache la respuesta para no reutilizar informacion
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
        // guardo la resp de solicitarApi y consulto con get
        const resultado = await solicitarApi("GET"); 
        
        // resultado.rol obtiene el rol que manda php
        //||"" si el rol no existe utiliza cadena vacia
        const rol = String(resultado.rol || "").trim().toLowerCase();
        if (!["admin", "administrador", "asociado"].includes(rol)) {
            throw new Error("No se pudo identificar el rol de la sesión.");
        }
        esAdministrador = rol === "admin" || rol === "administrador";
        esAsociado = rol === "asociado";
        //identifica si es admin o asociado
        configurarAcciones();
        //configura que botones y encabezados se muestran segun rol
        actividades = resultado.actividades; //guarda las actividades en actividades
        mostrarActividades();
        //muestra actividades en la tabla html
    } catch (error) {
        alert("Error al cargar las actividades: " + error.message);
    }
}

function mostrarActividades() {
// elimina todo lo que haya dentro de la tabla
//  HTML que tiene el ID listaActividades.
    listaActividades.replaceChildren();
// verifica si el array esta vacio 
    if (actividades.length === 0) {
        const fila = document.createElement("tr");
        const celda = document.createElement("td");
        //esa celda debe ocupar el espacio de 9 columnas
        celda.colSpan = 9;
        //agrega clases de boostrap 
         celda.className = "text-center py-4 text-muted";
        //text-muted: muestra el texto con un color discreto.
        celda.textContent = "No hay actividades disponibles. ";
        //mensaje dentro de la celda
        fila.append(celda);
        //introduce la celda dentro de la fila
        listaActividades.append(fila);
        //introduce la fila dentro del elemnto htmlde la tabla
        return;
    }

    actividades.forEach((actividad) => {
        const fila = document.createElement("tr");
        fila.append( //con append agregamos celdas a las filas
            crearCelda(actividad.nombreActividad),
            crearCelda(actividad.fechaEvento),
            crearCelda(actividad.municipio),
            crearCelda(formatearMoneda(actividad.totalRecaudado)),
            crearCelda(actividad.totalParticipantes),
            crearCelda(actividad.estado),

            //por el club
            crearCelda(actividad.estado === "Finalizada"
                ? formatearMoneda(actividad.montoFondoClub)
                //si esta finalizado muestra el monto como formato de moneda
                : "Pendiente"), //prepara el valor del dinero
                //para mostrarlo como formato monetario

                //por asociado
            crearCelda(actividad.estado === "Finalizada"
                ? formatearMoneda(actividad.montoPorAsociado)
                : "Pendiente")
        );
        if (esAdministrador) {
            const acciones = document.createElement("td");
            acciones.className = "text-nowrap";
            //asigna una clase de boostrap y el text bla bla evita 
            //que el contenido de la celda se divida en varias lineas
            
            //crea un boton 
            const botonEditar = document.createElement("button");
            botonEditar.type = "button";
            //boton normal 
            botonEditar.className = "btn btn-sm btn-outline-primary me-2";
            //asigna estilos de boostrap
            botonEditar.innerHTML = '<i class="bi bi-pencil-square" aria-hidden="true"></i>';
            //introduce iconos
            botonEditar.addEventListener("click", () => abrirEdicion(actividad));
            //cuando damos click llamamos a la funcion que abre la edicion de esa actividad


            const botonEliminar = document.createElement("button");
            botonEliminar.type = "button";
            botonEliminar.className = "btn btn-sm btn-outline-danger";
            botonEliminar.innerHTML = '<i class="bi bi-trash3-fill" aria-hidden="true"></i>';
            botonEliminar.addEventListener("click", () => 
                eliminarActividad(actividad)); //llama a eliminaractividad y le envia la actividad seleccionada

            acciones.append(botonEditar, botonEliminar);//.append agregar a la celda los botones.
            fila.append(acciones);
            // introduce esa celda dentro de la fila actividad
        } else if (esAsociado) { //comrpueba otra si la 1 no se cumple
            const participacion = document.createElement("td");
            //crea una celda para colocar el boton
            const yaParticipa = Number(actividad.asociadoParticipa) === 1;
            //number convierte el valor a num
            //luego obtiene el dato de participacion y comprueba si su valor es 1
            //si es 1 significa que ya participa
            const cerrada = ["Finalizada", "Cancelada"].includes(actividad.estado);
            const botonParticipacion = document.createElement("button");
            //crea boton de participacion
            botonParticipacion.type = "button";
            botonParticipacion.className = yaParticipa
                ? "btn btn-sm btn-outline-danger" //rojo
                : "btn btn-sm btn-outline-success"; //verde
                //cambia la apariencia usando la class yaParticipa
            botonParticipacion.textContent = cerrada
                ? "Cerrada"
                : yaParticipa ? "Cancelar participación" : "Participar";
            botonParticipacion.disabled = cerrada; 
            //deshabilita el boton
            if (!cerrada) {
            
                botonParticipacion.addEventListener("click", () =>
                    cambiarParticipacion(actividad, yaParticipa)
                // cuando oprime participar cambia el estado o le envia la actividad si ya participaba
                );
            }
            participacion.append(botonParticipacion);
            //introduce el boton en la celda
            fila.append(participacion);
            //introduce la celda en la fila
        }
        listaActividades.append(fila);
        //agrega la fila a la tabla html
    });
}

function crearCelda(texto) {
    //crea la funcion y texto recibe lo que queremos colocar en la celda 
    const celda = document.createElement("td");

    celda.textContent = texto ?? "";
    //coloca texto dentro del elemento html 
    //?? comprueba si el valor de la izquierda es null
    //si lo es utiliza el de la derecha
    return celda;
}

function formatearMoneda(valor) {
    if (valor === null || valor === undefined || valor === "") {
        return "Pendiente";
    }
    return Number(valor).toLocaleString("es-CO", {
        //toLocaleString("es-CO", convierte el numero 
        //a una representacion segun el formato regional que seria
        //español colombia
        style: "currency", //formato de moneda 
        currency: "COP", //establece el peso colombiano
        maximumFractionDigits: 2 //permite mostrar maximo dos cifras decimales
    });
}

async function cambiarParticipacion(actividad, yaParticipa) {
    try {
        await solicitarApi(yaParticipa ? "DELETE" : "POST", {
            //si yaparticipa es true usa delete para cancelar
            // si es false usa post para registrar
            idActividad: Number(actividad.idActividad)

        });
        await cargarActividades();
        //actualiza 
    } catch (error) {
        alert(error.message);
    }
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
    const encabezadoParticipacion = document.getElementById("encabezadoParticipacion");

    if (botonNueva) {
        botonNueva.classList.toggle("d-none", !esAdministrador);
    }
    if (encabezadoAcciones) {
        encabezadoAcciones.classList.toggle("d-none", !esAdministrador);
    }
    if (encabezadoParticipacion) {
        encabezadoParticipacion.classList.toggle("d-none", !esAsociado);
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
        document.getElementById("estado").value = actividadEditar.estado;
        if (["Finalizada", "Cancelada"].includes(actividadEditar.estado)) {
            document.getElementById("estado").disabled = true;
        }
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
            totalRecaudado: totalRecaudado === "" ? null : Number(totalRecaudado),
            estado: formularioActividad.elements.estado.value
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