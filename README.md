# Ayudario

<!-- project-family:start -->
> **Project family:** [Web & Creative Apps](https://github.com/alvarovillalbaa#web-and-creative-apps) · **Area:** Public services
<!-- project-family:end -->

Ayudas públicas en España, con fuentes oficiales y un plan que gestionas tú.

Proyecto nacido del [brief España ayudas](https://app.notion.com/p/40da1ee8bd0680638e87f69899520d19): una experiencia de descubrimiento y preparación inspirada en Wizbii Money, autogestionable. [Abrir Ayudario](https://ayudario-xi.vercel.app). Primera versión publicada, con actualización oficial real y comprobación del catálogo en la interfaz alojada.

## Qué hace

- Busca y filtra 16 guías de programas oficiales. Un perfil opcional ordena por relevancia y explica cada señal; mantiene visibles los requisitos pendientes.
- Añade una ayuda desde la parte superior derecha de su ficha. Cada plan tiene requisitos por revisar, documentos por preparar, barra de avance, siguiente punto pendiente, notas y recordatorios descargables para el calendario.
- Exporta e importa una copia JSON validada. La persistencia en este dispositivo se activa expresamente; también puedes trabajar solo durante la sesión y borrar los datos.
- Descubre hasta 50 convocatorias registradas en los últimos 30 días para personas físicas sin actividad económica, mediante una actualización diaria y acotada de la BDNS. Muestra su fecha de descarga y el origen; no es un catálogo completo y una convocatoria reciente no implica que su plazo esté abierto ni que seas elegible.

No recoge nombres, DNI, datos bancarios, credenciales ni documentos. El perfil y el plan no se envían al servidor. Las guías orientan la preparación: la comprobación completa, los plazos y la decisión corresponden al organismo. Las solicitudes se presentan en su sede oficial.

La [iteración de preparación](docs/results/2026/11-15/preparation-v2/result.md)
está publicada y comprobada en la URL pública: 42 casos de dominio, cuatro
recorridos de regresión y una sesión anónima real con los ocho recursos exactos.
La evidencia mantiene separadas las revisiones funcionales y visuales. Las ocho guías nuevas se contrastaron con
fuentes oficiales; las ocho anteriores conservan su fecha de revisión. Las
marcas son personales: completar la lista no acredita elegibilidad. Los cambios
del formulario se conservan al pulsar **Guardar cambios**; activar el guardado
local sigue siendo opcional.

Las copias JSON anteriores se pueden importar y sus documentos/notas se
conservan. El formato 2 añade requisitos revisados sin darlos por comprobados
automáticamente. La copia local anterior se mantiene al abrir y guardar la
nueva; desactivar el guardado o confirmar Borrar todo elimina ambas copias.
Descarga una copia actualizada antes de cambiar de dispositivo.

## Desarrollo

Node 22 o posterior; sin dependencias de aplicación ni compilación:

```sh
npm start
npm test
npm run check
```

El servidor de desarrollo escucha solo en `127.0.0.1:4173`. En el Mac de esta sesión, Storage Guard impide instalar, iniciar servidores/navegadores o compilar: las pruebas ligeras de dominio se ejecutan sin instalación y Chromium se comprueba en CI desechable. Consulta [AGENTS.md](AGENTS.md).

La aplicación estática vive en `public/`; los módulos de perfil y plan son reutilizados por las pruebas. [El contrato](docs/spec.md), [la procedencia de las guías](docs/catalogue.md) y [la importación BDNS](docs/bdns.md) explican límites y actualización. Vercel publica `public/` sin claves ni base de datos.

## Comprobaciones

Los [cuatro flujos de Chromium y 29 casos iniciales](docs/results/2026/11-07/application-checks.md) tienen su fuente y resultados conservados. La corrección posterior del importador pasó [18 casos y una actualización oficial real](docs/results/2026/11-07/catalogue-refresh.md); las comprobaciones anteriores del perfil y la interfaz mantienen su fuente original. No se presenta como una única ejecución nueva de 31 casos. El historial conserva ambos fallos iniciales y el diagnóstico.

La [comprobación alojada B05](docs/results/2026/11-07/hosted-catalogue.md) verificó una sesión anónima real: los 20.888 bytes publicados, 50 títulos y enlaces oficiales, ocho guías, fecha de actualización y cierre normal del navegador. No sustituye una decisión de elegibilidad ni acredita calendarios externos, dispositivos físicos o ejecuciones futuras del horario diario.

## Datos y licencia

Código MIT. Las fuentes públicas y sus condiciones de reutilización conservan su atribución y fechas; la licencia del código no cambia las condiciones de los datos oficiales. Las guías son resúmenes propios, sin copiar el catálogo ni el diseño de Wizbii. No hay relación de patrocinio con WIZBII, BDNS ni las administraciones citadas.
