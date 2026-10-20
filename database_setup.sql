-- ============================================================================
-- SCRIPT COMPLETO DE BASE DE DATOS - SISTEMA EDUCATIVO INSTITUCIONAL
-- Compatible con PostgreSQL y Supabase
-- Proyecto: Taller de Investigación II
-- ============================================================================

-- 1. TABLAS PRINCIPALES DEL MODELO ACADÉMICO
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "PlanesEstudio" (
    "PlanID" SERIAL PRIMARY KEY,
    "Carrera" VARCHAR(100) NOT NULL,
    "ClaveReticula" VARCHAR(20) NOT NULL, 
    "Especialidad" VARCHAR(100) NULL
);

CREATE TABLE IF NOT EXISTS "Materias" (
    "ClaveMateria" VARCHAR(10) PRIMARY KEY,
    "NombreMateria" VARCHAR(100) NOT NULL,
    "Creditos" INT NOT NULL,
    "SemestreSugerido" INT NULL
);

CREATE TABLE IF NOT EXISTS "Docentes" (
    "NumeroEmpleado" VARCHAR(10) PRIMARY KEY,
    "NombreCompleto" VARCHAR(100) NOT NULL,
    "Departamento" VARCHAR(100) NULL
);

-- 2. TABLA INTERMEDIA (RETÍCULAS)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "Reticulas" (
    "PlanID" INT NOT NULL,
    "ClaveMateria" VARCHAR(10) NOT NULL,
    PRIMARY KEY ("PlanID", "ClaveMateria"),
    FOREIGN KEY ("PlanID") REFERENCES "PlanesEstudio"("PlanID") ON DELETE CASCADE,
    FOREIGN KEY ("ClaveMateria") REFERENCES "Materias"("ClaveMateria") ON DELETE CASCADE
);

-- 3. ALUMNOS Y FINANZAS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "Alumnos" (
    "NumeroControl" VARCHAR(10) PRIMARY KEY,
    "Nombre" VARCHAR(50) NOT NULL,
    "Apellidos" VARCHAR(50) NOT NULL,
    "SemestreActual" INT NULL,
    "PlanID" INT NULL,
    "Estatus" VARCHAR(30) DEFAULT 'Activo', 
    FOREIGN KEY ("PlanID") REFERENCES "PlanesEstudio"("PlanID")
);

CREATE TABLE IF NOT EXISTS "Pagos" (
    "Referencia" VARCHAR(20) PRIMARY KEY,
    "NumeroControl" VARCHAR(10) NULL,
    "Concepto" VARCHAR(50) NOT NULL,
    "Monto" DECIMAL(10,2) NOT NULL,
    "FechaEmision" DATE NOT NULL,
    "FechaLimite" DATE NOT NULL,
    "EstatusPago" VARCHAR(20) DEFAULT 'Pendiente',
    FOREIGN KEY ("NumeroControl") REFERENCES "Alumnos"("NumeroControl") ON DELETE CASCADE
);

-- 4. GESTIÓN DE CLASES, CARGA Y KARDEX
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "Grupos" (
    "GrupoID" SERIAL PRIMARY KEY,
    "ClaveMateria" VARCHAR(10) NULL,
    "NumeroEmpleado" VARCHAR(10) NULL,
    "Periodo" VARCHAR(20) NULL, 
    "Aula" VARCHAR(10) NULL,
    "Capacidad" INT NULL,
    FOREIGN KEY ("ClaveMateria") REFERENCES "Materias"("ClaveMateria"),
    FOREIGN KEY ("NumeroEmpleado") REFERENCES "Docentes"("NumeroEmpleado")
);

CREATE TABLE IF NOT EXISTS "CargaAcademica" (
    "CargaID" SERIAL PRIMARY KEY,
    "NumeroControl" VARCHAR(10) NULL,
    "GrupoID" INT NULL,
    "Unidad1" DECIMAL(5,2) NULL,
    "Unidad2" DECIMAL(5,2) NULL,
    "Unidad3" DECIMAL(5,2) NULL,
    FOREIGN KEY ("NumeroControl") REFERENCES "Alumnos"("NumeroControl") ON DELETE CASCADE,
    FOREIGN KEY ("GrupoID") REFERENCES "Grupos"("GrupoID") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Kardex" (
    "RegistroID" SERIAL PRIMARY KEY,
    "NumeroControl" VARCHAR(10) NULL,
    "ClaveMateria" VARCHAR(10) NULL,
    "CalificacionFinal" DECIMAL(5,2) NULL,
    "TipoEvaluacion" VARCHAR(20) NULL, 
    "PeriodoAprobacion" VARCHAR(20) NULL,
    FOREIGN KEY ("NumeroControl") REFERENCES "Alumnos"("NumeroControl") ON DELETE CASCADE,
    FOREIGN KEY ("ClaveMateria") REFERENCES "Materias"("ClaveMateria")
);

