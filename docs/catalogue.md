# Catálogo orientativo y procedencia

Revisión de reglas básicas: **7 de noviembre de 2026** para las ocho guías
originales; **14 de noviembre de 2026** para ocho incorporaciones. Las 16 guías son
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

## Incorporaciones revisadas el 14 de noviembre

Las páginas completas enlazadas se leyeron en esta iteración. Los pasos y las
listas son preparación orientativa, no formularios exhaustivos. Las guías
anteriores conservan su evidencia de noviembre 7; no se declara una nueva
revisión de sus reglas. No se añaden importes ni plazos abiertos al producto.

| ID | Fuente oficial leída | Límite de la ficha |
| --- | --- | --- |
| `pnc-jubilacion` | [Imserso: requisitos](https://imserso.es/pnc-prestaciones-subvenciones/pnc-jubilacion/normativa-requisitos) | Edad, residencia y recursos; sin cálculo individual ni lista documental territorial completa. |
| `subsidio-cotizacion-insuficiente` | [SEPE: requisitos, documentos y trámite](https://www.sepe.es/HomeSepe/es/prestaciones-desempleo/subsidio-desempleo/subsidio-cotizaciones-insuficientes-he-trabajado-menos-de-un-anyo.html) | El régimen depende del hecho causante; no se comprueban cotizaciones ni expediente. |
| `subsidio-agotamiento` | [SEPE: requisitos, documentos y trámite](https://www.sepe.es/HomeSepe/es/prestaciones-desempleo/subsidio-desempleo/subsidio-agotamiento-prestacion-contributiva.html) | No se infiere derecho al agotar el paro ni se calcula duración o plazo personal. |
| `pago-unico` | [SEPE: capitalización](https://www.sepe.es/HomeSepe/autonomos/capitaliza-tu-prestacion.html) | Anticipo sujeto a modalidad y obligaciones; no es dinero adicional ni asesoramiento de inversión. |
| `complemento-alquiler-pnc` | [Imserso: complemento y solicitud](https://imserso.es/pnc-prestaciones-subvenciones/solicitud-complemento-titulares-pension-contributiva) | Requiere PNC y otras condiciones; plazo anual y documentación deben confirmarse. La URL oficial conserva «pension-contributiva». |
| `dependencia` | [Imserso: personas beneficiarias](https://imserso.es/autonomia-personal-dependencia/sistema-autonomia-atencion-dependencia-saad/preguntas-frecuentes/personas-beneficiarias-sistema-autonomia-atencion-dependencia) y [tramitación](https://imserso.es/autonomia-personal-dependencia/sistema-autonomia-atencion-dependencia-saad/preguntas-frecuentes/tramitacion-reconocimiento-situacion-dependencia-derecho-prestaciones-sistema) | La ficha no valora grado ni asigna prestación; formularios e informes dependen del territorio. |
| `deduccion-maternidad` | [AEAT: personas con derecho](https://sede.agenciatributaria.gob.es/Sede/ciudadanos-familias-personas-discapacidad/deducciones-relacionadas-hijos-descendientes/deduccion-maternidad/quien-corresponde-deduccion.html), [beneficio](https://sede.agenciatributaria.gob.es/Sede/ciudadanos-familias-personas-discapacidad/deducciones-relacionadas-hijos-descendientes/deduccion-maternidad.html) y [anticipo](https://sede.agenciatributaria.gob.es/Sede/ciudadanos-familias-personas-discapacidad/deducciones-relacionadas-hijos-descendientes/deduccion-maternidad/abono-anticipado-deduccion.html) | Hay supuestos especiales e interacción con CAPI; no se calcula la deducción. |
| `deduccion-familia-numerosa` | [AEAT: personas con derecho](https://sede.agenciatributaria.gob.es/Sede/ciudadanos-familias-personas-discapacidad/deducciones-relacionadas-hijos-descendientes/deduccion-familia-numerosa/quien-corresponde-deduccion.html) y [solicitud/cesión](https://sede.agenciatributaria.gob.es/Sede/ciudadanos-familias-personas-discapacidad/deducciones-relacionadas-hijos-descendientes/deduccion-familia-numerosa/solicitud-cesion-abono-anticipado.html) | Los menores a cargo son una señal de interés, no prueba de familia numerosa ni de derecho fiscal. |

Una URL abreviada inicialmente consultada para cotizaciones insuficientes falló;
se recuperó y leyó la ficha oficial completa enlazada arriba. También se examinó
la página de formularios de nacimiento y cuidado de menor, pero no se añadió
esa prestación ni se dedujeron reglas de acceso de una página documental.

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
- `reviewedAt` señala la revisión documentada de reglas básicas, no una consulta
  en vivo de plazos o la fecha de actualización de cada organismo. Becas conserva
  expresamente su comprobación parcial.

Las respuestas y el plan se procesan en el navegador conforme al
[contrato del producto](spec.md). Los enlaces oficiales no incluyen respuestas
del perfil. El catálogo público BDNS es una fuente separada: un anuncio reciente
no acredita plazo abierto, elegibilidad ni disponibilidad presupuestaria. Estas
guías no sustituyen esa convocatoria ni se actualizan automáticamente con ella.
