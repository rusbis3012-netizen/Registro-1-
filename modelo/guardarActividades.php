<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");

function leerDatos() {
    $datos = json_decode(file_get_contents("php://input"), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        throw new Exception("Error al decodificar JSON: " . json_last_error_msg());
    }
    return $datos;
}

function validarActividad($datos) {
    $nombre = $datos['nombreActividad'] ?? null;
    $fechaEvento = $datos['fechaEvento'] ?? null;
    $municipio = $datos['municipio'] ?? null;
    $totalRecaudado = $datos['totalRecaudado'] ?? null;

    if (!is_string($nombre) || trim($nombre) === "" || strlen(trim($nombre)) > 100 ||
        !is_string($fechaEvento) || trim($fechaEvento) === "" ||
        !is_string($municipio) || trim($municipio) === "" || strlen(trim($municipio)) > 50) {
        http_response_code(400);
        throw new Exception("Ingresa un nombre, fecha y municipio validos");
    }

    if ($totalRecaudado !== null && $totalRecaudado !== "") {
        if (!is_numeric($totalRecaudado) || (float) $totalRecaudado < 0) {
            http_response_code(400);
            throw new Exception("El total recaudado no es valido");
        }
    } else {
        $totalRecaudado = null;
    }

    return [
        "nombreActividad" => trim($nombre),
        "fechaEvento" => trim($fechaEvento),
        "municipio" => trim($municipio),
        "totalRecaudado" => $totalRecaudado
    ];
}

function validarId($id) {
    $idActividad = filter_var(
        $id,
        FILTER_VALIDATE_INT,
        ["options" => ["min_range" => 1]]
    );
    if ($idActividad === false) {
        http_response_code(400);
        throw new Exception("El identificador de la actividad no es valido");
    }
    return $idActividad;
}

try{
    if(!isset($_SESSION["documento"], $_SESSION["rol"])){
        http_response_code(401);
        throw new Exception("Inicia sesion para consultar las actividades");
    }
    $metodo = $_SERVER["REQUEST_METHOD"];
    if(!in_array($metodo, ["GET", "POST", "PUT", "DELETE"], true)){
        http_response_code(405);
        throw new Exception("Metodo Http no permitido");
    }
    $rol = mb_strtolower(trim((string) $_SESSION["rol"]), "UTF-8");
    $esAdministrador = in_array(
        $rol,
        ["admin", "administrador"],
        true
    );

    if($metodo !== "GET" && !$esAdministrador){
        http_response_code(403);
        throw new Exception("No tienes permisos para realizar esta accion");
    }

    require_once __DIR__."/Actividad.php";
    $actividad = new Actividad();

    switch($metodo){
        case "GET":
            $resultado =[
                "success" =>true,
                "rol" => $_SESSION["rol"],
                "actividades" => $actividad ->obtenerActividad()
            ];
            http_response_code(200);
            break;
            case "POST":
                $datos = validarActividad(leerDatos());
                $actividad -> guardar($datos);
                $resultado = [
                    "success" => true,
                    "message" => "Actividad creada exitosamente"
                ];
                http_response_code(201);
                break;
            case "PUT":
                $datos = leerDatos();
                $datos["idActividad"] = validarId ($datos["idActividad"] ?? null);
                $datos = array_merge($datos,validarActividad($datos));

                if(!$actividad ->editar ($datos)){
                    http_response_code(404);
                    throw new Exception("no se encontro la activiad");

                }
                $resultado = [
                    "success" => true,
                    "mensaje" => "actividad actualizada correctamente"
                ];
                http_response_code(200);
                break;
            case "DELETE":
                $datos = leerDatos();
                $idActividad = validarId($datos["idActividad"] ?? null);

                if (!$actividad ->eliminar ($idActividad)){
                    http_response_code(404);
                    throw new Exception("no se encontro la actividad");
                }

                $resultado = [
                    "success" => true,
                    "mensaje" => "actividad eliminada correctamente"
                ];
                http_response_code(200);
                break;
    }
    echo json_encode($resultado);
}catch(PDOException $e){
    echo json_encode([
        "success" => false,
        "message" => $e -> getMessage()
    ]);
}catch(Exception $e){
    echo json_encode([
        "success" => false,
        "message" => $e -> getMessage()
    ]);
}