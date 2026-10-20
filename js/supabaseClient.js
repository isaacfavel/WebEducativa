/**
 * Cliente HTTP para interactuar con la API REST de Supabase v1
 */

class SupabaseClient {
    constructor() {
        this.config = window.APP_CONFIG || {};
        this.baseUrl = (this.config.SUPABASE_REST_URL || 'https://lcofanzyuethtlwlbsie.supabase.co/rest/v1/').replace(/\/+$/, '') + '/';
        this.apiKey = this.config.SUPABASE_ANON_KEY || '';
        this.isConnected = false;
        this.foreignCache = {};
    }

    /**
     * Headers estándar requeridos por la API REST de PostgREST / Supabase
     */
    getHeaders(extraHeaders = {}) {
        return {
            'apikey': this.apiKey,
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
            ...extraHeaders
        };
    }

    /**
     * Prueba rápida de conexión con Supabase
     */
    async testConnection() {
        try {
            // Probamos una vista pública o tabla para determinar conectividad
            const url = `${this.baseUrl}vista_carga_alumnos?select=*&limit=1`;
            const resp = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders()
            });

            this.isConnected = resp.ok || resp.status === 401 || resp.status === 200;
            return {
                ok: resp.ok,
                status: resp.status,
                statusText: resp.statusText
            };
        } catch (err) {
            console.error('Error de red al conectar con Supabase:', err);
            this.isConnected = false;
            return {
                ok: false,
                status: 0,
                error: err.message
            };
        }
    }

    /**
     * Obtiene registros de una tabla o vista
     */
    async get(tableOrView, params = {}) {
        let queryString = '?select=*';

        if (params.order) {
            queryString += `&order=${encodeURIComponent(params.order)}`;
        }
        if (params.filter) {
            queryString += `&${params.filter}`;
        }
        if (params.limit) {
            queryString += `&limit=${params.limit}`;
        }

        const url = `${this.baseUrl}${encodeURIComponent(tableOrView)}${queryString}`;

        try {
            const resp = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!resp.ok) {
                const errorData = await resp.json().catch(() => ({ message: resp.statusText }));
                const error = new Error(errorData.message || `Error HTTP ${resp.status}`);
                error.code = errorData.code;
                error.status = resp.status;
                error.details = errorData.details;
                throw error;
            }

            return await resp.json();
        } catch (err) {
            console.error(`Error al consultar ${tableOrView}:`, err);
            throw err;
        }
    }

    /**
     * Inserta un nuevo registro en una tabla
     */
    async insert(table, data) {
        const url = `${this.baseUrl}${encodeURIComponent(table)}`;

        try {
            const resp = await fetch(url, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });

            if (!resp.ok) {
                const errorData = await resp.json().catch(() => ({ message: resp.statusText }));
                const error = new Error(errorData.message || `Error HTTP ${resp.status}`);
                error.code = errorData.code;
                error.status = resp.status;
                error.details = errorData.details;
                throw error;
            }

            const result = await resp.json();
            this.clearCache(table);
            return result;
        } catch (err) {
            console.error(`Error al insertar en ${table}:`, err);
            throw err;
        }
    }

    /**
     * Actualiza un registro existente
     */
    async update(table, pkName, pkValue, data) {
        let filter;
        if (Array.isArray(pkName) && typeof pkValue === 'object') {
            filter = pkName.map(k => `${encodeURIComponent(k)}=eq.${encodeURIComponent(pkValue[k])}`).join('&');
        } else {
            filter = `${encodeURIComponent(pkName)}=eq.${encodeURIComponent(pkValue)}`;
        }

        const url = `${this.baseUrl}${encodeURIComponent(table)}?${filter}`;

        try {
            const resp = await fetch(url, {
                method: 'PATCH',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });

            if (!resp.ok) {
                const errorData = await resp.json().catch(() => ({ message: resp.statusText }));
                const error = new Error(errorData.message || `Error HTTP ${resp.status}`);
                error.code = errorData.code;
                error.status = resp.status;
                error.details = errorData.details;
                throw error;
            }

            const result = await resp.json();
            this.clearCache(table);
            return result;
        } catch (err) {
            console.error(`Error al actualizar en ${table}:`, err);
            throw err;
        }
    }

    /**
     * Elimina un registro existente
     */
    async delete(table, pkName, pkValue) {
        let filter;
        if (Array.isArray(pkName) && typeof pkValue === 'object') {
            filter = pkName.map(k => `${encodeURIComponent(k)}=eq.${encodeURIComponent(pkValue[k])}`).join('&');
        } else {
            filter = `${encodeURIComponent(pkName)}=eq.${encodeURIComponent(pkValue)}`;
        }

        const url = `${this.baseUrl}${encodeURIComponent(table)}?${filter}`;

        try {
            const resp = await fetch(url, {
                method: 'DELETE',
                headers: this.getHeaders()
            });

            if (!resp.ok) {
                const errorData = await resp.json().catch(() => ({ message: resp.statusText }));
                const error = new Error(errorData.message || `Error HTTP ${resp.status}`);
                error.code = errorData.code;
                error.status = resp.status;
                error.details = errorData.details;
                throw error;
            }

            this.clearCache(table);
            return true;
        } catch (err) {
            console.error(`Error al eliminar de ${table}:`, err);
            throw err;
        }
    }

    /**
     * Carga catálogo para llenar selects de llaves foráneas
     */
    async getCatalog(tableName) {
        if (this.foreignCache[tableName]) {
            return this.foreignCache[tableName];
        }

        try {
            const data = await this.get(tableName);
            this.foreignCache[tableName] = data;
            return data;
        } catch (err) {
            console.warn(`No se pudo cargar catálogo foráneo para ${tableName}:`, err.message);
            return [];
        }
    }

    clearCache(table) {
        if (table) {
            delete this.foreignCache[table];
        } else {
            this.foreignCache = {};
        }
    }
}

window.supabaseApi = new SupabaseClient();
