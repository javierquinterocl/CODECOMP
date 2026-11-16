import { assertEquals } from '@std/assert';
import * as E from '../../src/scripts/entrenamiento.js';

// El módulo es JavaScript sin tipos: se usa como `any` en las pruebas.
// deno-lint-ignore no-explicit-any
const { META_TEMA, repasoDeHoy, rutaDeTemas } = E as any;

// Catálogo inventado ya mapeado (forma de mapProblem): numero, categoria y rating.
const p = (numero: number, categoria: string, dificultadRating: number) => ({ numero, categoria, dificultadRating, titulo: `P${numero}` });
const CATALOGO = [
  ...[800, 900, 1000, 1100, 1200, 1300, 1400].map((r, i) => p(100 + i, 'principiante', r)),
  ...[900, 1000, 1200, 1400, 1600, 1800].map((r, i) => p(200 + i, 'grafos', r)),
  ...[1000, 1300, 1500].map((r, i) => p(300 + i, 'cadenas', r)),
];
const HOY = new Date('2026-11-15T12:00:00Z');

Deno.test('rutaDeTemas: orden, avance y el primer tema sin dominar es el recomendado', () => {
  const ruta = rutaDeTemas(CATALOGO, [100, 101, 102, 103, 104], 1000);
  assertEquals(ruta.map((t: { slug: string }) => t.slug), ['principiante', 'cadenas', 'grafos']);
  assertEquals([ruta[0].estado, ruta[0].resueltos], ['dominado', META_TEMA]);
  assertEquals([ruta[1].estado, ruta[1].recomendado], ['recomendado', true]);
  assertEquals([ruta[2].estado, ruta[2].recomendado], ['por-empezar', false]);
});

Deno.test('rutaDeTemas: propone sin resolver desde nivel - 200, o los más fáciles si no alcanzan', () => {
  const [, , grafos] = rutaDeTemas(CATALOGO, [200], 1400);
  // Desde 1200 solo hay 4 sin resolver: se completan con los más fáciles del tema.
  assertEquals(grafos.propuestos.map((x: { numero: number }) => x.numero), [201, 202, 203, 204, 205]);
  assertEquals(grafos.estado, 'en-curso');
});

Deno.test('repasoDeHoy: prioriza el tema débil y explica el motivo', () => {
  const porTag = [
    { tag: 'graphs', intentos: 4, aciertos: 1, ultimo: '2026-11-09T12:00:00Z' },
    { tag: 'strings', intentos: 3, aciertos: 3, ultimo: '2026-11-14T12:00:00Z' },
  ];
  const repaso = repasoDeHoy(porTag, [200], CATALOGO, 1000, HOY);
  assertEquals(repaso.length, 1);
  assertEquals(repaso[0].slug, 'grafos');
  assertEquals(repaso[0].problema.numero, 201);
  assertEquals(repaso[0].motivo, 'Aciertas 25 % de tus envíos en Grafos y no lo practicas hace 6 días.');
});

Deno.test('repasoDeHoy: un tema bien resuelto vuelve cuando vence su intervalo; sin historial no hay repaso', () => {
  const vencido = repasoDeHoy([{ tag: 'strings', intentos: 3, aciertos: 3, ultimo: '2026-10-30T12:00:00Z' }], [], CATALOGO, 1000, HOY);
  assertEquals([vencido[0]?.slug, vencido[0]?.motivo], ['cadenas', 'Repaso programado: no practicas Cadenas hace 16 días.']);
  assertEquals(repasoDeHoy([], [], CATALOGO, 1000, HOY), []);
  assertEquals(repasoDeHoy([{ tag: 'strings', intentos: 2, aciertos: 1, ultimo: null }], [], CATALOGO, 0, HOY).length, 1);
});

Deno.test('rutaDeTemas en modo guiado: bloquea lo posterior al primer tema sin dominar', () => {
  const ruta = rutaDeTemas(CATALOGO, [100, 101, 102, 103, 104, 300], 1000, { guiada: true });
  assertEquals(ruta.map((t: { slug: string; estado: string }) => [t.slug, t.estado]), [['principiante', 'dominado'], ['cadenas', 'en-curso'], ['grafos', 'bloqueado']]);
  assertEquals(ruta[2].requiere, { slug: 'cadenas', titulo: 'Cadenas', hechos: 1, meta: 3 });
  // Cadenas tiene solo 3 problemas: se domina con los 3 y abre el siguiente.
  const abierta = rutaDeTemas(CATALOGO, [100, 101, 102, 103, 104, 300, 301, 302], 1000, { guiada: true });
  assertEquals(abierta.map((t: { estado: string }) => t.estado), ['dominado', 'dominado', 'recomendado']);
  // Sin modo guiado nada se bloquea.
  assertEquals(rutaDeTemas(CATALOGO, [], 1000).some((t: { bloqueado: boolean }) => t.bloqueado), false);
});

Deno.test('repasoDeHoy no recomienda temas bloqueados', () => {
  const porTag = [{ tag: 'graphs', intentos: 4, aciertos: 1, ultimo: '2026-11-09T12:00:00Z' }];
  assertEquals(repasoDeHoy(porTag, [], CATALOGO, 1000, HOY, new Set(['grafos'])), []);
});
