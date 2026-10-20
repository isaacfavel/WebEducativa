/**
 * Lógica principal del Sistema Educativo Institucional
 * Conexión completa con Supabase REST API y renderizado interactivo
 */

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

let currentSection = 'Inicio';
let currentData = [];
let filteredData = [];
let currentEditingId = null;

/**
 * Inicialización de la aplicación
 */
async function initApp() {
    updateConnectionIndicator('checking');
    try {
        const test = await window.supabaseApi.testConnection();
        if (test.ok || test.status === 200) {
            updateConnectionIndicator('online', 'Supabase Conectado');
        } else {
            updateConnectionIndicator('warning', 'Conexión activa (restringida)');
        }
    } catch (err) {
        updateConnectionIndicator('offline', 'Modo sin conexión');
    }

    // Inicializamos con la sección Inicio
    cargarSeccion('Inicio');
}

/**
 * Actualiza la barra / chip de estado de conexión en la cabecera
 */
function updateConnectionIndicator(status, text) {
    const el = document.getElementById('status-indicator');
    if (!el) return;

    if (status === 'online') {
        el.className = 'connection-badge online';
        el.innerHTML = '<span class="status-dot online"></span> Supabase Conectado';
    } else if (status === 'warning') {
        el.className = 'connection-badge warning';
        el.innerHTML = '<span class="status-dot warning"></span> Supabase (Verificar RLS)';
    } else if (status === 'offline') {
        el.className = 'connection-badge offline';
        el.innerHTML = '<span class="status-dot offline"></span> Error de conexión';
    } else {
        el.className = 'connection-badge checking';
        el.innerHTML = '<span class="status-dot checking"></span> Conectando...';
    }
}

/**
 * Navega a una sección o módulo del sistema
 */
async function cargarSeccion(sectionKey) {
    currentSection = sectionKey;
    const titulo = document.getElementById('titulo-seccion');
    const instruccion = document.getElementById('mensaje-instruccion');
    const btnNuevo = document.getElementById('btn-nuevo');
    const contenedor = document.getElementById('contenedor-tabla');

    // Deseleccionar items de navegación previos y marcar el activo
    document.querySelectorAll('.nav-btn, .dropdown-menu a').forEach(el => el.classList.remove('active-nav'));

    if (sectionKey === 'Inicio') {
        titulo.textContent = 'INICIO / PANEL PRINCIPAL';
        instruccion.classList.remove('hidden');
        instruccion.textContent = 'Bienvenido al sistema institucional. Selecciona una opción del menú o accede a los accesos directos del panel.';
        btnNuevo.classList.add('hidden');
        renderDashboard(contenedor);
        return;
    }

    const schema = window.DB_SCHEMA[sectionKey];
    if (!schema) {
        contenedor.innerHTML = `<div class="p-8 text-center text-red-600">Error: Esquema no definido para "${sectionKey}".</div>`;
        return;
    }

    titulo.textContent = (schema.isView ? 'CONSULTA: ' : 'GESTIÓN DE ') + schema.title.toUpperCase();
    instruccion.classList.remove('hidden');
    instruccion.textContent = schema.description || 'Consulta y administración de información.';

    // Botón Nuevo Registro solo para tablas base, no vistas
    if (!schema.isView) {
        btnNuevo.classList.remove('hidden');
        btnNuevo.onclick = () => abrirModalCrear(sectionKey);
    } else {
        btnNuevo.classList.add('hidden');
    }

    // Renderizar marco con barra de búsqueda, botones y spinner
    contenedor.innerHTML = `
        <div class="table-container-wrapper">
            <div class="table-toolbar">
                <div class="search-box">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4 text-gray-400">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    <input type="text" id="filtro-busqueda" placeholder="Buscar en ${schema.title}..." oninput="filtrarTabla(this.value)">
                </div>

                <div class="toolbar-actions">
                    <span id="contador-registros" class="counter-badge">Cargando...</span>
                    
                    <button type="button" class="btn-secondary-action" onclick="recargarSeccionActual()" title="Recargar datos">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
                            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path>
                            <path d="M21 3v5h-5"></path>
                        </svg>
                        <span>Recargar</span>
                    </button>

                    <button type="button" class="btn-secondary-action" onclick="exportarCSV('${sectionKey}')" title="Exportar a archivo CSV">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        <span>Exportar CSV</span>
                    </button>
                </div>
            </div>

            <!-- Alerta RLS si aplica -->
            <div id="alerta-rls" class="hidden"></div>

            <!-- Tabla de datos -->
            <div class="table-responsive" id="area-tabla">
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Consultando base de datos en Supabase...</p>
                </div>
            </div>
        </div>
    `;

    // Cargar datos reales
    await cargarDatosSeccion(sectionKey);
}

