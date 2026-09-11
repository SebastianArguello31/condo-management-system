# Guía Esencial de Git & GitHub — Cheatsheet Rápida

Guía práctica y simplificada con los comandos esenciales y buenas prácticas fundamentales para trabajar con Git y GitHub en el día a día.

---

## Tabla de Contenidos
1. [Configuración Inicial](#1-configuración-inicial)
2. [Flujo de Trabajo Diario](#2-flujo-de-trabajo-diario)
3. [Manejo Básico de Ramas (Branching)](#3-manejo-básico-de-ramas-branching)
4. [Convenio de Commits (Mensajes Claros)](#4-convenio-de-commits-mensajes-claros)
5. [Nombres de Ramas y Buenas Prácticas](#5-nombres-de-ramas-y-buenas-prácticas)
6. [Resolución de Conflictos en 4 Pasos](#6-resolución-de-conflictos-en-4-pasos)
7. [Deshacer Cambios Simples](#7-deshacer-cambios-simples)
8. [Uso del .gitignore y Carpetas Vacías](#8-uso-del-gitignore-y-carpetas-vacías)

---

## 1. Configuración Inicial

Solo es necesario realizarlo una vez al instalar Git en tu computadora.

```bash
# Definir tu nombre y correo asociado a GitHub
git config --global user.name "Tu Nombre"
git config --global user.email "tu_email@ejemplo.com"
```

---

## 2. Flujo de Trabajo Diario

Ciclo habitual para clonar, actualizar, guardar y subir tus avances.

```
[git pull] ➔ [Escribir código] ➔ [git add .] ➔ [git commit] ➔ [git push]
```

| Acción | Comando | Descripción |
| :--- | :--- | :--- |
| **Clonar proyecto** | `git clone <URL>` | Descarga un repositorio de GitHub a tu equipo. |
| **Ver estado** | `git status` | Muestra qué archivos modificaste o añadiste. |
| **Preparar cambios** | `git add .` o `git add <archivo>` | Prepara todos los cambios para guardarlos. |
| **Guardar cambios** | `git commit -m "msj"` | Guarda una versión en el historial con un mensaje. |
| **Descargar cambios** | `git pull origin main` | Trae y fusiona las novedades del servidor remoto. |
| **Subir cambios** | `git push origin <rama>` | Sube tus commits locales a GitHub. |

---

## 3. Manejo Básico de Ramas (Branching)

Las ramas te permiten trabajar en nuevas tareas sin modificar el código principal.

```bash
# Listar tus ramas locales
git branch

# Crear y cambiar a una nueva rama
git switch -c feature/login

# Cambiar a una rama existente
git switch main

# Fusionar cambios de otra rama en la rama actual
git merge feature/login

# Eliminar una rama local que ya fue integrada
git branch -d feature/login
```

---

## 4. Convenio de Commits (Mensajes Claros)

Escribir mensajes estandarizados facilita entender qué cambió en el proyecto.  
**Formato:** `<tipo>: <descripción breve>`

| Tipo | Cuándo usarlo | Ejemplo de comando |
| :--- | :--- | :--- |
| **`feat:`** | Nueva funcionalidad | `git commit -m "feat: agregar formulario de registro"` |
| **`fix:`** | Corrección de un error | `git commit -m "fix: corregir validacion de contraseña"` |
| **`docs:`** | Documentación o archivos .md/.pdf | `git commit -m "docs: actualizar readme del proyecto"` |
| **`style:`** | Cambios de diseño, CSS o formato | `git commit -m "style: cambiar color de botones"` |
| **`chore:`** | Tareas de mantenimiento o librerías | `git commit -m "chore: actualizar dependencias"` |

---

## 5. Nombres de Ramas y Buenas Prácticas

Usa prefijos al nombrar tus ramas para mantener el repositorio ordenado:

* **`feature/<nombre>`**: Para crear nuevas características o pantallas (`feature/pantalla-perfil`).
* **`bugfix/<nombre>`**: Para corregir errores durante el desarrollo (`bugfix/error-login`).
* **`hotfix/<nombre>`**: Para soluciones urgentes en producción (`hotfix/caida-servidor`).

### Reglas esenciales para trabajar en equipo:
1. **Commits pequeños:** Guarda progresos pequeños que funcionen en lugar de un commit enorme al final del día.
2. **Sincronización:** Ejecuta `git pull` antes de comenzar a trabajar para tener siempre la última versión.
3. **No subas archivos sensibles:** NUNCA subas claves, contraseñas o archivos `.env`.

---

## 6. Resolución de Conflictos en 4 Pasos

Ocurre cuando dos personas modifican la misma línea en el mismo archivo.

1. **Abre el archivo en conflicto:** Verás marcas insertadas por Git como estas:
   ```text
   <<<<<<< HEAD
   Tu código local
   =======
   Código traído del servidor
   >>>>>>> main
   ```
2. **Edita el archivo:** Deja únicamente la versión correcta del código.
3. **Elimina las marcas:** Borra las líneas que contienen `<<<<<<<`, `=======` y `>>>>>>>`.
4. **Guarda y confirma:**
   ```bash
   git add archivo_resuelto.js
   git commit -m "fix: resolver conflicto de integracion"
   ```

---

## 7. Deshacer Cambios Simples

Comandos rápidos para cuando te equivocas antes de hacer commit:

```bash
# Descartar las modificaciones de un archivo local (volver al último commit)
git restore nombre_archivo.js

# Quitar un archivo del área de preparación (unstage)
git restore --staged nombre_archivo.js

# Ver el historial de commits simplificado
git log --oneline
```

---

## 8. Uso del .gitignore y Carpetas Vacías

### ¿Para qué sirve `.gitignore`?
Es un archivo de texto donde indicas qué archivos **NO** se deben subir a GitHub (ej. dependencias `node_modules/`, variables de entorno `.env`, archivos temporales).

### ¿Cómo subir una carpeta vacía?
Git no detecta carpetas sin archivos. Si necesitas que una carpeta vacía exista en GitHub:
1. Entra a la carpeta vacía.
2. Crea un archivo vacío llamado `.gitkeep`.
3. Sube ese archivo:
   ```bash
   git add mi_carpeta/.gitkeep
   git commit -m "chore: agregar estructura de carpeta"
   git push
   ```