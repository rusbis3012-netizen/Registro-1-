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

    $rol = mb_strtolower(trim((string) $_SESSION['rol']), 'UTF-8');
    $esAdministrador = in_array($rol, ['admin', 'administrador'], true);
    if ($metodo !== 'GET' && !$esAdministrador) {
        http_response_code(403);
        throw new Exception('No tienes permisos para realizar esta accion');
    }

    require_once __DIR__.'/Pago.php';
    $pago = new Pago();

    if ($metodo === 'GET') {
        echo json_encode([
            'success' => true,
            'rol' => $_SESSION['rol'],
            'pagos' => $pago->listar()
        ]);
        exit;
    }

    $datos = json_decode(file_get_contents('php://input'), true);
    if (!is_array($datos) || json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        throw new Exception('Datos invalidos');
    }

    if ($metodo === 'DELETE') {
        $idPago = filter_var($datos['idPago'] ?? null, FILTER_VALIDATE_INT);
        if (!$idPago || !$pago->eliminar($idPago)) {
            http_response_code(404);
            throw new Exception('No se encontro el pago');
        }
        echo json_encode(['success' => true, 'message' => 'Pago eliminado']);
        exit;
    }

    $valorCuota = $datos['valorCuota'] ?? null;
    $fechaPago = $datos['fechaPago'] ?? null;
    $idPrestamo = filter_var($datos['idPrestamo'] ?? null, FILTER_VALIDATE_INT);
    if ($valorCuota === null || $valorCuota === '' || $fechaPago === '' || !$idPrestamo) {
        http_response_code(400);
        throw new Exception('Completa el valor, la fecha y el prestamo');
    }

    $campos = [
        'valorCuota' => $valorCuota,
        'fechaPago' => $fechaPago,
        'idPrestamo' => $idPrestamo
    ];

    if ($metodo === 'POST') {
        if (!$pago->guardar($campos)) {
            http_response_code(500);
            throw new Exception('No fue posible guardar el pago');
        }
        echo json_encode(['success' => true, 'message' => 'Pago registrado']);
    } else {
        $idPago = filter_var($datos['idPago'] ?? null, FILTER_VALIDATE_INT);
        if (!$idPago) {
            http_response_code(400);
            throw new Exception('Identificador invalido');
        }
        $campos['idPago'] = $idPago;
        if (!$pago->editar($campos)) {
            http_response_code(404);
            throw new Exception('No se encontro el pago');
        }
        echo json_encode(['success' => true, 'message' => 'Pago actualizado']);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
