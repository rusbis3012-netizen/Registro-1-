<?php
session_start();

header('Content-Type: application/json; charset=utf-8');

try {
    
    if (!isset($_SESSION['documento'], $_SESSION['rol'])) {
      
        http_response_code(401);
 
        throw new Exception('Inicia sesion para consultar los pagos');
    }


    $metodo = $_SERVER['REQUEST_METHOD'];
  
    if (!in_array($metodo, ['GET', 'POST', 'PUT', 'DELETE'], true)) {
       
        http_response_code(405);
        throw new Exception('Metodo no permitido');
    }

    // Normaliza el rol para compararlo sin importar mayúsculas o espacios.
    $rol = mb_strtolower(trim((string) $_SESSION['rol']), 'UTF-8');
    
    $esAdministrador = in_array($rol, ['admin', 'administrador'], true);
    // Identifica si el usuario tiene el rol de asociado.
    $esAsociado = $rol === 'asociado';
    // Permite consultar con GET; para las demás acciones revisa los permisos.
    if ($metodo !== 'GET' &&
        !$esAdministrador &&
        !($esAsociado && $metodo === 'POST')) {
        
        http_response_code(403);
        throw new Exception('No tienes permisos para realizar esta accion');
    }

    
    require_once __DIR__.'/Pago.php';
    require_once __DIR__.'/Asociado.php';
    // Crea el objeto que permite consultar y modificar pagos.
    $pago = new Pago();

    // Atiende las solicitudes que consultan pagos y préstamos disponibles.
    if ($metodo === 'GET') {
        // Por defecto, no limita la consulta a un asociado específico.
        $idAsociado = null;
        // Prepara una lista vacía de préstamos disponibles.
        $prestamosParaPago = [];
        // Si no es administrador, limita la consulta al asociado de la sesión.
        if (!$esAdministrador) {
            // Busca el ID del asociado usando el documento guardado en la sesión.
            $idAsociado = Asociado::obtenerIdPorDocumento(trim((string) $_SESSION['documento']));
            // Devuelve error si no se encuentra el asociado.
            if ($idAsociado === false) {
                http_response_code(404);
                throw new Exception('No se encontró el asociado de la sesión');
            }
            // Consulta los préstamos que el asociado puede pagar este mes.
            $prestamosParaPago = $pago->listarPrestamosParaPago($idAsociado);
        }

        // Devuelve el rol, los pagos visibles y los préstamos disponibles como JSON.
        echo json_encode([
            'success' => true,
            'rol' => $_SESSION['rol'],
            'pagos' => $pago->listar($idAsociado),
            'prestamosParaPago' => $prestamosParaPago
        ]);
        // Finaliza la solicitud GET para que no continúe con otra operación.
        exit;
    }

    // Lee el cuerpo de la solicitud y convierte el JSON a un arreglo.
    $datos = json_decode(file_get_contents('php://input'), true);
    // Rechaza la solicitud si el contenido no es un JSON válido en forma de arreglo.
    if (!is_array($datos) || json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        throw new Exception('Datos invalidos');
    }

    // Procesa la eliminación de un pago solicitada por un administrador.
    if ($metodo === 'DELETE') {
        // Obtiene el ID y comprueba que sea un número entero válido.
        $idPago = filter_var($datos['idPago'] ?? null, FILTER_VALIDATE_INT);
        // Rechaza la acción si el ID no es válido o no se encontró el pago.
        if (!$idPago || !$pago->eliminar($idPago)) {
            http_response_code(404);
            throw new Exception('No se encontro el pago');
        }
        // Confirma en JSON que el pago se eliminó correctamente.
        echo json_encode(['success' => true, 'message' => 'Pago eliminado']);
        // Finaliza la solicitud para no continuar con otro tipo de operación.
        exit;
    }

    // Procesa el pago mensual enviado por un asociado.
    if ($esAsociado && $metodo === 'POST') {
        // Obtiene y valida el ID del préstamo seleccionado.
        $idPrestamo = filter_var($datos['idPrestamo'] ?? null, FILTER_VALIDATE_INT);
        // Rechaza la solicitud si el ID del préstamo no es válido.
        if (!$idPrestamo) {
            http_response_code(400);
            throw new Exception('Selecciona un prestamo valido');
        }

        // Busca el ID del asociado usando el documento de su sesión.
        $idAsociado = Asociado::obtenerIdPorDocumento(trim((string) $_SESSION['documento']));
        // Devuelve error si la sesión no corresponde a un asociado registrado.
        if ($idAsociado === false) {
            http_response_code(404);
            throw new Exception('No se encontro el asociado de la sesion');
        }

        // Registra la cuota mensual después de validar el préstamo y el asociado.
        $pagoRegistrado = $pago->registrarCuotaMensual($idPrestamo, $idAsociado);
        // Devuelve el resultado del registro en formato JSON.
        echo json_encode([
            'success' => true,
            'message' => 'Cuota mensual registrada correctamente',
            'pago' => $pagoRegistrado
        ]);
        // Finaliza la solicitud para no procesarla como pago manual.
        exit;
    }

    // Obtiene el valor de la cuota; usa null si no llegó en la solicitud.
    $valorCuota = $datos['valorCuota'] ?? null;
    // Obtiene la fecha del pago; usa null si no llegó en la solicitud.
    $fechaPago = $datos['fechaPago'] ?? null;
    // Obtiene el id del préstamo y comprueba que sea un número entero válido.
    $idPrestamo = filter_var($datos['idPrestamo'] ?? null, FILTER_VALIDATE_INT);
    // Rechaza la solicitud si falta el valor, la fecha es '' o el préstamo no es válido.
    if ($valorCuota === null || $valorCuota === '' || $fechaPago === '' || !$idPrestamo) {
        // Indica que la solicitud no contiene datos válidos.
        http_response_code(400);
        // Detiene el proceso y devuelve el mensaje de validación.
        throw new Exception('Completa el valor, la fecha y el prestamo');
    }

    // Agrupa los datos validados para enviarlos al modelo de pagos.
    $campos = [
        'valorCuota' => $valorCuota,
        'fechaPago' => $fechaPago,
        'idPrestamo' => $idPrestamo
    ];

    // Guarda un pago nuevo si el método de la solicitud es POST.
    if ($metodo === 'POST') {
        // Intenta guardar el pago; si falla, responde con un error del servidor.
        if (!$pago->guardar($campos)) {
            http_response_code(500);
            throw new Exception('No fue posible guardar el pago');
        }
        // Confirma que el nuevo pago fue registrado.
        echo json_encode(['success' => true, 'message' => 'Pago registrado']);
    } else {
        // Obtiene y valida el ID del pago que se va a editar.
        $idPago = filter_var($datos['idPago'] ?? null, FILTER_VALIDATE_INT);
        // Rechaza la edición si no llegó un ID válido.
        if (!$idPago) {
            http_response_code(400);
            throw new Exception('Identificador invalido');
        }
        // Añade el ID al conjunto de datos para identificar qué pago actualizar.
        $campos['idPago'] = $idPago;
        // Intenta actualizar el pago; si no se encuentra, devuelve un error.
        if (!$pago->editar($campos)) {
            http_response_code(404);
            throw new Exception('No se encontro el pago');
        }
        // Confirma que el pago existente fue actualizado.
        echo json_encode(['success' => true, 'message' => 'Pago actualizado']);
    }
// Captura errores de base de datos y responde con estado HTTP 500.
} catch (PDOException $e) {
    http_response_code(500);
    // Incluye el mensaje del error de base de datos en la respuesta JSON.
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
// Captura errores de validación, permisos u otras operaciones del proceso.
} catch (Exception $e) {
    // Devuelve el mensaje del error en formato JSON.
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
