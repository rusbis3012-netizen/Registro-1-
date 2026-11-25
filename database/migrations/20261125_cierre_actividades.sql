ALTER TABLE actividades
    ADD COLUMN estado ENUM('Programada', 'En curso', 'Finalizada', 'Cancelada')
    NOT NULL DEFAULT 'Programada' AFTER totalRecaudado;

ALTER TABLE actividades_asociado
    ADD UNIQUE KEY uq_actividades_asociado_actividad_asociado (idActividad, idAsociado);
