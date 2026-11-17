# Definición de Indicadores y Reglas de Cálculo — Módulo de Analytics (DEV 3)

Este documento describe la especificación formal, reglas de negocio, fórmulas matemáticas, consultas a la base de datos y contratos de integración para los indicadores del sistema de gestión de condominios.

---

## 1. Alcance y Período de Análisis

Los indicadores se calculan de manera dinámica sobre un período delimitado por dos fechas:
- **`desde`**: fecha `AAAA-MM-DD`, inclusiva desde las 00:00. La pantalla comienza con la fecha de hace 30 días; la API no agrega un inicio si se omite.
- **`hasta`**: fecha `AAAA-MM-DD`, inclusiva por día mediante un límite exclusivo al comienzo del día siguiente. La pantalla comienza con hoy; la API no agrega un final si se omite.
- **Validación**: La fecha `desde` no puede ser posterior a `hasta`.
- **Filtros opcionales transversales**:
  - `id_edificio`: Permite acotar las incidencias e intervenciones a un edificio específico.
  - `id_tipo_incidencia`: Permite acotar por categoría o tipo de incidencia.
  - `id_prioridad`: Permite filtrar por nivel de prioridad (`Urgente`, `Alta`, `Normal`, `Baja`).
  - `id_tecnico`: Permite filtrar por técnico asignado o responsable de intervenciones.

---

## 2. Indicadores Principales (KPIs Ejecutivos)

El panel principal organiza los 6 indicadores clave en una disposición simétrica de dos filas por tres columnas (3 arriba y 3 abajo):

| Indicador | Definición | Regla / Fórmula de Cálculo | Unidad / Formato |
| :--- | :--- | :--- | :--- |
| **Total Incidencias** | Cantidad total de incidencias reportadas en el período seleccionado. | `COUNT(i.id_incidencia)` donde `fecha_reporte BETWEEN desde AND hasta`. | Número entero (`reportes`) |
| **Tasa de Resolución** | Porcentaje de incidencias resueltas sobre el total reportado en el período. | `(incidencias_resueltas / total_incidencias) * 100` *(0% si Total = 0)*. Muestra además el conteo de resueltas. | Porcentaje (`%`) |
| **Cumplimiento SLA** | Porcentaje de incidencias resueltas dentro del plazo límite establecido por su prioridad. | `(COUNT(WHERE fecha_resolucion <= fecha_limite) / COUNT(WHERE fecha_limite IS NOT NULL)) * 100`. *(N/A si no hay resueltas con plazo)*. | Porcentaje (`%` o `N/A`) |
| **Tiempo Medio de Resolución** | Promedio de horas transcurridas desde el reporte hasta la resolución efectiva de las incidencias con fecha de resolución válida. | `ROUND(AVG(EXTRACT(EPOCH FROM (fecha_resolucion - fecha_reporte)) / 3600.0), 1)` para registros con `fecha_resolucion >= fecha_reporte`. *(null/"—" si no hay resueltas)*. Muestra días equivalentes. | Horas promedio (`h`) |
| **Intervenciones** | Total de intervenciones registradas cuya `fecha_inicio` cae en el período. Permite consultar incidencias sin intervención. | `COUNT(v.id_intervencion)` en el período. Enlace a incidencias sin intervención. | Número entero (`ejecutadas`) |
| **Alerta Stock Bajo** | Cantidad de insumos activos cuyo inventario actual está en o por debajo del stock mínimo de seguridad. | `COUNT(*)` en `insumos` con `activo = TRUE AND stock <= stock_minimo`. Muestra costo neto consumido. | Número entero (`críticos`) |

> **Nota de Interfaz**: La denominación del indicador de tiempo es **"Tiempo Medio de Resolución"** (sin siglas técnicas en la interfaz de usuario).

---

## 3. Distribuciones, Agrupaciones y Desglose Operativo

### 3.1 Distribución por Estado de Incidencia
Refleja el ciclo de vida operativo completo de las incidencias. El panel mantiene su espacio preparado para los **9 estados del sistema**, garantizando simetría visual incluso cuando su conteo sea 0:
- `RECIBIDA` (por defecto al crear reporte)
- `EN_REVISION`
- `ASIGNADA`
- `EN_PROCESO`
- `EN_ESPERA`
- `RESUELTA`
- `CERRADA`
- `RECHAZADA` (descartada)
- `CANCELADA` (descartada)

**Fórmula de porcentaje**: `(total_estado / total_incidencias) * 100` *(redondeado a 1 decimal)*.

### 3.2 Evolución Temporal: Reportadas vs Resueltas
Gráfico comparativo cronológico agrupado por día:
- **Reportadas por día**: `COUNT(*)` agrupado por `fecha_reporte::date`.
- **Resueltas por día**: `COUNT(*)` agrupado por `fecha_resolucion::date`.
- **Escala dinámica**: Las barras se extienden en porcentaje sobre la altura total del contenedor para sincronizarse en longitud con el panel de estados.

### 3.3 Carga por Prioridad y Metas SLA
Contrasta los tiempos reales de resolución frente a los objetivos configurados para cada una de las 4 prioridades del sistema:
- `Urgente`
- `Alta`
- `Normal`
- `Baja`
- **Campos**:
  - `objetivo_horas`: Límite configurado en tabla `prioridades.tiempo_resolucion_horas`.
  - `horas_promedio`: Promedio real de horas de resolución en el período.
  - `total_resueltas`: Volumen de incidencias resueltas en cada nivel.
  - **Estado SLA**: Verde si `horas_promedio <= objetivo_horas`, rojo si excede la meta.

