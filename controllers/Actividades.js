const listaActividades = document.getElementById("listaActividades");
let esAdministrador = false;
let actividades = [];

async function solicitarApi(metodo, datos) {
    //solicitarApi es una variable que trae los datos 
    const opciones = {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
    }
    if (datos) {
        opciones.body = JSON.stringify(datos);
    }
    const respuesta = await fetch("../modelo/gestionarActividades.php", opciones);
    const resultado = await respuesta.json();
    if (respuesta.status === 401) {
        window.location.href = "login.html";
    }
    //401 cuando el usuario no esta autenticado 
    //403 cuando el usuario no tiene el permiso 
    if (!respuesta.ok || !resultado.success) {
        throw new Error(resultado.mensaje || "Error en la solicitud");
    }
    return resultado;
}
//carga las actividades
async function cargarActividades() {
    try {
        const resultado = await solicitarApi("GET");
        esAdministrador = resultado.rol === "Admin"
        configurarAcciones();

        actividades = resultado.actividades;
        mostrarActividades();
        


    } catch (error) {
        alert("Error al cargarlas actividades: " + error.message);
    }
}

    function mostrarActividades() {
        listaActividades.replaceChildren();
        //limpia todo lo que tenga la tabla : replaceChildren

        //si no encuentra actividades en la base de datos ejecuta este if
        //crea uno que dice que no hay actividades
        if (actividades.length === 0) {
            const fila = document.createElement("tr");
            const celda = document.createElement("td");
            celda.colSpan = esAdministrador ? 5 : 4; // SI ES administrador crea 5 celdas, si no crea , y trae los datos de la base de datos 
            celda.className = "text-center py-4 text-muted";
            celda.textContent = "No hay actividades disponibles.";

            //filas siempre van primero 
            fila.append(celda);
            listaActividades.append(fila);

            //append es agregar o añadir, agrega contenido al final de algo que ya existe sin eliminar nada anterior
            return;

        }
        //recorre el arreglo 
        //todos los registros que encuentre en la bse de datos
        actividades.forEach((actividad) => {
            const fila = document.createElement("tr");
            //cada que encuentra una actividad crea una fila
            fila.append(
                crearCelda(actividad.nombreActividad),
                crearCelda(actividad.fechaEvento),
                crearCelda(actividad.municipio),
                crearCelda(actividad.totalRecaudo === null ? "Pendiente" : Number(actividad.totalRecaudado).toLocaleString("es-CO", { style: "currency", currency: "COP" })),
                // si no lo encuentra lo pone null y sale pendiente, lo cambie a moneda por lo tanto pone el signo $
            );
            //si es verdadero
            if (esAdministrador) {
                const acciones = document.createElement("td");
                acciones.className = "text-nowrap";

                //crear bootn editar

                const botonEditar = document.createElement("button");
                botonEditar.type = "button";
                botonEditar.className = "btn btn-sm btn-outline-primary me-2";
                //tipo de boton segun boostrap
                botonEditar.ineerHTML = '<i class= "bi bi-pencil"></i>';
                //llama al icono
                botonEditar.addEventListener("click", () => abrirEdicion(actividad));
            }
            if (esAdministrador) {
                const acciones = document.createElement("td");
                acciones.className = "text-nowrap";

                //crear bootn eliminar

                const botonEliminar = document.createElement("button");
                botonEliminar.type = "button";
                botonEliminar.className = "btn btn-sm btn-outline-primary me-2";
                //tipo de boton segun boostrap
                botonEliminar.ineerHTML = '"<i class="bi bi-x-octagon-fill"></i>"';
                //llama al icono
                botonEliminar.addEventListener("click", () => abrirEdicion(actividad));

                //agrega estos botones 
                acciones.append(botonEditar, botonEliminar);
                fila.append(acciones);
            }
            // th son encabezados 
            //td son encabezados en otro formato 
            listaActividades.append(fila);
        });


    }
    function crearCelda(texto){
        const celda = document.createElement("td");
        celda.textContent = texto;
        //devuelve solo el texto de la celda  
        return celda;
    }

    cargarActividades();


