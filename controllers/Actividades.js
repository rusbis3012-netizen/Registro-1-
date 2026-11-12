const listaActividades= document.getElementById("listaActividades");
async function solicitarApi(metodo, datos) {
    const opciones = {
        method: metodo,
        headers: {'Content-Type': 'application/json'},
    }
    if(datos){
        opciones.body = JSON.stringify(datos);
    }
     const respuesta = await fetch("../modelo/gestionarActividades.php", opciones);
     const resultado = await respuesta.json();
     if(respuesta.status === 401){
        window.location.href = "login.html";
     }
     //401 cuando el usuario no esta autenticado 
     //403 cuando el usuario no tiene el permiso 
     if(!respuesta.ok  || !resultado.success){
        throw new Error(resultado.mensaje || "Error en la solicitud");
     }
     return resultado;
}
