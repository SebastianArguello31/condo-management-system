# Documentación del proyecto

El [README principal](../README.md) presenta el sistema y los comandos de uso diario. Aquí se encuentra la documentación detallada.

## Organización

```text
docs/
  README.md
  TESTING.md
  guias/
    documento-funcional.md
    estructura-proyecto.md
    guia-ejecucion.md
    guia-basica-github.md
    indicadores-analytics.md
    convenciones-frontend.md
    kit-ui-referencia.md
    archivo/
      plan-refactor-frontend.md
```

## Guías principales

| Documento | Qué consultar |
|---|---|
| [Configuración y ejecución](guias/guia-ejecucion.md) | Requisitos, instalación, `.env` completo, servicios, migraciones y diagnóstico. |
| [Documento funcional](guias/documento-funcional.md) | Alcance, roles, permisos de incidencias y limitaciones de la interfaz. |
| [Arquitectura y estructura](guias/estructura-proyecto.md) | Componentes, capas, módulos y organización del código. |
| [Pruebas](TESTING.md) | Ejecución de las suites, cobertura y límites de la validación aislada. |

## Referencias técnicas

| Documento | Qué consultar |
|---|---|
| [Indicadores](guias/indicadores-analytics.md) | Filtros, cálculos y contratos del dashboard. |
| [Convenciones frontend](guias/convenciones-frontend.md) | Patrones para mantener y ampliar pantallas. |
| [Kit UI](guias/kit-ui-referencia.md) | Componentes, hooks y utilidades compartidas. |

## Material del equipo e historial

- [Guía de Git y GitHub](guias/guia-basica-github.md): apoyo para colaborar; su lectura no es necesaria para utilizar la aplicación.
- [Plan de refactorización archivado](guias/archivo/plan-refactor-frontend.md): referencia de la refactorización. Resume la organización y los patrones del frontend, sin listas de tareas ni instrucciones de sesión.

## Cómo mantener la documentación

- Centraliza los pasos de instalación y las variables en la guía de ejecución. La plantilla para copiar es [`.env.example`](../.env.example); mantén su contenido sincronizado con el ejemplo de la guía, sin credenciales reales.
- Actualiza el documento funcional al cambiar permisos o alcance. Describe por separado lo que permite la API y lo que ofrece la interfaz.
- Actualiza los contratos de indicadores y del kit junto con sus cambios de código.
- Mantén el README breve y enlaza a estas guías para los detalles.
- Conserva los registros históricos en `guias/archivo/`; no los uses como lista de trabajo actual.
