<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

function validarFechaPrestamo($fechaPrestamo) {
    if (!is_string($fechaPrestamo)) {
        http_response_code(400);
        throw new Exception('La fecha del préstamo no es válida');
    }

    $zonaHoraria = new DateTimeZone('America/Bogota');
    $fecha = DateTimeImmutable::createFromFormat('!Y-m-d', $fechaPrestamo, $zonaHoraria);
    $errores = DateTimeImmutable::getLastErrors();

    if ($fecha === false ||
        $fecha->format('Y-m-d') !== $fechaPrestamo ||
        ($errores !== false && ($errores['warning_count'] > 0 || $errores['error_count'] > 0))) {
        http_response_code(400);
        throw new Exception('La fecha del préstamo no es válida');
    }

    $hoy = new DateTimeImmutable('today', $zonaHoraria);
    if ($fecha < $hoy) {
        http_response_code(400);
        throw new Exception('La fecha del préstamo debe ser hoy o una fecha futura');
    }
}

try {
    if (!isset($_SESSION['documento'], $_SESSION['rol'])) {
        http_response_code(401);
        throw new Exception('Inicia sesion para consultar los prestamos');
    }

    $metodo = $_SERVER['REQUEST_METHOD'];
    if (!in_array($metodo, ['GET', 'POST', 'PUT', 'DELETE'], true)) {
        http_response_code(405);
        throw new Exception('Metodo no permitido');
    }

    $rol = mb_strtolower(trim((string) $_SESSION['rol']), 'UTF-8');
    $esAdministrador = in_array($rol, ['admin', 'administrador'], true);
    if ($metodo !== 'GET' && !$esAdministrador) {
        http_response_code(403);
        throw new Exception('No tienes permisos para realizar esta accion');
    }

    require_once __DIR__.'/Prestamo.php';
    require_once __DIR__.'/Asociado.php';
    $prestamo = new Prestamo();

    if ($metodo === 'GET') {
        $idAsociado = null;
        if (!$esAdministrador) {
            $idAsociado = Asociado::obtenerIdPorDocumento(trim((string) $_SESSION['documento']));
            if ($idAsociado === false) {
                http_response_code(404);
                throw new Exception('No se encontró el asociado de la sesión');
            }
        }

        echo json_encode([
            'success' => true,
            'rol' => $_SESSION['rol'],
            'prestamos' => $prestamo->listar($idAsociado)
        ]);
        exit;
    }

    $datos = json_decode(file_get_contents('php://input'), true);
    if (!is_array($datos) || json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        throw new Exception('Datos invalidos');
    }

    if ($metodo === 'DELETE') {
        $idPrestamo = filter_var($datos['idPrestamo'] ?? null, FILTER_VALIDATE_INT);
        if (!$idPrestamo || !$prestamo->eliminar($idPrestamo)) {
            http_response_code(404);
            throw new Exception('No se encontro el prestamo');
        }
        echo json_encode(['success' => true, 'message' => 'Prestamo eliminado']);
        exit;
    }

    $documento = trim((string) ($datos['documento'] ?? ''));
    $asociado = $prestamo->buscarAsociado($documento);
    if (!$asociado) {
        http_response_code(404);
        throw new Exception('El documento no pertenece a un asociado');
    }

    $campos = [
        'valorPrestamo' => $datos['valorPrestamo'] ?? null,
        'tasaInteres' => $datos['tasaInteres'] ?? null,
        'numeroCuotas' => $datos['numeroCuotas'] ?? null,
        'fechaPrestamo' => $datos['fechaPrestamo'] ?? null
    ];
    foreach ($campos as $valor) {
        if ($valor === null || $valor === '') {
            http_response_code(400);
            throw new Exception('Completa todos los datos del prestamo');
        }
    }

    validarFechaPrestamo($campos['fechaPrestamo']);
    $campos['idAsociado'] = $asociado['idAsociado'];

    $montoPrestamo = filter_var($campos['valorPrestamo'], FILTER_VALIDATE_FLOAT);
    if ($montoPrestamo === false || $montoPrestamo <= 0) {
        http_response_code(400);
        throw new Exception('El valor del prestamo no es valido');
    }
    $campos['valorPrestamo'] = $montoPrestamo;

    $idPrestamoExcluir = null;
    if ($metodo === 'PUT') {
        $idPrestamoExcluir = filter_var($datos['idPrestamo'] ?? null, FILTER_VALIDATE_INT);
        if (!$idPrestamoExcluir) {
            http_response_code(400);
            throw new Exception('Identificador invalido');
        }
        $campos['idPrestamo'] = $idPrestamoExcluir;
    }

    $resumenPrestamos = $prestamo->sumaPrestamo(
        $campos['idAsociado'],
        $idPrestamoExcluir
    );

    if ((int) $resumenPrestamos['cantidad'] >= 3) {
        http_response_code(400);
        throw new Exception('El asociado ya tiene 3 prestamos activos');
    }

    $totalConNuevoPrestamo = round(
        (float) $resumenPrestamos['total'] + $montoPrestamo,
        2
    );
    if ($totalConNuevoPrestamo > 80000000) {
        http_response_code(400);
        throw new Exception('El total de prestamos superaria los 80 millones');
    }

    if ($metodo === 'POST') {
        if (!$prestamo->guardar($campos)) {
            http_response_code(500);
            throw new Exception('No fue posible guardar el prestamo');
        }
        echo json_encode(['success' => true, 'message' => 'Prestamo registrado']);
    } else {
        if (!$prestamo->editar($campos)) {
            http_response_code(404);
            throw new Exception('No se encontro el prestamo');
        }
        echo json_encode(['success' => true, 'message' => 'Prestamo actualizado']);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
