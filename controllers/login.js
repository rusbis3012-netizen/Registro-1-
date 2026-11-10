const formulario = document.getElementById('Login');

if (formulario) {
    let mensaje = document.getElementById('mensajeLogin');
    if (!mensaje) {
        mensaje = document.createElement('div');
        mensaje.id = 'mensajeLogin';
        mensaje.setAttribute('aria-live', 'polite');
        formulario.appendChild(mensaje);
    }

    formulario.addEventListener('submit', async function (e) {
        e.preventDefault();

        const boton = formulario.querySelector('button[type="submit"]');
       // const email = document.getElementById('Usuario').value.trim();
        //const contraseña = document.getElementById('Contraseña').value;

        boton.disabled = true;
        mensaje.textContent = '';

        try {
            const respuesta = await fetch(formulario.action, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(Object.fromEntries(new FormData(formulario).entries())),
            });

            const resultado = await respuesta.json();

            if (!resultado.success) {
                mensaje.textContent = resultado.message || 'No fue posible iniciar sesion. Por favor, verifica tus credenciales.';
                return;
            }

            localStorage.setItem('logueado', 'true');
            localStorage.setItem('rol', resultado.rol);
            localStorage.setItem('nombre', resultado.nombre);
            window.location.href = 'Dashboard.html';
        } catch (error) {
            console.error('Error al iniciar sesion:', error);
            mensaje.textContent = 'Ocurrió un error al intentar iniciar sesión.';
        } finally {
            boton.disabled = false;
        }
    });
}