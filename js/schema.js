/**
 * Definición de esquemas de datos del sistema institucional
 * Incluye tablas, vistas, campos, validaciones y relaciones foráneas
 */

window.DB_SCHEMA = {
    // ------------------------------------------------------------------------
    // TABLAS PRINCIPALES
    // ------------------------------------------------------------------------
    PlanesEstudio: {
        title: "Planes de Estudio",
        singular: "Plan de Estudio",
        description: "Catálogo de carreras y planes curriculares ofertados.",
        pk: "PlanID",
        isView: false,
        fields: [
            { name: "PlanID", label: "ID Plan", type: "number", pk: true, autoIncrement: true, readonlyOnEdit: true },
            { name: "Carrera", label: "Carrera", type: "text", required: true, placeholder: "ej. Ing. en Sistemas Computacionales" },
            { name: "ClaveReticula", label: "Clave Retícula", type: "text", required: true, placeholder: "ej. ISIC-2010-224" },
            { name: "Especialidad", label: "Especialidad", type: "text", required: false, placeholder: "ej. Desarrollo de Software" }
        ]
    },

    Materias: {
        title: "Materias",
        singular: "Materia",
        description: "Asignaturas oficiales con créditos y semestre curricular.",
        pk: "ClaveMateria",
        isView: false,
        fields: [
            { name: "ClaveMateria", label: "Clave de Materia", type: "text", pk: true, required: true, readonlyOnEdit: true, placeholder: "ej. TI-002" },
            { name: "NombreMateria", label: "Nombre de la Materia", type: "text", required: true, placeholder: "ej. Taller de Investigación II" },
            { name: "Creditos", label: "Créditos", type: "number", required: true, min: 1, max: 20, placeholder: "4" },
            { name: "SemestreSugerido", label: "Semestre Sugerido", type: "number", min: 1, max: 12, placeholder: "6" }
        ]
    },

    Docentes: {
        title: "Docentes",
        singular: "Docente",
        description: "Plantilla de profesores e investigadores del instituto.",
        pk: "NumeroEmpleado",
        isView: false,
        fields: [
            { name: "NumeroEmpleado", label: "No. Empleado", type: "text", pk: true, required: true, readonlyOnEdit: true, placeholder: "ej. DOC-101" },
            { name: "NombreCompleto", label: "Nombre Completo", type: "text", required: true, placeholder: "ej. Dra. María Hernández" },
            { name: "Departamento", label: "Departamento", type: "text", required: false, placeholder: "ej. Sistemas y Computación" }
        ]
    },

    Reticulas: {
        title: "Retículas",
        singular: "Asignación Reticular",
        description: "Mapeo de asignaturas que componen cada plan de estudios.",
        pk: ["PlanID", "ClaveMateria"],
        isView: false,
        fields: [
            { 
                name: "PlanID", 
                label: "Plan de Estudio", 
                type: "select", 
                required: true, 
                foreign: { table: "PlanesEstudio", valueKey: "PlanID", labelKey: "Carrera", secondaryKey: "ClaveReticula" } 
            },
            { 
                name: "ClaveMateria", 
                label: "Materia", 
                type: "select", 
                required: true, 
                foreign: { table: "Materias", valueKey: "ClaveMateria", labelKey: "NombreMateria", secondaryKey: "ClaveMateria" } 
            }
        ]
    },

    Alumnos: {
        title: "Alumnos",
        singular: "Alumno",
        description: "Estudiantes registrados en la plataforma institucional.",
        pk: "NumeroControl",
        isView: false,
        fields: [
            { name: "NumeroControl", label: "No. de Control", type: "text", pk: true, required: true, readonlyOnEdit: true, placeholder: "ej. 22130001" },
            { name: "Nombre", label: "Nombre(s)", type: "text", required: true, placeholder: "ej. Isaac" },
            { name: "Apellidos", label: "Apellidos", type: "text", required: true, placeholder: "ej. Romero Favela" },
            { name: "SemestreActual", label: "Semestre Actual", type: "number", min: 1, max: 15, placeholder: "6" },
            { 
                name: "PlanID", 
                label: "Plan de Estudio", 
                type: "select", 
                required: false,
                foreign: { table: "PlanesEstudio", valueKey: "PlanID", labelKey: "Carrera" } 
            },
            { 
                name: "Estatus", 
                label: "Estatus", 
                type: "select", 
                required: true,
                default: "Activo",
                options: ["Activo", "Baja Temporal", "Baja Definitiva", "Egresado", "Titulado"]
            }
        ]
    },

    Pagos: {
        title: "Pagos y Finanzas",
        singular: "Pago",
        description: "Control de cuotas escolares, inscripciones y referencias bancarias.",
        pk: "Referencia",
        isView: false,
        fields: [
            { name: "Referencia", label: "Referencia Bancaria", type: "text", pk: true, required: true, readonlyOnEdit: true, placeholder: "ej. 9876543210" },
            { 
                name: "NumeroControl", 
                label: "Estudiante", 
                type: "select", 
                required: true,
                foreign: { table: "Alumnos", valueKey: "NumeroControl", labelKey: "Nombre", secondaryKey: "Apellidos" } 
            },
            { name: "Concepto", label: "Concepto de Pago", type: "text", required: true, placeholder: "ej. Reinscripción Semestre 7" },
            { name: "Monto", label: "Monto ($ MXN)", type: "decimal", required: true, step: "0.01", placeholder: "3500.00" },
            { name: "FechaEmision", label: "Fecha de Emisión", type: "date", required: true },
            { name: "FechaLimite", label: "Fecha Límite", type: "date", required: true },
            { 
                name: "EstatusPago", 
                label: "Estatus del Pago", 
                type: "select", 
                required: true,
                default: "Pendiente",
                options: ["Pendiente", "Pagado", "Vencido", "Cancelado"]
            }
        ]
    },

    Grupos: {
        title: "Grupos Ofertados",
        singular: "Grupo",
        description: "Apertura de materias, docentes asignados, periodos y aulas.",
        pk: "GrupoID",
        isView: false,
        fields: [
            { name: "GrupoID", label: "ID Grupo", type: "number", pk: true, autoIncrement: true, readonlyOnEdit: true },
            { 
                name: "ClaveMateria", 
                label: "Materia", 
                type: "select", 
                required: true,
                foreign: { table: "Materias", valueKey: "ClaveMateria", labelKey: "NombreMateria", secondaryKey: "ClaveMateria" } 
            },
            { 
                name: "NumeroEmpleado", 
                label: "Docente Titular", 
                type: "select", 
                required: true,
                foreign: { table: "Docentes", valueKey: "NumeroEmpleado", labelKey: "NombreCompleto" } 
            },
            { name: "Periodo", label: "Periodo Escolar", type: "text", required: true, placeholder: "ej. Ago-Dic 2026" },
            { name: "Aula", label: "Aula / Laboratorio", type: "text", required: true, placeholder: "ej. Sistemas-1" },
            { name: "Capacidad", label: "Capacidad Máx.", type: "number", min: 1, max: 80, placeholder: "30" }
        ]
    },

    CargaAcademica: {
        title: "Carga Académica",
        singular: "Carga de Materia",
        description: "Asignación de asignaturas a los alumnos y captura de calificaciones por unidad.",
        pk: "CargaID",
        isView: false,
        fields: [
            { name: "CargaID", label: "ID Carga", type: "number", pk: true, autoIncrement: true, readonlyOnEdit: true },
            { 
                name: "NumeroControl", 
                label: "Alumno", 
                type: "select", 
                required: true,
                foreign: { table: "Alumnos", valueKey: "NumeroControl", labelKey: "Nombre", secondaryKey: "Apellidos" } 
            },
            { 
                name: "GrupoID", 
                label: "Grupo / Clase", 
                type: "select", 
                required: true,
                foreign: { table: "Grupos", valueKey: "GrupoID", labelKey: "Periodo", secondaryKey: "Aula" } 
            },
            { name: "Unidad1", label: "Unidad 1", type: "decimal", min: 0, max: 100, step: "0.01", placeholder: "0 - 100" },
            { name: "Unidad2", label: "Unidad 2", type: "decimal", min: 0, max: 100, step: "0.01", placeholder: "0 - 100" },
            { name: "Unidad3", label: "Unidad 3", type: "decimal", min: 0, max: 100, step: "0.01", placeholder: "0 - 100" }
        ]
    },

    Kardex: {
        title: "Kardex de Calificaciones",
        singular: "Registro de Kardex",
        description: "Historial académico oficial y acreditación de asignaturas.",
        pk: "RegistroID",
        isView: false,
        fields: [
            { name: "RegistroID", label: "Registro ID", type: "number", pk: true, autoIncrement: true, readonlyOnEdit: true },
            { 
                name: "NumeroControl", 
                label: "Alumno", 
                type: "select", 
                required: true,
                foreign: { table: "Alumnos", valueKey: "NumeroControl", labelKey: "Nombre", secondaryKey: "Apellidos" } 
            },
            { 
                name: "ClaveMateria", 
                label: "Materia", 
                type: "select", 
                required: true,
                foreign: { table: "Materias", valueKey: "ClaveMateria", labelKey: "NombreMateria" } 
            },
            { name: "CalificacionFinal", label: "Calificación Final", type: "decimal", required: true, min: 0, max: 100, step: "0.01", placeholder: "0 - 100" },
            { 
                name: "TipoEvaluacion", 
                label: "Tipo de Evaluación", 
                type: "select", 
                required: true,
                default: "Ordinario",
                options: ["Ordinario", "Regularización", "Extraordinario", "Especial"] 
            },
            { name: "PeriodoAprobacion", label: "Periodo de Aprobación", type: "text", required: true, placeholder: "ej. Ene-Jun 2026" }
        ]
    },

    // ------------------------------------------------------------------------
    // VISTAS OFICIALES Y REPORTES DE BASE DE DATOS
    // ------------------------------------------------------------------------
    vista_carga_alumnos: {
        title: "Vista: Carga Académica Detallada",
        singular: "Registro de Carga",
        description: "Vista relacional que consolida alumno, materia, créditos, docente, aula y calificaciones por unidad.",
        isView: true,
        endpoint: "vista_carga_alumnos",
        fields: [
            { name: "NumeroControl", label: "No. Control" },
            { name: "NombreEstudiante", label: "Estudiante" },
            { name: "ClaveMateria", label: "Clave" },
            { name: "NombreMateria", label: "Materia" },
            { name: "Creditos", label: "Créditos" },
            { name: "Periodo", label: "Periodo" },
            { name: "Aula", label: "Aula" },
            { name: "DocenteAsignado", label: "Docente Titular" },
            { name: "Unidad1", label: "U1", type: "grade" },
            { name: "Unidad2", label: "U2", type: "grade" },
            { name: "Unidad3", label: "U3", type: "grade" }
        ]
    },

    vista_kardex_general: {
        title: "Vista: Kardex Oficial General",
        singular: "Calificación de Kardex",
        description: "Histórico general consolidado con nombre de estudiante, materia, calificación final y periodo.",
        isView: true,
        endpoint: "vista_kardex_general",
        fields: [
            { name: "NumeroControl", label: "No. Control" },
            { name: "NombreEstudiante", label: "Estudiante" },
            { name: "ClaveMateria", label: "Clave" },
            { name: "NombreMateria", label: "Asignatura" },
            { name: "CalificacionFinal", label: "Calificación Final", type: "grade" },
            { name: "TipoEvaluacion", label: "Tipo Evaluación" },
            { name: "PeriodoAprobacion", label: "Periodo" }
        ]
    },

    vista_estado_financiero: {
        title: "Vista: Estado Financiero",
        singular: "Movimiento Financiero",
        description: "Consolidación de cargos, fechas límite, estudiantes y estatus de cobranza.",
        isView: true,
        endpoint: "vista_estado_financiero",
        fields: [
            { name: "Referencia", label: "Referencia" },
            { name: "NumeroControl", label: "No. Control" },
            { name: "NombreEstudiante", label: "Estudiante" },
            { name: "Concepto", label: "Concepto" },
            { name: "Monto", label: "Monto", type: "currency" },
            { name: "FechaEmision", label: "F. Emisión", type: "date" },
            { name: "FechaLimite", label: "F. Límite", type: "date" },
            { name: "EstatusPago", label: "Estatus", type: "badge" }
        ]
    },

    reporte_promedios: {
        title: "Reporte: Promedio General y Aprobación",
        singular: "Métrica de Alumno",
        description: "Cálculo en tiempo real de promedio general de calificaciones y total de materias aprobadas.",
        isView: true,
        isComputedReport: "promedios",
        fields: [
            { name: "NumeroControl", label: "No. Control" },
            { name: "NombreEstudiante", label: "Estudiante" },
            { name: "MateriasAprobadas", label: "Materias Aprobadas" },
            { name: "PromedioGeneral", label: "Promedio General", type: "grade" },
            { name: "EstatusAcademico", label: "Estatus Académico", type: "badge" }
        ]
    },

    reporte_pagos_pendientes: {
        title: "Reporte: Cartera de Pagos Pendientes",
        singular: "Adeudo Pendiente",
        description: "Listado de alumnos con adeudos escolares pendientes y semáforo de vencimiento.",
        isView: true,
        isComputedReport: "pagos_pendientes",
        fields: [
            { name: "Referencia", label: "Referencia" },
            { name: "NumeroControl", label: "No. Control" },
            { name: "NombreEstudiante", label: "Estudiante" },
            { name: "Concepto", label: "Concepto" },
            { name: "Monto", label: "Monto Pendiente", type: "currency" },
            { name: "FechaLimite", label: "Fecha Límite", type: "date" },
            { name: "Semaforo", label: "Vigencia", type: "badge" }
        ]
    }
};
