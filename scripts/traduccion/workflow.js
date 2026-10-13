export const meta = {
  name: 'traducir-catalogo',
  description: 'Traduce lotes de problemas al espanol, corrige los que fallan la validacion y revisa una muestra',
  phases: [
    { title: 'Traducir', detail: 'un agente Sonnet por lote', model: 'sonnet' },
    { title: 'Corregir', detail: 'un agente Opus por lote con fallidos', model: 'opus' },
    { title: 'Revisar muestra', detail: 'agentes Opus leen el 10% validado', model: 'opus' },
  ],
}

const CONCURRENCIA = 4
const VALIDAR = 'deno run --allow-read --allow-write=traduccion scripts/traduccion/validar.ts --lote'
const INFORME = {
  type: 'object',
  properties: {
    escrito: { type: 'boolean' },
    fallidos: { type: 'array', items: { type: 'integer' } },
  },
  required: ['escrito', 'fallidos'],
}

const pedirTraduccion = (id) => `Traduce al espanol un lote de enunciados de programacion competitiva.

1. Lee completos scripts/traduccion/instrucciones.md y scripts/traduccion/glosario.md y siguelos al pie de la letra.
2. Lee completo traduccion/lotes/lote-${id}.txt.
3. Escribe la traduccion de TODOS los problemas del lote en traduccion/resultados/lote-${id}.es.txt, con el formato que piden las instrucciones. Si el lote es largo, escribe el archivo de una vez con Write; no lo partas en varios archivos.
4. Ejecuta: ${VALIDAR} ${id}
5. No corrijas nada despues de validar y no toques ningun otro archivo ni la base de datos.

Devuelve escrito=true si el archivo quedo escrito, y en fallidos los numeros de problema que la validacion reporto con error (lista vacia si pasaron todos).`

const pedirCorreccion = (id) => `Eres el revisor de una traduccion al espanol de enunciados de programacion competitiva. Algunos problemas del lote ${id} fallaron la validacion automatica.

1. Lee scripts/traduccion/instrucciones.md y scripts/traduccion/glosario.md.
2. Lee traduccion/validacion/lote-${id}.json: los problemas con estado "fallo" traen sus errores.
3. Para cada problema fallido, lee su original en traduccion/lotes/lote-${id}.txt y su traduccion en traduccion/resultados/lote-${id}.es.txt, y corrige la traduccion para que cumpla las reglas (segmentos protegidos, numeros, literales y parrafos identicos al original) sin perder calidad.
4. Escribe SOLO los problemas corregidos, con el mismo formato, en traduccion/resultados/lote-${id}.rev.txt. No modifiques el archivo .es.txt.
5. Ejecuta: ${VALIDAR} ${id}
6. Tienes una sola pasada: no vuelvas a corregir tras validar. No toques la base de datos.

Devuelve escrito=true si escribiste el archivo .rev.txt, y en fallidos los numeros que siguen con error.`

const pedirRevision = (k) => `Eres el revisor de calidad de una traduccion tecnica al espanol de enunciados de programacion competitiva. Estos problemas ya pasaron la validacion automatica; buscas lo que un programa no ve.

1. Lee scripts/traduccion/instrucciones.md y scripts/traduccion/glosario.md.
2. Lee completo traduccion/revision/muestra-${k}.txt (cada problema trae el ingles y el espanol).
3. Compara cada par y busca: cambios de sentido, condiciones o casos limite omitidos o anadidos, terminos fuera del glosario o inconsistentes, espanol poco natural o con regionalismos, falta de tuteo, y cualquier cosa que haria que un estudiante resolviera un problema distinto.
4. Escribe tus hallazgos en traduccion/revision/muestra-${k}.md: una linea de resumen (cuantos leiste, cuantos con problemas graves, cuantos con detalles menores) y despues una entrada por problema con hallazgos: numero, gravedad (grave o menor), cita del ingles, cita del espanol y la correccion propuesta. No listes los problemas sin hallazgos.
5. No modifiques ninguna traduccion ni toques la base de datos.

Devuelve una linea con el resumen.`

const trabajo = args || {}
const anotados = { traducidos: [], fallaronAlTraducir: [], corregidos: [], fallaronAlCorregir: [], revisados: [] }

const corregir = async (id) => {
  try {
    const r = await agent(pedirCorreccion(id), { label: `corregir:${id}`, phase: 'Corregir', model: 'opus', schema: INFORME })
    if (r && r.escrito) anotados.corregidos.push(id)
    else anotados.fallaronAlCorregir.push(id)
  } catch (e) {
    anotados.fallaronAlCorregir.push(id)
    log(`Lote ${id}: fallo el revisor (${e && e.message})`)
  }
}

const traducir = async (id) => {
  try {
    const r = await agent(pedirTraduccion(id), { label: `traducir:${id}`, phase: 'Traducir', model: 'sonnet', schema: INFORME })
    if (!r || !r.escrito) {
      anotados.fallaronAlTraducir.push(id)
      log(`Lote ${id}: el traductor no dejo archivo`)
      return
    }
    anotados.traducidos.push(id)
    if (r.fallidos.length) await corregir(id)
  } catch (e) {
    anotados.fallaronAlTraducir.push(id)
    log(`Lote ${id}: fallo el traductor (${e && e.message})`)
  }
}

const revisar = async (k) => {
  try {
    const r = await agent(pedirRevision(k), { label: `muestra:${k}`, phase: 'Revisar muestra', model: 'opus' })
    if (r) anotados.revisados.push({ k, resumen: r })
  } catch (e) {
    log(`Muestra ${k}: fallo el revisor (${e && e.message})`)
  }
}

// Cola con un numero fijo de trabajadores: un fallo no detiene a los demas.
const tareas = [
  ...(trabajo.corregir || []).map((id) => () => corregir(id)),
  ...(trabajo.traducir || []).map((id) => () => traducir(id)),
  ...(trabajo.revisar || []).map((k) => () => revisar(k)),
]
log(`${tareas.length} tareas, ${CONCURRENCIA} a la vez`)
let siguiente = 0
await parallel(Array.from({ length: CONCURRENCIA }, () => async () => {
  while (siguiente < tareas.length) {
    const tarea = tareas[siguiente++]
    await tarea()
  }
}))
return anotados
