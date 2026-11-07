# Catálogo orientativo y procedencia

Revisión de reglas básicas: **7 de noviembre de 2026**. Estas ocho guías son
resúmenes propios de fuentes públicas oficiales. No proceden de Wizbii ni de un
catálogo comercial. No contienen importes prometidos, un cálculo de derecho o
una afirmación de convocatoria abierta. La administración competente decide
sobre una solicitud completa.

`public/lib/catalog.js` separa señales de interés (`clues`) de requisitos
pendientes (`requirements`). Una coincidencia significa «Puede interesarte».
No coincidir no equivale a una denegación: todas las guías siguen disponibles.
Las listas de documentos y pasos son preparación general y ejemplos
condicionados al formulario vigente, no una lista oficial exhaustiva. Ayudario
no pide esos documentos ni permite subirlos.

## Fuentes y límites de cada ficha

| ID | Fuente oficial y regla confirmada | Confianza de esta revisión / lo pendiente |
| --- | --- | --- |
| `imv` | [Ministerio de Inclusión: IMV](https://www.inclusion.gob.es/web/inclusion/ingreso-minimo-vital/que-es). Apoyo sujeto a recursos, patrimonio, residencia y convivencia; puede compatibilizarse con trabajo. La fuente remite a condiciones especiales y excepciones. | Alta para estas reglas básicas. No se decide por edad o empleo: faltan datos y hay excepciones. No se trasladan umbrales económicos a un cálculo. |
| `complemento-infancia` | [Ministerio de Inclusión: CAPI](https://www.inclusion.gob.es/web/inclusion/que-es-el-capi). Hogares con menores, límites económicos propios y posibilidad de reconocimiento independiente del IMV; se utiliza su formulario. | Alta. Tener menores no acredita renta, patrimonio, activos ni el resto de condiciones. |
| `paro-contributivo` | [SEPE: prestación contributiva](https://www.sepe.es/HomeSepe/prestaciones-desempleo/prestacion-contributiva/prestacion-contributiva-mas-de-un-anyo). Situación legal de desempleo, inscripción y regla general de 360 días de cotización por desempleo en los seis años anteriores. | Alta para la regla general. Existen supuestos especiales, cotizaciones ya utilizadas e incompatibilidades/compatibilidades que esta aplicación no comprueba. |
| `subsidio-mayores-52` | [SEPE: mayores de 52 años](https://www.sepe.es/HomeSepe/prestaciones-desempleo/subsidio-desempleo/tengo-mas-de-52). Requiere una vía de acceso, inscripción, rentas propias y cotizaciones; contempla desempleo o trabajo parcial y requisitos de jubilación salvo la edad. | Alta. La edad no basta; el historial y la edad ordinaria de jubilación no se calculan. El máximo 110 de la señal de interés es solo el límite del perfil, no una edad legal de cobro. |
| `beca-general` | [Requisitos universitarios](https://www.becaseducacion.gob.es/becas-y-ayudas/universidad-grado-master/que-necesitas) y [no universitarios](https://www.becaseducacion.gob.es/becas-y-ayudas/fp-bachillerato-otros/que-necesitas), Ministerio de Educación. Los extractos oficiales confirman estudios postobligatorios y requisitos generales, académicos y económicos familiares. | **Media / comprobación parcial.** Se leyeron los extractos oficiales indexados; las páginas completas no se recuperaron por timeout/502. No se confirma curso, plazo abierto ni todos los detalles. La ficha muestra esta limitación y remite a la convocatoria. |
| `bono-alquiler-joven` | [BOE, RD 42/2022](https://www.boe.es/buscar/act.php?id=BOE-A-2022-802), texto consolidado con actualización publicada el 23 de abril de 2026: artículos 2, 4, 6 y 7. Edad adulta hasta 35 inclusive, alquiler/cesión habitual, ingresos y gestión territorial. | Alta para este marco. **País Vasco y Navarra están excluidos de este Bono**; no se infiere ausencia de otras ayudas territoriales. Convocatoria, presupuesto y condiciones regionales quedan sin comprobar. |
| `bono-social` | [Ministerio de Derechos Sociales: bono social eléctrico](https://www.dsca.gob.es/es/consumo/preguntas-frecuentes/que-es-bono-social-electrico). Vivienda habitual, PVPC mediante comercializadora de referencia y requisitos de vulnerabilidad económicos, familiares o personales. | Alta para estos elementos. El perfil no acredita contrato, vulnerabilidad ni descuento. No se publican porcentajes ni umbrales variables. |
| `pnc-incapacidad` | [Imserso: normativa y requisitos](https://imserso.es/pnc-prestaciones-subvenciones/pnc-invalidez/normativa-requisitos). Edad desde 18 y menor de 65, discapacidad reconocida de al menos el 65 %, residencia y recursos insuficientes. | Alta. La fuente exige cinco años de residencia en España, incluidos los dos últimos consecutivos; también deben revisarse convivencia e incompatibilidades. «Discapacidad: sí» no acredita grado. El nombre actual es incapacidad, aunque la URL conserva `pnc-invalidez`. |

## Uso responsable del perfil

- Edad, situación laboral y respuestas generales solo ordenan relevancia; no
  sustituyen cotizaciones, renta, patrimonio, residencia, matrícula o un grado
  reconocido oficialmente. No se solicitan cantidades económicas ni informes.
- El IMV no se oculta por trabajar ni se añade una exclusión automática de
  menores de 23 años. El CAPI no exige que la persona haya marcado que cobra IMV.
- «Empleado» no distingue jornada parcial: no se usa para declarar imposible
  el subsidio de mayores de 52 años. La ausencia de una señal deja la guía
  disponible para explorar.
- En alquiler, el territorio incompatible se explica y la ficha permanece
  consultable. La restricción pertenece a este marco concreto, no a todas las
  ayudas de vivienda del territorio.
- `reviewedAt` señala esta revisión humana de reglas básicas, no una consulta
  en vivo de plazos o la fecha de actualización de cada organismo. Becas conserva
  expresamente su comprobación parcial.

Las respuestas y el plan se procesan en el navegador conforme al
[contrato del producto](spec.md). Los enlaces oficiales no incluyen respuestas
del perfil. El catálogo público BDNS es una fuente separada: un anuncio reciente
no acredita plazo abierto, elegibilidad ni disponibilidad presupuestaria. Estas
guías no sustituyen esa convocatoria ni se actualizan automáticamente con ella.
