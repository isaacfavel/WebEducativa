# Sistema Institucional de Gestión Académica - TecNM

Plataforma web institucional desarrollada para el **Tecnológico Nacional de México** (materia: *Taller de Investigación II*), conectada en tiempo real a una base de datos relacional PostgreSQL alojada en **Supabase**.

---

## 🚀 Características Principales

- **Conexión nativa a Supabase REST API v1**: Operaciones de lectura y escritura (CRUD) en tiempo real con la Anon Key.
- **Módulos de Gestión Curricular y Escolar**:
  - **Planes de Estudio**: Carreras, claves reticulares y especialidades.
  - **Materias**: Asignaturas con créditos y semestre sugerido.
  - **Docentes**: Plantilla docente por departamento.
  - **Retículas**: Mapeo relacional de asignaturas por plan de estudio.
  - **Alumnos**: Número de control, estatus escolar y plan asignado.
  - **Grupos**: Apertura de clases, docentes asignados, periodos y aulas.
  - **Carga Académica**: Seguimiento de unidades (U1, U2, U3) y cálculo de promedios.
  - **Kardex**: Historial de calificaciones finales acumuladas y tipos de evaluación.
  - **Pagos y Finanzas**: Control de colegiaturas, referencias bancarias y fechas límite.
- **Vistas Oficiales y Reportes**:
  - `vista_carga_alumnos`: Consulta detallada de materias asignadas a estudiantes con docentes y calificaciones.
  - `vista_kardex_general`: Calificaciones finales por alumno y materia.
  - `vista_estado_financiero`: Reporte financiero de pagos y cobranza.
  - **Reporte de Promedio General y Aprobación**: Cálculo automático de materias aprobadas y promedio con cuadro de honor.
  - **Reporte de Cartera de Pagos Pendientes**: Semáforo visual con días restantes o vencimiento.
- **Herramientas de Productividad**:
  - Búsqueda y filtrado en vivo en cada tabla.
  - Formularios dinámicos con validación y selects vinculados a claves foráneas.
  - Exportación de cualquier consulta a formato **CSV** descargable.
  - Diseño 100% responsivo y adaptado a los lineamientos visuales oficiales SEP / TecNM.

---

## 📂 Estructura del Proyecto

```text
WebEducativa/
├── .env                     # Variables de entorno y llaves de Supabase
├── .env.example             # Plantilla de ejemplo para variables de entorno
├── .gitignore               # Exclusión de archivos sensibles
├── index.html               # Interfaz principal (SPA institucional)
├── styles.css               # Estilos institucionales TecNM y componentes UI
├── database_setup.sql       # Script SQL para tablas, vistas y políticas RLS
├── Dockerfile               # Configuración de contenedor NGINX Alpine
├── docker-compose.yml       # Orquestación con Docker Compose
├── nginx.conf               # Configuración optimizada de servidor NGINX
├── start-server.ps1         # Servidor web local sin dependencias (Windows/.NET)
├── start-server.bat         # Acceso directo para ejecutar el servidor local
├── run-docker.bat           # Script para compilar y ejecutar en Docker
└── js/
    ├── config.js            # Configuración de credenciales de Supabase
    ├── schema.js            # Definición de tablas, campos y relaciones
    ├── supabaseClient.js    # Cliente HTTP para Supabase REST API
    └── app.js               # Lógica interactiva, CRUD, modales y reportes
```

---

## 🔑 Configuración de Supabase (.env)

El archivo `.env` ya contiene las credenciales de tu proyecto Supabase:

```env
SUPABASE_URL=https://lcofanzyuethtlwlbsie.supabase.co
SUPABASE_REST_URL=https://lcofanzyuethtlwlbsie.supabase.co/rest/v1/
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### ⚠️ Importante: Políticas de Seguridad Row Level Security (RLS)

Por defecto, PostgreSQL en Supabase bloquea el acceso anónimo a tablas base recién creadas. Para que tu aplicación web pueda consultar e insertar registros libremente con la Anon Key:

1. Ingresa a tu panel en [Supabase SQL Editor](https://supabase.com/dashboard/project/lcofanzyuethtlwlbsie/editor).
2. Abre o copia el archivo `database_setup.sql` incluido en esta carpeta.
3. Ejecuta el script. Éste creará las vistas y habilitará las políticas `CREATE POLICY ... FOR ALL TO anon USING (true)` para todas las tablas.

*(Si no has ejecutado el script aún, la app web te mostrará un botón de ayuda con el script SQL listo para copiar al portapapeles).*

---

## 🐳 Cómo Ejecutar con Docker

### Opción 1: Con el script automático (Windows)
Haz doble clic en el archivo `run-docker.bat`. Este script:
1. Comprueba que Docker Desktop esté encendido.
2. Compila la imagen con `nginx:alpine`.
3. Lanza el contenedor mapeando el puerto `8080`.
4. Abre automáticamente tu navegador en `http://localhost:8080`.

### Opción 2: Con comandos de terminal
En una terminal en la carpeta `WebEducativa`:

```powershell
# Usando Docker Compose
docker compose up -d --build

# O usando Docker CLI directamente
docker build -t web_educativa_app .
docker run -d --name web_educativa_app -p 8080:80 web_educativa_app
```

Luego abre tu navegador en: **`http://localhost:8080`**

Para detener el contenedor:
```powershell
docker compose down
# o: docker stop web_educativa_app
```

---

## 💻 Cómo Ejecutar en Local sin Docker

Si aún no tienes Docker instalado en tu equipo, tienes dos alternativas inmediatas:

### Opción A: Servidor Local Windows (Recomendado)
Haz doble clic en el archivo `start-server.bat` o ejecuta en PowerShell:
```powershell
.\start-server.ps1
```
Levantará un servidor HTTP ligero en el puerto `8080` y abrirá tu navegador automáticamente.

### Opción B: Doble Clic Directo
Simplemente haz doble clic sobre el archivo `index.html` en el explorador de Windows. La aplicación funcionará directamente en tu navegador web.
