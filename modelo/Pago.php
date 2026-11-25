<?php
require_once __DIR__.'/../Config/conexion.php';

class Pago {
    private $conexion;

    public function __construct() {
        $this->conexion = (new Conexion())->conectar();
    }

    public function listar() {
        $consulta = $this->conexion->prepare(
            "SELECT pg.idPago, pg.valorCuota, pg.fechaPago, pg.idPrestamo,
                    p.valorPrestamo, p.fechaPrestamo,
                    a.documento, a.nombres, a.apellidos
             FROM pagos_cuotas pg
             JOIN prestamos p ON p.idPrestamo = pg.idPrestamo
             JOIN asociados a ON a.idAsociado = p.idAsociado
             ORDER BY pg.fechaPago DESC"
        );
        $consulta->execute();
        return $consulta->fetchAll();
    }

    public function guardar($datos) {
        $consulta = $this->conexion->prepare(
            "INSERT INTO pagos_cuotas (valorCuota, fechaPago, idPrestamo)
             VALUES (:valorCuota, :fechaPago, :idPrestamo)"
        );
        return $consulta->execute([
            ':valorCuota' => $datos['valorCuota'],
            ':fechaPago' => $datos['fechaPago'],
            ':idPrestamo' => $datos['idPrestamo']
        ]);
    }

    public function editar($datos) {
        $consulta = $this->conexion->prepare(
            "UPDATE pagos_cuotas
             SET valorCuota = :valorCuota,
                 fechaPago = :fechaPago,
                 idPrestamo = :idPrestamo
             WHERE idPago = :idPago"
        );
        $consulta->execute([
            ':valorCuota' => $datos['valorCuota'],
            ':fechaPago' => $datos['fechaPago'],
            ':idPrestamo' => $datos['idPrestamo'],
            ':idPago' => $datos['idPago']
        ]);
        return $consulta->rowCount() > 0;
    }

    public function eliminar($idPago) {
        $consulta = $this->conexion->prepare(
            "DELETE FROM pagos_cuotas WHERE idPago = :idPago"
        );
        $consulta->execute([':idPago' => $idPago]);
        return $consulta->rowCount() > 0;
    }
}
