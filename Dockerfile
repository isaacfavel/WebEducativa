# Usar imagen ligera oficial de NGINX basada en Alpine Linux
FROM nginx:alpine

# Metadata del autor y proyecto
LABEL maintainer="Centro Educativo - TecNM"
LABEL description="Portal de Gestión Académica - Taller de Investigación II"

# Eliminar archivos por defecto de nginx
RUN rm -rf /usr/share/nginx/html/*

# Copiar configuración personalizada de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los archivos estáticos de la aplicación web
COPY . /usr/share/nginx/html

# Exponer el puerto HTTP 80
EXPOSE 80

# Comando para ejecutar nginx en primer plano
CMD ["nginx", "-g", "daemon off;"]
