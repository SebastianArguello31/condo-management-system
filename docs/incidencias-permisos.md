# Permisos de incidencias

La gestión del equipo corresponde a ADMIN. Los roles de la aplicación son
ADMIN, TECNICO y RESIDENTE.

## Contrato para la pantalla de detalle

`GET /condominio/incidents/{id}` devuelve, además de los datos de la incidencia:

- `estados_permitidos`: estados a los que puede pasar la incidencia para el
  usuario autenticado. Una lista vacía significa que no hay cambios disponibles.
- `puede_registrar_intervencion`: booleano que indica si el usuario puede
  registrar una intervención en el estado actual.

Estos campos también se incluyen en las respuestas de asignación de técnico,
cambio de prioridad y cambio de estado, que devuelven el detalle actualizado.
El backend vuelve a validar las reglas al guardar, porque la incidencia puede
haber cambiado desde la consulta.

## Acciones del administrador

- `PATCH /condominio/incidents/{id}/status`, con `estado` y, opcionalmente,
  `comentario`: permite las transiciones válidas, incluido cerrar una incidencia
  resuelta y reabrirla. El historial registra al administrador que hizo el cambio.
- `POST /condominio/incidents/{id}/interventions`, con `resultado`: permite
  registrar intervenciones en estados ASIGNADA, EN_PROCESO y EN_ESPERA, siempre
  que exista un técnico asignado. El autor (`id_personal`) es el usuario
  autenticado que registra la intervención; no reemplaza al técnico asignado.

El técnico conserva acceso solo a sus incidencias asignadas. El residente no
puede registrar intervenciones y solo puede cancelar sus propias incidencias
en RECIBIDA o EN_REVISION, según las reglas existentes.

## Integración pendiente de la pantalla

La pantalla actual muestra los formularios de estado e intervención únicamente
al técnico. Para habilitarlos al administrador debe utilizar los campos del
detalle anteriores. Este cambio de backend no modifica la interfaz.