-- ----------------------------------------------------------------------------
-- 5. VISTAS OFICIALES
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW "vista_carga_alumnos" AS
SELECT 
    a."NumeroControl",
    CONCAT(a."Nombre", ' ', a."Apellidos") AS "NombreEstudiante",
    m."ClaveMateria",
    m."NombreMateria",
    m."Creditos",
    g."Periodo",
    g."Aula",
    d."NombreCompleto" AS "DocenteAsignado",
    c."Unidad1",
    c."Unidad2",
    c."Unidad3"
FROM "Alumnos" a
JOIN "CargaAcademica" c ON a."NumeroControl" = c."NumeroControl"
JOIN "Grupos" g ON c."GrupoID" = g."GrupoID"
JOIN "Materias" m ON g."ClaveMateria" = m."ClaveMateria"
JOIN "Docentes" d ON g."NumeroEmpleado" = d."NumeroEmpleado";

CREATE OR REPLACE VIEW "vista_kardex_general" AS
SELECT 
    a."NumeroControl",
    CONCAT(a."Nombre", ' ', a."Apellidos") AS "NombreEstudiante",
    m."ClaveMateria",
    m."NombreMateria",
    k."CalificacionFinal",
    k."TipoEvaluacion",
    k."PeriodoAprobacion"
FROM "Alumnos" a
JOIN "Kardex" k ON a."NumeroControl" = k."NumeroControl"
JOIN "Materias" m ON k."ClaveMateria" = m."ClaveMateria";

CREATE OR REPLACE VIEW "vista_estado_financiero" AS
SELECT 
    p."Referencia",
    a."NumeroControl",
    CONCAT(a."Nombre", ' ', a."Apellidos") AS "NombreEstudiante",
    p."Concepto",
    p."Monto",
    p."FechaEmision",
    p."FechaLimite",
    p."EstatusPago"
FROM "Pagos" p
JOIN "Alumnos" a ON p."NumeroControl" = a."NumeroControl";

-- Vista adicional: Promedio y materias aprobadas por estudiante
CREATE OR REPLACE VIEW "vista_promedios_alumnos" AS
SELECT 
    a."NumeroControl",
    CONCAT(a."Nombre", ' ', a."Apellidos") AS "NombreEstudiante",
    COUNT(k."ClaveMateria") AS "MateriasAprobadas",
    ROUND(AVG(k."CalificacionFinal"), 2) AS "PromedioGeneral"
FROM "Alumnos" a
LEFT JOIN "Kardex" k ON a."NumeroControl" = k."NumeroControl" AND k."CalificacionFinal" >= 70
GROUP BY a."NumeroControl", a."Nombre", a."Apellidos";

-- Vista adicional: Alumnos con pagos pendientes
CREATE OR REPLACE VIEW "vista_pagos_pendientes" AS
SELECT 
    p."Referencia",
    a."NumeroControl",
    CONCAT(a."Nombre", ' ', a."Apellidos") AS "NombreEstudiante",
    p."Concepto",
    p."Monto",
    p."FechaLimite",
    p."EstatusPago"
FROM "Alumnos" a
JOIN "Pagos" p ON a."NumeroControl" = p."NumeroControl"
WHERE p."EstatusPago" = 'Pendiente';

-- ----------------------------------------------------------------------------
-- 6. POLÍTICAS ROW LEVEL SECURITY (RLS) PARA ACCESO PÚBLICO (ANON)
-- Ejecuta esto en el Editor SQL de Supabase para que la app web pueda leer,
-- insertar, actualizar y eliminar registros con la Anon Key.
-- ----------------------------------------------------------------------------

-- Habilitar RLS y otorgar acceso completo a anon
ALTER TABLE "PlanesEstudio" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon_PlanesEstudio_Full" ON "PlanesEstudio";
CREATE POLICY "Anon_PlanesEstudio_Full" ON "PlanesEstudio" FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE "Materias" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon_Materias_Full" ON "Materias";
CREATE POLICY "Anon_Materias_Full" ON "Materias" FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE "Docentes" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon_Docentes_Full" ON "Docentes";
CREATE POLICY "Anon_Docentes_Full" ON "Docentes" FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE "Reticulas" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon_Reticulas_Full" ON "Reticulas";
CREATE POLICY "Anon_Reticulas_Full" ON "Reticulas" FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE "Alumnos" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon_Alumnos_Full" ON "Alumnos";
CREATE POLICY "Anon_Alumnos_Full" ON "Alumnos" FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE "Pagos" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon_Pagos_Full" ON "Pagos";
CREATE POLICY "Anon_Pagos_Full" ON "Pagos" FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE "Grupos" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon_Grupos_Full" ON "Grupos";
CREATE POLICY "Anon_Grupos_Full" ON "Grupos" FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE "CargaAcademica" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon_CargaAcademica_Full" ON "CargaAcademica";
CREATE POLICY "Anon_CargaAcademica_Full" ON "CargaAcademica" FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE "Kardex" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon_Kardex_Full" ON "Kardex";
CREATE POLICY "Anon_Kardex_Full" ON "Kardex" FOR ALL TO anon USING (true) WITH CHECK (true);

