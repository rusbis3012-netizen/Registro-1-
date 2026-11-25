<?php
require_once __DIR__.'/../Config/conexion.php';

class Asociado {
    private $documento;
    private $nombres;
    private $apellidos;
    private $direccionResidencia;
    private $ciudad;
    private $telefono;
    private $email;
    private $genero;
    private $fechaNacimiento;
    private $conexion;
    private $Contraseña;

    public function __construct($datos) {
        $this->documento = $datos['documento'];
        $this->nombres = $datos['nombres'];
        $this->apellidos = $datos['apellidos'];
        $this->direccionResidencia = $datos['direccionResidencia'];
        $this->ciudad = $datos['ciudad'];
        $this->telefono = $datos['telefono'];
        $this->email = $datos['email'];
        $this->genero = $datos['genero'];
        $this->fechaNacimiento = $datos['fechaNacimiento'];
        $this->Contraseña = password_hash($datos['Contraseña'], PASSWORD_DEFAULT); // Hash de la contraseña

        $conexion = new Conexion();
        $this->conexion = $conexion->conectar();
    }

    public function guardar() {
        $sql = "INSERT INTO asociados (documento, nombres, apellidos, direccionResidencia, ciudad, telefono, email, genero, fechaNacimiento, Contraseña) VALUES (:documento, :nombres, :apellidos, :direccionResidencia, :ciudad, :telefono, :email, :genero, :fechaNacimiento, :contrasena)";
        
        $consulta = $this->conexion->prepare($sql);
        
        return $consulta->execute([
            ":documento" => $this->documento,          // CORREGIDO: Tenía un error de tipeo ($this-> docmento)
            ":nombres" => $this->nombres,
            ":apellidos" => $this->apellidos,
            ":direccionResidencia" => $this->direccionResidencia,
            ":ciudad" => $this->ciudad,
            ":telefono" => $this->telefono,
            ":email" => $this->email,
            ":genero" => $this->genero,
            ":fechaNacimiento" => $this->fechaNacimiento,
            ":contrasena" => $this->Contraseña
        ]);                                            // CORREGIDO: Faltaba el punto y coma (;) al final
    }

    public static function listar() {
        $conexion = new Conexion();
        $consulta = $conexion->conectar()->prepare(
            "SELECT documento, nombres, apellidos, direccionResidencia, ciudad,
                    telefono, email, genero, fechaNacimiento
             FROM asociados
             ORDER BY nombres, apellidos"
        );
        $consulta->execute();
        return $consulta->fetchAll();
    }

    public static function editar($datos) {
        $conexion = new Conexion();
        $sql = "UPDATE asociados
                SET nombres = :nombres,
                    apellidos = :apellidos,
                    direccionResidencia = :direccionResidencia,
                    ciudad = :ciudad,
                    telefono = :telefono,
                    email = :email,
                    genero = :genero,
                    fechaNacimiento = :fechaNacimiento
                WHERE documento = :documento";
        $consulta = $conexion->conectar()->prepare($sql);
        $consulta->execute([
            ":nombres" => $datos["nombres"],
            ":apellidos" => $datos["apellidos"],
            ":direccionResidencia" => $datos["direccionResidencia"],
            ":ciudad" => $datos["ciudad"],
            ":telefono" => $datos["telefono"],
            ":email" => $datos["email"],
            ":genero" => $datos["genero"],
            ":fechaNacimiento" => $datos["fechaNacimiento"],
            ":documento" => $datos["documentoOriginal"]
        ]);
        return $consulta->rowCount() > 0;
    }

    public static function eliminar($documento) {
        $conexion = new Conexion();
        $consulta = $conexion->conectar()->prepare(
            "DELETE FROM asociados WHERE documento = :documento"
        );
        $consulta->execute([":documento" => $documento]);
        return $consulta->rowCount() > 0;
    }
}