const formulario = document.getElementById("formRegistro");

formulario.addEventListener("submit", async function (event) {

    event.preventDefault();
    //Evita recargar la pagina al enviar el formulario

    const botonGuardar = formulario.querySelector('button[type="submit"]');
    //desabilita boton guaardar 

    const Asociado = Object.fromEntries(new FormData(formulario).entries());
    //Lee los campos del formulario y los convierte en un objeto

    botonGuardar.disabled = true; 
    //Desabilita el boton mientras se procesa la solicitud

    try{
        const respuesta = await fetch(formulario.action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Asociado)})
        let resultado;
        try {
            resultado = await respuesta.json();
        } catch {
            throw new Error(`El servidor respondió con HTTP ${respuesta.status}, pero no devolvió JSON. Revisa la consola.`);
        }
        //pasar la respuesta de json a un objeto de javascript 
        document.getElementById("mensajeRegistro").textContent ="Guardando...";
        document.getElementById("mensajeRegistro").dataset.tipo = "";
        document.getElementById("mensajeRegistro").textContent = resultado.message;
        if (respuesta.ok && resultado.success){
            formulario.reset(); //Limpiar el formulario si la solicitud fue exitosa
        }
    }catch (error) {
        console.error("Error al enviar el formulario: ",error);
        document.getElementById("mensajeRegistro").textContent = error.message || "Ocurrió un error al enviar el formulario.";
    }finally{
        botonGuardar.disabled = false; //Habilitar el boton despues de procesar la solicitud.
    }
});