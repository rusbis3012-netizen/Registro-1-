document.addEventListener('DOMContentLoaded', () => {
    const Logueado =localStorage.getItem('logueado');
    if (Logueado !== 'true') {
        window.location.href = 'login.html';
        return;
    }
    const nombre = localStorage.getItem('nombre');
    const rol = localStorage.getItem('rol');
    document.getElementById('NombreUsuario').textContent = nombre;

    if (rol === 'Administrador') {
        document.getElementById('TarjetasAdministrador').classList.remove('d-none');
        document.getElementById('TarjetaAsociados').classList.add('d-none');
    }else{
        document.getElementById('TarjetasAdministrador').classList.add('d-none');
        document.getElementById('TarjetaAsociados').classList.remove('d-none');
        

    }

});

function cerrarSesion() {
    localStorage.removeItem('logueado');
    localStorage.removeItem('rol');
    localStorage.removeItem('nombre');
    window.location.href = 'login.html';
}