-- Otorgar permisos GRANT sobre las tablas al rol anon
GRANT ALL ON "PlanesEstudio" TO anon;
GRANT ALL ON "Materias" TO anon;
GRANT ALL ON "Docentes" TO anon;
GRANT ALL ON "Reticulas" TO anon;
GRANT ALL ON "Alumnos" TO anon;
GRANT ALL ON "Pagos" TO anon;
GRANT ALL ON "Grupos" TO anon;
GRANT ALL ON "CargaAcademica" TO anon;
GRANT ALL ON "Kardex" TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- ----------------------------------------------------------------------------
-- 7. DATOS DE EJEMPLO / DEMOSTRACIÓN (OPCIONAL)
-- ----------------------------------------------------------------------------

INSERT INTO "PlanesEstudio" ("PlanID", "Carrera", "ClaveReticula", "Especialidad")
VALUES (1, 'Ingeniería en Sistemas Computacionales', 'ISIC-2010-224', 'Desarrollo de Software y Cloud Computing')
ON CONFLICT ("PlanID") DO NOTHING;

INSERT INTO "Materias" ("ClaveMateria", "NombreMateria", "Creditos", "SemestreSugerido")
VALUES 
    ('TI-001', 'Taller de Investigación I', 4, 5),
    ('TI-002', 'Taller de Investigación II', 4, 6),
    ('BD-001', 'Fundamentos de Bases de Datos', 5, 4),
    ('POO-01', 'Programación Orientada a Objetos', 5, 2)
ON CONFLICT ("ClaveMateria") DO NOTHING;

INSERT INTO "Docentes" ("NumeroEmpleado", "NombreCompleto", "Departamento")
VALUES 
    ('DOC-101', 'María Hernández', 'Sistemas y Computación'),
    ('DOC-102', 'Carlos Rodríguez Morales', 'Ciencias Básicas')
ON CONFLICT ("NumeroEmpleado") DO NOTHING;

INSERT INTO "Reticulas" ("PlanID", "ClaveMateria")
VALUES 
    (1, 'TI-001'),
    (1, 'TI-002'),
    (1, 'BD-001'),
    (1, 'POO-01')
ON CONFLICT DO NOTHING;

INSERT INTO "Alumnos" ("NumeroControl", "Nombre", "Apellidos", "SemestreActual", "PlanID", "Estatus")
VALUES 
    ('22130001', 'Isaac', 'Romero Favela', 6, 1, 'Activo')
ON CONFLICT ("NumeroControl") DO NOTHING;

INSERT INTO "Grupos" ("GrupoID", "ClaveMateria", "NumeroEmpleado", "Periodo", "Aula", "Capacidad")
VALUES 
    (1, 'TI-002', 'DOC-101', 'Ago-Dic 2026', 'Sistemas-1', 30)
ON CONFLICT ("GrupoID") DO NOTHING;

INSERT INTO "CargaAcademica" ("CargaID", "NumeroControl", "GrupoID", "Unidad1", "Unidad2", "Unidad3")
VALUES 
    (1, '22130001', 1, 95.00, 92.50, 100.00)
ON CONFLICT ("CargaID") DO NOTHING;

INSERT INTO "Kardex" ("RegistroID", "NumeroControl", "ClaveMateria", "CalificacionFinal", "TipoEvaluacion", "PeriodoAprobacion")
VALUES 
    (1, '22130001', 'TI-001', 98.00, 'Ordinario', 'Ene-Jun 2026'),
    (2, '22130001', 'BD-001', 95.00, 'Ordinario', 'Ago-Dic 2024')
ON CONFLICT ("RegistroID") DO NOTHING;

INSERT INTO "Pagos" ("Referencia", "NumeroControl", "Concepto", "Monto", "FechaEmision", "FechaLimite", "EstatusPago")
VALUES 
    ('9876543210', '22130001', 'Reinscripción Semestre 7', 3500.00, '2026-08-01', '2026-08-15', 'Pagado'),
    ('9876543211', '22130001', 'Seguro Estudiantil 2026', 450.00, '2026-08-01', '2026-11-30', 'Pendiente')
ON CONFLICT ("Referencia") DO NOTHING;
