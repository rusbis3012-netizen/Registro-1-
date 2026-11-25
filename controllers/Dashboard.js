document.addEventListener('DOMContentLoaded', () => {
    const logueado = localStorage.getItem('logueado');

    if (logueado !== 'true') {
        window.location.href = '../vista/login.html';
        return;
    }

    const nombre = localStorage.getItem('nombre') || '';
    const rol = (localStorage.getItem('rol') || '').trim().toLowerCase();

    document.getElementById('NombreUsuario').textContent = nombre;
    const tarjetasAdministrador = document.getElementById('TarjetasAdministrador');
    const tarjetasAsociado = document.getElementById('TarjetaAsociados');
    const esAdministrador = ['admin', 'administrador'].includes(rol);
    const esAsociado = rol === 'asociado';

    if (!esAdministrador && !esAsociado) {
        localStorage.removeItem('logueado');
        localStorage.removeItem('rol');
        window.location.href = '../vista/login.html';
        return;
    }

    tarjetasAdministrador.classList.toggle('d-none', !esAdministrador);
    tarjetasAsociado.classList.toggle('d-none', !esAsociado);
});

async function cerrarSesion(){
    try{
        const respuesta = await fetch("../modelo/cerrarSesion.php", {
            method: "POST",
        });
        if(!respuesta.ok){
            throw new Error("Error al cerrar sesion");
        }
        localStorage.clear();
        window.location.href='../vista/login.html';
    }catch(error){
        console.error("Error al cerrar sesion:", error )

    }
}