/**
 * Recarga la sección que se está visualizando
 */
function recargarSeccionActual() {
    cargarSeccion(currentSection);
}

/**
 * Carga los registros de Supabase según el esquema
 */
async function cargarDatosSeccion(sectionKey) {
    const schema = window.DB_SCHEMA[sectionKey];
    const areaTabla = document.getElementById('area-tabla');
    const contador = document.getElementById('contador-registros');
    const alertaRls = document.getElementById('alerta-rls');

    try {
        let datos = [];

        if (schema.isComputedReport === 'promedios') {
            datos = await calcularReportePromedios();
        } else if (schema.isComputedReport === 'pagos_pendientes') {
            datos = await calcularReportePagosPendientes();
        } else {
            const endpoint = schema.endpoint || sectionKey;
            datos = await window.supabaseApi.get(endpoint);
        }

        currentData = Array.isArray(datos) ? datos : [];
        filteredData = [...currentData];

        if (contador) {
            contador.textContent = `${filteredData.length} registros`;
        }

        // Si la tabla base está vacía pero es una tabla sensible a RLS, mostramos banner de ayuda
        if (!schema.isView && currentData.length === 0) {
            mostrarAvisoRLS(alertaRls, schema.title);
        } else if (alertaRls) {
            alertaRls.classList.add('hidden');
        }

        renderTabla(sectionKey, filteredData);

    } catch (err) {
        console.error(`Error al cargar ${sectionKey}:`, err);
        if (contador) contador.textContent = 'Error';

        // Detectar si fue bloqueo por RLS
        if (err.code === '42501' || err.status === 401 || err.message?.includes('security policy')) {
            mostrarAvisoRLS(alertaRls, schema.title, true);
        }

        areaTabla.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <h4>No se pudieron obtener los datos</h4>
                <p class="error-msg">${err.message || 'Error de comunicación con Supabase'}</p>
                <button type="button" class="btn-primary mt-4" onclick="recargarSeccionActual()">
                    Intentar de nuevo
                </button>
            </div>
        `;
    }
}

/**
 * Alerta sobre configuración de RLS en Supabase
 */
function mostrarAvisoRLS(container, nombreModulo, esErrorCritico = false) {
    if (!container) return;
    container.className = 'rls-notice ' + (esErrorCritico ? 'border-amber-400 bg-amber-50' : 'border-blue-300 bg-blue-50');
    container.classList.remove('hidden');
    container.innerHTML = `
        <div class="flex items-start gap-3 p-4">
            <span class="text-xl">ℹ️</span>
            <div class="flex-1 text-sm text-gray-700">
                <strong class="font-semibold text-gray-900">Nota de Políticas RLS de Supabase:</strong>
                <p class="mt-1">
                    En Supabase, las tablas nuevas requieren una política de lectura/escritura (RLS) para que la <strong>Anon Key</strong> pueda consultar e insertar registros.
                </p>
                <div class="mt-2 flex flex-wrap gap-2">
                    <button type="button" onclick="abrirModalRLS()" class="px-3 py-1.5 text-xs font-medium rounded-md text-white bg-[#16324F] hover:bg-[#245B78] transition">
                        Ver script SQL para habilitar RLS en Supabase
                    </button>
                    <a href="https://supabase.com/dashboard/project/lcofanzyuethtlwlbsie/editor" target="_blank" rel="noopener" class="px-3 py-1.5 text-xs font-medium rounded-md text-[#16324F] bg-white border border-gray-300 hover:bg-gray-100 transition">
                        Abrir SQL Editor de Supabase ↗
                    </a>
                </div>
            </div>
        </div>
    `;
}

/**
 * Renderiza la tabla HTML según los datos recibidos
 */
function renderTabla(sectionKey, data) {
    const areaTabla = document.getElementById('area-tabla');
    const schema = window.DB_SCHEMA[sectionKey];

    if (!data || data.length === 0) {
        areaTabla.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📂</div>
                <h3>Sin registros encontrados</h3>
                <p>No se encontraron datos disponibles para este módulo.</p>
                ${!schema.isView ? `
                    <button type="button" class="btn-primary mt-3" onclick="abrirModalCrear('${sectionKey}')">
                        + Registrar el primer elemento
                    </button>
                ` : ''}
            </div>
        `;
        return;
    }

    const fields = schema.fields;

    let headersHtml = fields.map(f => `<th>${f.label}</th>`).join('');
    if (!schema.isView) {
        headersHtml += `<th class="text-right">Acciones</th>`;
    }

    let rowsHtml = data.map((row, idx) => {
        let cellsHtml = fields.map(f => {
            const rawVal = row[f.name];
            return `<td>${formatearValor(rawVal, f.type, f.name, row)}</td>`;
        }).join('');

        let actionsHtml = '';
        if (!schema.isView) {
            actionsHtml = `
                <td class="text-right whitespace-nowrap">
                    <button type="button" class="btn-action edit" onclick="abrirModalEditarByIndex('${sectionKey}', ${idx})" title="Editar registro">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                        <span>Editar</span>
                    </button>
                    <button type="button" class="btn-action delete" onclick="confirmarEliminarByIndex('${sectionKey}', ${idx})" title="Eliminar registro">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        <span>Eliminar</span>
                    </button>
                </td>
            `;
        }

        return `<tr>${cellsHtml}${actionsHtml}</tr>`;
    }).join('');

    areaTabla.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>${headersHtml}</tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>
    `;
}

/**
 * Formatea un valor según su tipo de dato visual
 */
function formatearValor(val, type, fieldName, fullRow) {
    if (val === null || val === undefined || val === '') {
        return '<span class="text-gray-400 italic">N/A</span>';
    }

    if (type === 'currency' || fieldName === 'Monto') {
        const num = parseFloat(val);
        return isNaN(num) ? val : `<span class="font-medium text-emerald-800">$${num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;
    }

    if (type === 'grade' || fieldName?.includes('Unidad') || fieldName === 'CalificacionFinal' || fieldName === 'PromedioGeneral') {
        const calif = parseFloat(val);
        if (isNaN(calif)) return val;
        const colorClass = calif >= 70 ? 'grade-approved' : 'grade-failed';
        return `<span class="grade-badge ${colorClass}">${calif.toFixed(1)}</span>`;
    }

    if (type === 'badge' || fieldName === 'Estatus' || fieldName === 'EstatusPago' || fieldName === 'EstatusAcademico' || fieldName === 'Semaforo') {
        let badgeClass = 'badge-neutral';
        const str = String(val).toLowerCase();
        if (str.includes('activo') || str.includes('pagado') || str.includes('excelente') || str.includes('al corriente') || str.includes('aprobado')) {
            badgeClass = 'badge-success';
        } else if (str.includes('pendiente') || str.includes('temporal') || str.includes('regular') || str.includes('por vencer')) {
            badgeClass = 'badge-warning';
        } else if (str.includes('vencido') || str.includes('baja') || str.includes('reprobado') || str.includes('riesgo')) {
            badgeClass = 'badge-danger';
        }
        return `<span class="status-chip ${badgeClass}">${val}</span>`;
    }

    if (type === 'date' || fieldName?.includes('Fecha')) {
        return `<span class="text-gray-600 font-mono text-xs">${val}</span>`;
    }

    return String(val);
}

