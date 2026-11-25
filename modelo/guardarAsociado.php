<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ .'/../modelo/Asociado.php';

function validarMayorEdad($fechaNacimiento) {
    if (!is_string($fechaNacimiento)) {
        http_response_code(400);
        throw new Exception('La fecha de nacimiento no es válida');
    }

    $zonaHoraria = new DateTimeZone('America/Bogota');
    $fecha = DateTimeImmutable::createFromFormat('!Y-m-d', $fechaNacimiento, $zonaHoraria);
    $errores = DateTimeImmutable::getLastErrors();

    if ($fecha === false ||
        $fecha->format('Y-m-d') !== $fechaNacimiento ||
        ($errores !== false && ($errores['warning_count'] > 0 || $errores['error_count'] > 0))) {
        http_response_code(400);
        throw new Exception('La fecha de nacimiento no es válida');
    }

    $fechaLimite = (new DateTimeImmutable('today', $zonaHoraria))->modify('-18 years');
    if ($fecha > $fechaLimite) {
        http_response_code(400);
        throw new Exception('El asociado debe tener al menos 18 años');
    }
}

try{
    $metodo = $_SERVER['REQUEST_METHOD'];
    if(!in_array($metodo, ['GET', 'POST', 'PUT', 'DELETE'], true)){
        http_response_code(405);
        throw new exception('Método no permitido');
    }

    if($metodo === 'GET'){
        if(!isset($_SESSION['documento'], $_SESSION['rol'])){
            http_response_code(401);
            throw new exception('Inicia sesion para consultar los asociados');
        }

        $rol = mb_strtolower(trim((string) $_SESSION['rol']), 'UTF-8');
        $esAdministrador = in_array($rol, ['admin', 'administrador'], true);
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
            'asociados' => Asociado::listar($idAsociado)
        ]);
        exit;
    }

    if($metodo !== 'POST'){
        if(!isset($_SESSION['documento'], $_SESSION['rol'])){
            http_response_code(401);
            throw new exception('Inicia sesion para realizar esta accion');
        }

        $rol = mb_strtolower(trim((string) $_SESSION['rol']), 'UTF-8');
        if(!in_array($rol, ['admin', 'administrador'], true)){
            http_response_code(403);
            throw new exception('No tienes permisos para realizar esta accion');
        }
    }

    if($metodo === 'POST' && isset($_SESSION['documento'], $_SESSION['rol'])){
        $rol = mb_strtolower(trim((string) $_SESSION['rol']), 'UTF-8');
        if(!in_array($rol, ['admin', 'administrador'], true)){
            http_response_code(403);
            throw new exception('No tienes permisos para realizar esta accion');
        }
    }

    //leer el contenido JSON de la solicitud enviada por fetch
    $json = file_get_contents('php://input');

    //decodificar el JSON a un array asociativo
    $datos = json_decode($json, true);  

    //validar que los datos requeridos estén presentes
    if(!is_array($datos) || json_last_error() !== JSON_ERROR_NONE){
        http_response_code(400);
        throw new exception('Datos inválidos en la solicitud');
    }

    if($metodo === 'DELETE'){
        $documento = trim((string) ($datos['documento'] ?? ''));
        if($documento === ''){
            http_response_code(400);
            throw new exception('Falta el documento del asociado');
        }
        if(!Asociado::eliminar($documento)){
            http_response_code(404);
            throw new exception('No se encontro el asociado');
        }
        echo json_encode(["success" => true, "message" => "Asociado eliminado exitosamente"]);
        exit;
    }

    if($metodo === 'PUT'){
        $camposEdicion = ["documentoOriginal","nombres","apellidos","direccionResidencia","ciudad","telefono","email","genero","fechaNacimiento"];
        foreach($camposEdicion as $campo){
            if(!isset($datos[$campo]) || $datos[$campo] === ''){
                http_response_code(400);
                throw new exception("Falta el campo:".$campo);
            }
        }
        validarMayorEdad($datos['fechaNacimiento']);
        if(!filter_var($datos['email'], FILTER_VALIDATE_EMAIL)){
            http_response_code(400);
            throw new exception("Email inválido");
        }
        if(!Asociado::editar($datos)){
            http_response_code(404);
            throw new exception("No se encontro el asociado");
        }
        echo json_encode(["success" => true, "message" => "Asociado actualizado exitosamente"]);
        exit;
    }

    $campos=["documento","nombres","apellidos","direccionResidencia","ciudad","telefono","email","genero","fechaNacimiento","Contraseña"];
    foreach($campos as $campo){
        if(!isset($datos[$campo])){
            http_response_code(400);
            throw new exception("Falta el campo:".$campo);
        }
    }

    validarMayorEdad($datos['fechaNacimiento']);
    if(!filter_var($datos['email'], FILTER_VALIDATE_EMAIL)){
        http_response_code(400);
        throw new exception("Email inválido");
    }
    $asociado = new Asociado($datos);
    $resultado = $asociado->guardar();
    if($resultado){
        http_response_code(201);
        echo json_encode(["success" => true, "message" => "Asociado guardado exitosamente"]);
    }else{
        http_response_code(500);
        throw new exception("Error al guardar el asociado");    
    }
}catch(PDOException $e){
    if($e-> getCode() ==23000){
        http_response_code(409);
        echo json_encode(["success" => false, "message" => "El documento ya existe en la base de datos"]);
    }else{
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error de base de datos: ".$e->getMessage()]);
    }
    //errores de codigo por ejemplo metodo http, datos invalidos 
    

}catch (Exception $e){
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
