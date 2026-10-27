const usuarios = [
    { usuario: 'Doris@gmail.com', clave: '1234', rol: 'Administrador' },
    { usuario: 'Rubi@gmail.com', clave: '5678', rol: 'Usuario' }
];
document.getElementById("Login").addEventListener('submit', function (e) {
    e.preventDefault();
    const usuarioInput = document.getElementById('Usuario').value;
    const claveInput = document.getElementById('Contraseña').value;

    const usuarioEncontrado = usuarios.find
        (u => u.usuario === usuarioInput && u.clave === claveInput);
    if (usuarioEncontrado) {
        localStorage.setItem('logueado', 'true');
        localStorage.setItem('rol', usuarioEncontrado.rol);
        localStorage.setItem('nombre', usuarioEncontrado.nombre);
        window.location.href = 'Dashboard.html';
    } else {
        alert('Usuario o contraseña incorrectos');

    }
});