/**
 * Filtrado dinámico en vivo en la tabla actual
 */
function filtrarTabla(query) {
    if (!query) {
        filteredData = [...currentData];
    } else {
        const q = query.toLowerCase().trim();
        filteredData = currentData.filter(row => {
            return Object.values(row).some(v => v !== null && v !== undefined && String(v).toLowerCase().includes(q));
        });
    }

    const contador = document.getElementById('contador-registros');
    if (contador) {
        contador.textContent = `${filteredData.length} registros`;
    }

    renderTabla(currentSection, filteredData);
}

/**
 * Exporta los datos actuales a un archivo CSV descargable
 */
function exportarCSV(sectionKey) {
    const schema = window.DB_SCHEMA[sectionKey];
    if (!filteredData || filteredData.length === 0) {
        mostrarToast('No hay datos para exportar', 'warning');
        return;
    }

    const fields = schema.fields;
    const headers = fields.map(f => `"${f.label.replace(/"/g, '""')}"`).join(',');

    const rows = filteredData.map(row => {
        return fields.map(f => {
            const val = row[f.name];
            if (val === null || val === undefined) return '""';
            return `"${String(val).replace(/"/g, '""')}"`;
        }).join(',');
    });

    const csvContent = '\uFEFF' + [headers, ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${sectionKey}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    mostrarToast('Reporte CSV descargado correctamente', 'success');
}

/**
 * Modal de Creación
 */
async function abrirModalCrear(sectionKey) {
    currentEditingId = null;
    const schema = window.DB_SCHEMA[sectionKey];
    const modalTitle = document.getElementById('modal-titulo');
    const modalBody = document.getElementById('modal-cuerpo');

    modalTitle.textContent = `Registrar ${schema.singular || 'Nuevo Elemento'}`;
    modalBody.innerHTML = `<div class="p-6 text-center text-gray-500">Cargando formulario...</div>`;
    abrirModal();

    const formHtml = await generarCamposFormulario(schema, null);
    modalBody.innerHTML = formHtml;
}

/**
 * Acceso por índice para edición segura
 */
function abrirModalEditarByIndex(sectionKey, index) {
    const rowData = filteredData[index];
    if (rowData) {
        abrirModalEditar(sectionKey, rowData);
    }
}

function confirmarEliminarByIndex(sectionKey, index) {
    const rowData = filteredData[index];
    if (!rowData) return;
    const schema = window.DB_SCHEMA[sectionKey];
    const pkVal = Array.isArray(schema.pk) 
        ? schema.pk.reduce((acc, k) => ({ ...acc, [k]: rowData[k] }), {})
        : rowData[schema.pk];
    confirmarEliminar(sectionKey, pkVal);
}

/**
 * Modal de Edición
 */
async function abrirModalEditar(sectionKey, rowData) {
    const schema = window.DB_SCHEMA[sectionKey];
    currentEditingId = Array.isArray(schema.pk)
        ? schema.pk.reduce((acc, k) => ({ ...acc, [k]: rowData[k] }), {})
        : rowData[schema.pk];

    const modalTitle = document.getElementById('modal-titulo');
    const modalBody = document.getElementById('modal-cuerpo');

    modalTitle.textContent = `Editar ${schema.singular || 'Registro'}`;
    modalBody.innerHTML = `<div class="p-6 text-center text-gray-500">Cargando formulario...</div>`;
    abrirModal();

    const formHtml = await generarCamposFormulario(schema, rowData);
    modalBody.innerHTML = formHtml;
}

/**
 * Genera el HTML de los inputs del formulario
 */
async function generarCamposFormulario(schema, rowData) {
    const isEditing = !!rowData;
    let fieldsHtml = '';

    for (const field of schema.fields) {
        const val = rowData ? (rowData[field.name] ?? '') : (field.default ?? '');
        const isReadonly = isEditing && (field.readonlyOnEdit || field.pk || field.autoIncrement);

        if (!isEditing && field.autoIncrement) {
            continue; // Se genera automáticamente por Postgres SERIAL
        }

        let inputHtml = '';

        if (field.type === 'select') {
            let optionsHtml = '<option value="">-- Seleccionar --</option>';

            if (field.options) {
                optionsHtml += field.options.map(opt => {
                    const sel = String(opt) === String(val) ? 'selected' : '';
                    return `<option value="${opt}" ${sel}>${opt}</option>`;
                }).join('');
            } else if (field.foreign) {
                const catalog = await window.supabaseApi.getCatalog(field.foreign.table);
                optionsHtml += catalog.map(item => {
                    const optVal = item[field.foreign.valueKey];
                    const optLabel = item[field.foreign.labelKey] || optVal;
                    const secondary = field.foreign.secondaryKey && item[field.foreign.secondaryKey] ? ` (${item[field.foreign.secondaryKey]})` : '';
                    const sel = String(optVal) === String(val) ? 'selected' : '';
                    return `<option value="${optVal}" ${sel}>${optLabel}${secondary}</option>`;
                }).join('');
            }

            inputHtml = `
                <select name="${field.name}" id="field-${field.name}" class="form-input" ${field.required ? 'required' : ''} ${isReadonly ? 'disabled' : ''}>
                    ${optionsHtml}
                </select>
            `;
        } else {
            const inputType = field.type === 'number' || field.type === 'decimal' ? 'number' : (field.type === 'date' ? 'date' : 'text');
            const stepAttr = field.step ? `step="${field.step}"` : (field.type === 'decimal' ? 'step="0.01"' : '');
            const minAttr = field.min !== undefined ? `min="${field.min}"` : '';
            const maxAttr = field.max !== undefined ? `max="${field.max}"` : '';

            inputHtml = `
                <input type="${inputType}" name="${field.name}" id="field-${field.name}" 
                       value="${escapeAttr(val)}" class="form-input" 
                       placeholder="${field.placeholder || ''}"
                       ${stepAttr} ${minAttr} ${maxAttr}
                       ${field.required ? 'required' : ''} 
                       ${isReadonly ? 'readonly' : ''}>
            `;
        }

        fieldsHtml += `
            <div class="form-group">
                <label for="field-${field.name}" class="form-label">
                    ${field.label} ${field.required ? '<span class="text-rose-500">*</span>' : ''}
                </label>
                ${inputHtml}
                ${isReadonly ? '<span class="text-[11px] text-gray-400">Identificador no modificable</span>' : ''}
            </div>
        `;
    }

    return `
        <form id="form-registro" onsubmit="guardarRegistro(event)">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${fieldsHtml}
            </div>
            <div class="modal-footer mt-6">
                <button type="button" class="btn-cancelar" onclick="cerrarModal()">Cancelar</button>
                <button type="submit" class="btn-primary" id="btn-submit-form">
                    ${isEditing ? 'Actualizar Registro' : 'Guardar Registro'}
                </button>
            </div>
        </form>
    `;
}

/**
 * Guarda o actualiza un registro en Supabase
 */
async function guardarRegistro(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = document.getElementById('btn-submit-form');
    const schema = window.DB_SCHEMA[currentSection];

    const formData = new FormData(form);
    const payload = {};

    for (const [key, value] of formData.entries()) {
        const fieldConfig = schema.fields.find(f => f.name === key);
        if (value === '') {
            payload[key] = null;
        } else if (fieldConfig && (fieldConfig.type === 'number' || fieldConfig.type === 'decimal')) {
            payload[key] = fieldConfig.type === 'decimal' ? parseFloat(value) : parseInt(value, 10);
        } else {
            payload[key] = value;
        }
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';

    try {
        if (currentEditingId !== null) {
            // Edición
            await window.supabaseApi.update(currentSection, schema.pk, currentEditingId, payload);
            mostrarToast('Registro actualizado exitosamente', 'success');
        } else {
            // Inserción
            await window.supabaseApi.insert(currentSection, payload);
            mostrarToast('Nuevo registro guardado exitosamente', 'success');
        }

        cerrarModal();
        cargarSeccion(currentSection);

    } catch (err) {
        console.error('Error al guardar registro:', err);
        let msg = err.message || 'No se pudo guardar el registro.';
        if (err.code === '42501' || msg.includes('row-level security')) {
            msg = 'Bloqueado por política RLS en Supabase. Habilite los permisos con el script SQL.';
        } else if (err.code === '23505') {
            msg = 'Ya existe un registro con la misma clave o identificador (clave duplicada).';
        }
        mostrarToast(msg, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Guardar Registro';
    }
}

/**
 * Confirmación para eliminar un registro
 */
function confirmarEliminar(sectionKey, pkVal) {
    const schema = window.DB_SCHEMA[sectionKey];
    const parsedPk = typeof pkVal === 'string' && pkVal.startsWith('{') ? JSON.parse(pkVal) : pkVal;

    const modalTitle = document.getElementById('modal-titulo');
    const modalBody = document.getElementById('modal-cuerpo');

    modalTitle.textContent = `Eliminar ${schema.singular || 'Registro'}`;
    modalBody.innerHTML = `
        <div class="confirm-delete-box p-4">
            <div class="flex items-center gap-3 text-rose-700 font-semibold mb-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-6 h-6">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>¿Estás seguro de que deseas eliminar este registro?</span>
            </div>
            <p class="text-sm text-gray-600">
                Esta acción eliminará permanentemente el registro de <strong>${schema.title}</strong> en Supabase.
            </p>
            <div class="modal-footer mt-6">
                <button type="button" class="btn-cancelar" onclick="cerrarModal()">Cancelar</button>
                <button type="button" class="btn-danger-confirm" id="btn-confirm-delete">
                    Sí, eliminar definitivamente
                </button>
            </div>
        </div>
    `;

    abrirModal();

    document.getElementById('btn-confirm-delete').onclick = async () => {
        const btn = document.getElementById('btn-confirm-delete');
        btn.disabled = true;
        btn.textContent = 'Eliminando...';

        try {
            await window.supabaseApi.delete(sectionKey, schema.pk, parsedPk);
            mostrarToast('Registro eliminado con éxito', 'success');
            cerrarModal();
            cargarSeccion(sectionKey);
        } catch (err) {
            console.error('Error al eliminar:', err);
            let msg = err.message || 'No se pudo eliminar el registro.';
            if (err.code === '23503') {
                msg = 'No se puede eliminar porque otros registros dependen de él (integridad referencial).';
            } else if (err.code === '42501') {
                msg = 'Bloqueado por política RLS en Supabase.';
            }
            mostrarToast(msg, 'error');
            btn.disabled = false;
            btn.textContent = 'Sí, eliminar definitivamente';
        }
    };
}

/**
 * Modal de Políticas RLS para Supabase
 */
function abrirModalRLS() {
    const modalTitle = document.getElementById('modal-titulo');
    const modalBody = document.getElementById('modal-cuerpo');

    const sqlScript = `-- Ejecutar en el SQL Editor de tu proyecto en Supabase:
ALTER TABLE "PlanesEstudio" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon_PlanesEstudio_Full" ON "PlanesEstudio" FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE "Materias" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon_Materias_Full" ON "Materias" FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE "Docentes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon_Docentes_Full" ON "Docentes" FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE "Reticulas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon_Reticulas_Full" ON "Reticulas" FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE "Alumnos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon_Alumnos_Full" ON "Alumnos" FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE "Pagos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon_Pagos_Full" ON "Pagos" FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE "Grupos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon_Grupos_Full" ON "Grupos" FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE "CargaAcademica" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon_CargaAcademica_Full" ON "CargaAcademica" FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE "Kardex" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon_Kardex_Full" ON "Kardex" FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;`;

    modalTitle.textContent = 'Políticas RLS para Supabase';
    modalBody.innerHTML = `
        <div class="p-2">
            <p class="text-sm text-gray-700 mb-3">
                Copia este script SQL y pégalo en el <strong>SQL Editor</strong> de Supabase para otorgar acceso de lectura y escritura al rol público (Anon):
            </p>
            <textarea id="sql-rls-code" class="w-full h-64 font-mono text-xs p-3 bg-gray-900 text-emerald-400 rounded-lg border border-gray-700" readonly>${sqlScript}</textarea>
            <div class="modal-footer mt-4">
                <button type="button" class="btn-cancelar" onclick="cerrarModal()">Cerrar</button>
                <button type="button" class="btn-primary" onclick="copiarSQL()">
                    📋 Copiar Script SQL
                </button>
            </div>
        </div>
    `;
    abrirModal();
}

function copiarSQL() {
    const textarea = document.getElementById('sql-rls-code');
    if (!textarea) return;
    textarea.select();
    navigator.clipboard.writeText(textarea.value).then(() => {
        mostrarToast('¡Script SQL copiado al portapapeles!', 'success');
    }).catch(() => {
        mostrarToast('Selecciona y copia manualmente el texto.', 'info');
    });
}

/**
 * Reportes Calculados Especiales
 */
async function calcularReportePromedios() {
    try {
        const vistaKardex = await window.supabaseApi.get('vista_kardex_general');
        if (!vistaKardex || vistaKardex.length === 0) return [];

        const mapa = {};
        for (const k of vistaKardex) {
            const nc = k.NumeroControl;
            if (!mapa[nc]) {
                mapa[nc] = {
                    NumeroControl: nc,
                    NombreEstudiante: k.NombreEstudiante,
                    MateriasAprobadas: 0,
                    suma: 0,
                    total: 0
                };
            }
            const calif = parseFloat(k.CalificacionFinal) || 0;
            mapa[nc].total++;
            mapa[nc].suma += calif;
            if (calif >= 70) {
                mapa[nc].MateriasAprobadas++;
            }
        }

        return Object.values(mapa).map(item => {
            const prom = item.total > 0 ? (item.suma / item.total) : 0;
            let estatus = 'Regular';
            if (prom >= 95) estatus = 'Excelente (Cuadro de Honor)';
            else if (prom >= 85) estatus = 'Destacado';
            else if (prom < 70) estatus = 'En Riesgo Académico';

            return {
                NumeroControl: item.NumeroControl,
                NombreEstudiante: item.NombreEstudiante,
                MateriasAprobadas: item.MateriasAprobadas,
                PromedioGeneral: prom.toFixed(2),
                EstatusAcademico: estatus
            };
        });
    } catch (err) {
        console.error('Error calculando promedio de alumnos:', err);
        return [];
    }
}

async function calcularReportePagosPendientes() {
    try {
        const vistaFin = await window.supabaseApi.get('vista_estado_financiero');
        if (!vistaFin || vistaFin.length === 0) return [];

        const pendientes = vistaFin.filter(p => String(p.EstatusPago).toLowerCase() === 'pendiente');
        const hoy = new Date();

        return pendientes.map(p => {
            let semaforo = 'Al Corriente';
            if (p.FechaLimite) {
                const limite = new Date(p.FechaLimite);
                const diffTime = limite - hoy;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays < 0) {
                    semaforo = `Vencido (${Math.abs(diffDays)} días)`;
                } else if (diffDays <= 5) {
                    semaforo = `Por Vencer (${diffDays} días)`;
                } else {
                    semaforo = `Vigente (${diffDays} días)`;
                }
            }

            return {
                Referencia: p.Referencia,
                NumeroControl: p.NumeroControl,
                NombreEstudiante: p.NombreEstudiante,
                Concepto: p.Concepto,
                Monto: p.Monto,
                FechaLimite: p.FechaLimite,
                Semaforo: semaforo
            };
        });
    } catch (err) {
        console.error('Error calculando pagos pendientes:', err);
        return [];
    }
}

/**
 * Renderizado del Dashboard de Inicio
 */
async function renderDashboard(contenedor) {
    contenedor.innerHTML = `
        <div class="welcome-banner">
            <div class="welcome-content">
                <span class="welcome-label">TECNOLÓGICO NACIONAL DE MÉXICO</span>
                <h3>Portal de Gestión Académica</h3>
                <p>Plataforma institucional para el seguimiento de planes de estudio, docentes, retículas, calificaciones y administración escolar.</p>
                <div class="mt-4 flex flex-wrap gap-2">
                    <button type="button" class="btn-banner-action" onclick="cargarSeccion('vista_carga_alumnos')">
                        Ver Carga de Alumnos
                    </button>
                    <button type="button" class="btn-banner-action secondary" onclick="cargarSeccion('vista_kardex_general')">
                        Consultar Kardex
                    </button>
                    <button type="button" class="btn-banner-action secondary" onclick="cargarSeccion('reporte_pagos_pendientes')">
                        Cartera de Pagos
                    </button>
                </div>
            </div>
            <div class="welcome-illustration" aria-hidden="true">
                <svg viewBox="0 0 180 150" fill="none">
                    <rect x="36" y="23" width="108" height="104" rx="10" stroke="currentColor" stroke-width="3" opacity=".8"></rect>
                    <path d="M60 51h60M60 69h60M60 87h37" stroke="currentColor" stroke-width="4" stroke-linecap="round"></path>
                    <circle cx="130" cy="111" r="24" fill="#16A394"></circle>
                    <path d="m119 111 8 8 14-16" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
            </div>
        </div>

        <!-- Métricas Rápidas -->
        <div class="dashboard-stats-grid mt-6">
            <div class="stat-card" onclick="cargarSeccion('Alumnos')">
                <div class="stat-icon bg-blue-50 text-blue-700">👥</div>
                <div class="stat-info">
                    <span class="stat-label">Alumnado</span>
                    <h3 id="stat-alumnos" class="stat-number">--</h3>
                    <span class="stat-desc">Estudiantes matriculados</span>
                </div>
            </div>

            <div class="stat-card" onclick="cargarSeccion('Grupos')">
                <div class="stat-icon bg-emerald-50 text-emerald-700">📚</div>
                <div class="stat-info">
                    <span class="stat-label">Grupos</span>
                    <h3 id="stat-grupos" class="stat-number">--</h3>
                    <span class="stat-desc">Aulas y grupos activos</span>
                </div>
            </div>

            <div class="stat-card" onclick="cargarSeccion('Docentes')">
                <div class="stat-icon bg-purple-50 text-purple-700">👨‍🏫</div>
                <div class="stat-info">
                    <span class="stat-label">Docentes</span>
                    <h3 id="stat-docentes" class="stat-number">--</h3>
                    <span class="stat-desc">Plantilla académica</span>
                </div>
            </div>

            <div class="stat-card" onclick="cargarSeccion('reporte_pagos_pendientes')">
                <div class="stat-icon bg-amber-50 text-amber-700">💳</div>
                <div class="stat-info">
                    <span class="stat-label">Pagos Pendientes</span>
                    <h3 id="stat-pagos" class="stat-number">--</h3>
                    <span class="stat-desc">Cartera por cobrar</span>
                </div>
            </div>
        </div>

        <!-- Módulos de Acceso Rápido -->
        <div class="quick-access-section mt-8">
            <h4 class="text-lg font-bold text-[#16324F] mb-4 flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5 text-[#16A394]">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
                Vistas Institucionales y Reportes
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="quick-card" onclick="cargarSeccion('vista_carga_alumnos')">
                    <h5>📋 Vista Carga de Alumnos</h5>
                    <p>Horarios, materias inscritas, créditos, profesores y unidades 1, 2 y 3.</p>
                    <span class="quick-link">Abrir vista →</span>
                </div>

                <div class="quick-card" onclick="cargarSeccion('vista_kardex_general')">
                    <h5>🎓 Vista Kardex General</h5>
                    <p>Calificaciones finales acumuladas, acreditaciones por periodo y tipo de evaluación.</p>
                    <span class="quick-link">Abrir vista →</span>
                </div>

                <div class="quick-card" onclick="cargarSeccion('vista_estado_financiero')">
                    <h5>💰 Estado Financiero</h5>
                    <p>Referencias de pago, montos, vigencias y conciliación de cobranza institucional.</p>
                    <span class="quick-link">Abrir vista →</span>
                </div>

                <div class="quick-card" onclick="cargarSeccion('reporte_promedios')">
                    <h5>📊 Promedios y Aprobación</h5>
                    <p>Cálculo de promedio ponderado y conteo de materias aprobadas por estudiante.</p>
                    <span class="quick-link">Abrir reporte →</span>
                </div>

                <div class="quick-card" onclick="cargarSeccion('reporte_pagos_pendientes')">
                    <h5>⚠️ Pagos Pendientes</h5>
                    <p>Listado de estudiantes con pagos vencidos o pendientes con semáforo de tiempo.</p>
                    <span class="quick-link">Abrir reporte →</span>
                </div>

                <div class="quick-card" onclick="abrirModalRLS()">
                    <h5>🛠️ Configuración RLS Supabase</h5>
                    <p>Ver y copiar el script de políticas Row Level Security para la base de datos.</p>
                    <span class="quick-link">Ver script SQL →</span>
                </div>
            </div>
        </div>
    `;

    // Cargar métricas en segundo plano
    actualizarMetricasDashboard();
}

/**
 * Carga las métricas del dashboard
 */
async function actualizarMetricasDashboard() {
    try {
        const vCarga = await window.supabaseApi.get('vista_carga_alumnos').catch(() => []);
        const vKardex = await window.supabaseApi.get('vista_kardex_general').catch(() => []);
        const vFin = await window.supabaseApi.get('vista_estado_financiero').catch(() => []);

        const alumnosSet = new Set();
        const docentesSet = new Set();

        vCarga.forEach(c => {
            if (c.NumeroControl) alumnosSet.add(c.NumeroControl);
            if (c.DocenteAsignado) docentesSet.add(c.DocenteAsignado);
        });
        vKardex.forEach(k => {
            if (k.NumeroControl) alumnosSet.add(k.NumeroControl);
        });

        const pagosPendientes = vFin.filter(p => String(p.EstatusPago).toLowerCase() === 'pendiente').length;

        const statAl = document.getElementById('stat-alumnos');
        const statGr = document.getElementById('stat-grupos');
        const statDoc = document.getElementById('stat-docentes');
        const statPag = document.getElementById('stat-pagos');

        if (statAl) statAl.textContent = alumnosSet.size || '1+';
        if (statGr) statGr.textContent = vCarga.length || '1';
        if (statDoc) statDoc.textContent = docentesSet.size || '1+';
        if (statPag) statPag.textContent = pagosPendientes || '0';

    } catch (err) {
        console.warn('No se pudieron calcular métricas completas:', err);
    }
}

/**
 * Control del Modal
 */
function abrirModal() {
    const modal = document.getElementById('modal-formulario');
    if (modal) modal.classList.remove('hidden');
}

function cerrarModal() {
    const modal = document.getElementById('modal-formulario');
    if (modal) modal.classList.add('hidden');
}

/**
 * Notificaciones Toast
 */
function mostrarToast(mensaje, tipo = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    
    let icon = 'ℹ️';
    if (tipo === 'success') icon = '✅';
    if (tipo === 'error') icon = '❌';
    if (tipo === 'warning') icon = '⚠️';

    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${escapeHtml(mensaje)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

/**
 * Utilidades
 */
function escapeAttr(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/"/g, '&quot;');
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