### 3.4 Intervenciones por Personal Técnico
Distribución de intervenciones técnicas asignadas a los especialistas:
- Agrupación por autor de la intervención; el número de personas depende de los datos.
- **Campos**: Nombre, apellido, total de intervenciones y porcentaje de participación sobre el total ejecutado.

### 3.5 Módulo de Inventario de Insumos
- **Top Insumos Más Utilizados**: Ranking de los 5 insumos con mayor rotación neta (`movimientos_inventario` tipo `CONSUMO` deduciendo devoluciones), costo acumulado neto y total de intervenciones donde se aplicaron.
- **Insumos Bajo Stock Mínimo**: Catálogo de insumos en umbral crítico con:
  - `stock`: Stock numérico actual (formato estrictamente numérico, sin texto de unidad).
  - `stock_minimo`: Umbral mínimo de seguridad.
  - `faltante`: Unidades requeridas para reponer (`stock_minimo - stock`).
  - `costo_unitario`: Costo de adquisición por unidad.

---

## 4. Endpoints de la API (`/analytics`)

Todos los endpoints requieren JWT (`Bearer <token>`) y rol `ADMIN` o `GESTOR`. Las rutas de la tabla se agregan al prefijo `/condominio`; por ejemplo, `/condominio/analytics/dashboard`.

| Método y Ruta | Descripción | Parámetros Query |
| :--- | :--- | :--- |
| `GET /analytics/dashboard` | Resumen ejecutivo completo (KPIs, incidencias, intervenciones, inventario) calculado compartiendo una transacción entre las consultas. | `desde`, `hasta`, `id_edificio`, `id_tipo_incidencia`, `id_prioridad`, `id_tecnico` |
| `GET /analytics/incidencias` | Métricas específicas de incidencias: KPIs, por estado, prioridad, tipo, evolución temporal y tiempos SLA. | Mismos filtros transversales |
| `GET /analytics/intervenciones` | Métricas de intervenciones: totales, casos sin intervención y rendimiento por técnico. | Mismos filtros transversales |
| `GET /analytics/inventario` | Métricas de insumos: total consumido, top insumos más usados, insumos bajo stock y evolución económica. | Mismos filtros transversales |
| `GET /analytics/filtros` | Catálogo de opciones disponibles para selectores (`edificios`, `tipos_incidencia`, `prioridades`, `tecnicos`). | Ninguno (incluye técnicos para `ADMIN` y `GESTOR`) |
| `GET /analytics/registros` | Trazabilidad y detalle de registros (drilldown modal) con límite configurable de registros; no dispone de parámetros de página u offset. | `tipo_registro` (requerido), `estado` (opcional), `limit` (1 a 500, default 100), más filtros transversales |

---

## 5. Trazabilidad y Acceso a Registros (Drilldown)

El dashboard permite consultar registros mediante `tipo_registro`. La tabla muestra una selección de valores; el catálogo completo y exacto se define en [TIPOS_REGISTRO](../../backend/app/modules/analytics/schemas.py). Incluye también consultas de incidencias en curso y de casos sin intervención:

| Valor de `tipo_registro` | Contenido del Detalle | Columnas Principales |
| :--- | :--- | :--- |
| `incidencias` | Todas las incidencias filtradas en el período. | `#`, Título, Ubicación (Edificio - Unidad/Área), Categoría, Prioridad, Estado, Técnico, Fecha Reporte |
| `incidencias_resueltas` | Incidencias resueltas (`RESUELTA`, `CERRADA`) para auditoría de tiempos y SLA. | Mismas columnas de incidencias |
| `intervenciones_realizadas` | Detalle completo de intervenciones ejecutadas por los técnicos. | `#`, Fecha Inicio, Incidencia Asociada, Personal Técnico, Resultado / Acción ejecutada |
| `insumos_bajo_stock` | Catálogo de insumos en alerta crítica de stock. | Insumo, Categoría, Stock Actual, Stock Mínimo, Faltante, Costo Unitario |
| `insumos_mas_utilizados` | Ranking detallado de rotación de insumos. | Insumo, Categoría, Total Consumido, Costo Total, Intervenciones |

**Interacción con otros módulos**:
- Cada fila del modal incluye un botón de navegación (`Gestionar ↗` o `Ver Incidencia ↗`) que redirige directamente a la pantalla de incidencias (`incidents`) para ver o editar el registro.
- La cabecera superior y tarjetas permiten navegar a la pantalla de empleados y técnicos (`employees`).

---

## 6. Presentación y límites

El dashboard organiza KPIs, distribuciones y tablas con adaptación al tamaño de pantalla. Las alturas, el número de filas visibles y los nombres de técnicos no son parte del contrato de la API. El contenido depende de los datos y filtros.

Los KPIs de incidencias filtran por `fecha_reporte`; las intervenciones, por `fecha_inicio`. El stock bajo representa existencias actuales, no una reconstrucción histórica del período. Para SLA, el denominador incluye solo registros con fecha de resolución y fecha límite; sin ellos, el resultado es `null`.

## 7. Permisos

- **ADMIN y GESTOR:** acceso a todos los endpoints del módulo, filtros y registros asociados.
- **TECNICO y RESIDENTE:** sin acceso a las rutas HTTP de analytics; la autorización devuelve 403 para una sesión válida de esos roles.

Los servicios conservan una función de alcance por técnico, pero eso no habilita acceso a las rutas: prevalece la autorización declarada en [routes.py](../../backend/app/modules/analytics/routes.py).

## 8. Fuentes de implementación

- [Esquemas y filtros](../../backend/app/modules/analytics/schemas.py).
- [Repositorios SQL](../../backend/app/modules/analytics/repositories).
- [Servicios y cálculos](../../backend/app/modules/analytics/services).
- [Pantalla del dashboard](../../frontend/src/features/dashboard/DashboardPage.jsx).
