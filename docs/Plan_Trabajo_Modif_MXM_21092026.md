# Plan de trabajo y presupuesto — Modif_MXM_21092026

Basado en el documento `Modif_MXM_21092026.docx` (6 modificaciones solicitadas) y en revisión del código actual del proyecto `mxm-ventas` (frontend React + backend Genexus).

Tarifa acordada: **$300 MXN / hora**. Los totales son un **estimado** de referencia; el cobro final queda a criterio del desarrollador según la calidad/complejidad real del trabajo.

## Decisiones de alcance (confirmadas con el cliente/dueño del proyecto)

- **Mod 1** — El mensaje de "cliente con pedido duplicado" es una **advertencia** (permite continuar), no un bloqueo total.
- **Mod 1** — Solo cuenta como "ya tiene un pedido" el estado **PE** (pendiente); no aplica a cotizaciones (CT).
- **Mod 1 y Mod 2** se tratan como **una sola regla de negocio combinada**: máximo 1 artículo de paquetería (prefijo `99PAQ`) por pedido, excepto `99PAQN400` que puede acompañar a otro. Bloquea también repetir el mismo código.
- Esa validación combinada vive en **backend (Genexus)**, dentro del procedimiento `agregaArtPed`, para que aplique sin importar desde qué pantalla se agregue el artículo.
- **Mod 4** — El buscador de clientes en la pantalla de Pedidos (Home) filtra sobre **todos** los pedidos pendientes del vendedor, no solo los ya paginados con "Cargar más".
- **Mod 5** — El ícono de imprimir en la Lista de Pedidos ejecuta la acción **directo**, sin diálogo de confirmación previo (igual que el botón actual dentro del carrito).
- **Mod 6** — El campo `ClaveProv` (tabla `modelos`, unida a `prods` por `prods.modelo = modelos.modelo`) se muestra **debajo de la imagen** del producto en la tabla de Armado, junto con la Clave de Producto.

## Estrategia de ejecución

- Una rama de git por modificación (`feat/mod1-...`, `feat/mod3-...`, etc.), mergeada a `main` cuando esté validada. `main` se despliega automáticamente en Netlify, así que no se trabaja directo sobre ella.
- Cada modificación queda dividida en fases (Backend → Frontend → Pruebas) para poder pausar/facturar por fase entre sesiones.
- Las tareas de backend en Genexus las aplica el dueño del proyecto (tiene acceso), con instrucciones detalladas del desarrollador.

## Tabla de fases, tareas y presupuesto

### Modificación 1 — Validación de pedido duplicado + límite de paquetería (incluye Mod 2)
| Fase | Tarea | Capa | Horas |
|---|---|---|---|
| 1 | Análisis y diseño de la regla (consulta "cliente con pedido PE" + límite 99PAQ en `agregaArtPed`) | Backend | 1.0 |
| 2 | Implementar en Genexus la validación: máx. 1 artículo 99PAQ por pedido, excepto 99PAQN400 que admite un acompañante; bloquea también el mismo código repetido | Backend | 2.0 |
| 3 | Endpoint/ajuste para consultar si el cliente ya tiene un pedido PE y devolver su folio | Backend | 1.5 |
| 4 | ClientSearch.jsx: modal de confirmación "Ya tienes un pedido... ¿deseas abrir uno nuevo? Ped. Núm: X" | Frontend | 2.0 |
| 5 | ProductPreview/Cart: mostrar el mensaje de error del backend al intentar agregar un 2º artículo de paquetería | Frontend | 1.0 |
| 6 | Pruebas integrales de ambos flujos | QA | 1.0 |
| | **Subtotal Mod 1** | | **8.5 h — $2,550 MXN** |

### Modificación 2 — Evitar duplicar paquetería
Cubierta por la validación backend de Mod 1. Solo un ajuste de mensaje.
| Fase | Tarea | Capa | Horas |
|---|---|---|---|
| 1 | Mensaje específico "Ya agregaste este artículo de paquetería" | Backend/Frontend | 0.5 |
| | **Subtotal Mod 2** | | **0.5 h — $150 MXN** |

### Modificación 3 — Artículo de paquetería siempre al final
| Fase | Tarea | Capa | Horas |
|---|---|---|---|
| 1 | Reordenar `itemsStock`/`itemsNoStock` en Cart.jsx para que los 99PAQ queden al final | Frontend | 1.0 |
| 2 | Prueba visual con combinaciones de paquetería + ticket | QA | 0.5 |
| | **Subtotal Mod 3** | | **1.5 h — $450 MXN** |

### Modificación 4 — Buscador de clientes en Lista de Pedidos (Home)
| Fase | Tarea | Capa | Horas |
|---|---|---|---|
| 1 | Input de búsqueda + filtrado sobre la lista completa de pedidos del vendedor | Frontend | 1.5 |
| 2 | Carga bajo demanda de detalles (importe/piezas) de los resultados filtrados no cargados aún | Frontend | 2.0 |
| 3 | Pruebas con volumen real (100+ pedidos), debounce, estado "sin resultados" | QA | 1.0 |
| | **Subtotal Mod 4** | | **4.5 h — $1,350 MXN** |

### Modificación 5 — Icono de imprimir en Lista de Pedidos
| Fase | Tarea | Capa | Horas |
|---|---|---|---|
| 1 | Extraer lógica de "agregar ticket" a helper reutilizable + ícono por fila en Home.jsx | Frontend | 2.0 |
| 2 | Estado de carga por fila y actualización tras agregar el ticket | Frontend | 1.0 |
| 3 | Pruebas | QA | 0.5 |
| | **Subtotal Mod 5** | | **3.5 h — $1,050 MXN** |

### Modificación 6 — Clave de proveedor (ClaveProv) en Armado
| Fase | Tarea | Capa | Horas |
|---|---|---|---|
| 1 | Instrucciones + acompañamiento para modificar en Genexus el join `prods.modelo = modelos.modelo` y exponer `ClaveProv` en `PedidoConfirmado/{id}` | Backend (cliente, con guía) | 2.0 |
| 2 | PartesTable.jsx: mostrar Clave Prod y Clave Prov debajo de la imagen del producto | Frontend | 1.5 |
| 3 | Pruebas de integración con datos reales una vez aplicado el cambio en Genexus | QA | 1.0 |
| | **Subtotal Mod 6** | | **4.5 h — $1,350 MXN** |

## Total general

| | Horas | Costo |
|---|---|---|
| **Total** | **23 h** | **$6,900 MXN** |

## Orden de arranque acordado

1. **Modificación 3** (frontend puro, sin dependencia de Genexus) — en curso.
2. Modificación 4 (buscador Home).
3. Modificación 5 (ícono imprimir en Home).
4. Modificación 1/2 (validación de pedido duplicado y paquetería) — en paralelo con cambios en Genexus.
5. Modificación 6 (ClaveProv) — al final, depende del cambio en Genexus.
