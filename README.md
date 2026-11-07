# Ayudario

Ayudas públicas en España, con fuentes oficiales y un plan que gestionas tú.

Proyecto nacido del [brief España ayudas](https://app.notion.com/p/40da1ee8bd0680638e87f69899520d19): una experiencia de descubrimiento y preparación inspirada en Wizbii Money, autogestionable. Estado inicial: implementación y comprobaciones enfocadas en curso; publicación y catálogo vivo aún sin verificar.

## Qué hace

- Busca y filtra ocho guías de programas oficiales. Un perfil opcional ordena por relevancia y explica cada señal; mantiene visibles los requisitos pendientes.
- Guarda un plan personal con documentos por preparar, notas, progreso manual y recordatorios descargables para el calendario.
- Exporta e importa una copia JSON validada. La persistencia en este dispositivo se activa expresamente; también puedes trabajar solo durante la sesión y borrar los datos.
- Descubre convocatorias públicas recientes mediante una actualización diaria y acotada del catálogo oficial BDNS. Muestra su fecha de descarga y el origen; una convocatoria reciente no implica que su plazo esté abierto ni que seas elegible.

No recoge nombres, DNI, datos bancarios, credenciales ni documentos. El perfil y el plan no se envían al servidor. Las guías orientan la preparación: la comprobación completa, los plazos y la decisión corresponden al organismo. Las solicitudes se presentan en su sede oficial.

## Desarrollo

Node 22 o posterior; sin dependencias de aplicación ni compilación:

```sh
npm start
npm test
npm run check
```

El servidor de desarrollo escucha solo en `127.0.0.1:4173`. En el Mac de esta sesión, Storage Guard impide instalar, iniciar servidores/navegadores o compilar: las pruebas ligeras de dominio se ejecutan sin instalación y Chromium se comprueba en CI desechable. Consulta [AGENTS.md](AGENTS.md).

La aplicación estática vive en `public/`; los módulos de perfil y plan son reutilizados por las pruebas. [El contrato](docs/spec.md), [la procedencia de las guías](docs/catalogue.md) y [la importación BDNS](docs/bdns.md) explican límites y actualización. Vercel publica `public/` sin claves ni base de datos.

## Datos y licencia

Código MIT. Las fuentes públicas y sus condiciones de reutilización conservan su atribución y fechas; la licencia del código no cambia las condiciones de los datos oficiales. Las guías son resúmenes propios, sin copiar el catálogo ni el diseño de Wizbii. No hay relación de patrocinio con WIZBII, BDNS ni las administraciones citadas.
