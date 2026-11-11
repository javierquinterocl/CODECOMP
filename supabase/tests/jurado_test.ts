import { assert, assertEquals, assertStringIncludes } from 'jsr:@std/assert';
import { strFromU8, unzipSync } from 'npm:fflate@0.8.2';
import {
  aclaracionesDeEquipo,
  concursoJson,
  cuentaJson,
  duracionDJ,
  equipoJson,
  filasMarcador,
  htmlDeEnunciado,
  huellaDe,
  ID_CLICS,
  idConcurso,
  idEquipo,
  idProblemaDJ,
  isoBogota,
  paqueteKattis,
  slugDe,
} from '../functions/_compartido/domjudge.ts';

Deno.test('slugDe quita tildes y simbolos', () => {
  assertEquals(slugDe('Maratón Interna #3 (UFPSO)'), 'maraton-interna-3-ufpso');
  assertEquals(slugDe('¡¡!!'), 'x');
  assertEquals(slugDe('a'.repeat(40)).length, 24);
});

Deno.test('idConcurso usa la fecha de Bogota, no la UTC', () => {
  // 2026-11-21 02:00 UTC = 2026-11-20 21:00 en Bogota.
  const cid = idConcurso('Maratón interna', new Date('2026-11-21T02:00:00Z'));
  assert(cid.startsWith('maraton-intern-20261120-'), cid);
});

Deno.test('idConcurso no choca con nombres que empiezan igual el mismo dia', () => {
  const dia = new Date('2026-11-20T19:00:00Z');
  assert(idConcurso('Recorrido del jurado uno', dia) !== idConcurso('Recorrido del jurado dos', dia));
  assertEquals(idConcurso('Maratón interna', dia), idConcurso('  maratón interna ', dia));
});

Deno.test('ids de equipo y de problema dependen del concurso', () => {
  const h = huellaDe('feria-20261109');
  assertEquals(h.length, 6);
  assertEquals(idEquipo('feria-20261109', 'Los Compiladores'), `t-${h}-los-compiladores`);
  assertEquals(idProblemaDJ('ufps-2021-d', 'feria-20261109'), `ufps-2021-d-${h}`);
  assert(idProblemaDJ('ufps-2021-d', 'a') !== idProblemaDJ('ufps-2021-d', 'b'));
  assert(idEquipo('a', 'Bit') !== idEquipo('b', 'Bit'));
});

Deno.test('los ids nunca pasan el formato CLICS de DOMjudge (36 caracteres)', () => {
  const nombreLargo = 'Gran maratón interuniversitaria de programación competitiva del nororiente';
  const cid = idConcurso(nombreLargo, new Date('2026-11-21T02:00:00Z'));
  for (const id of [cid, idEquipo(cid, nombreLargo), idProblemaDJ('icpc-latinoamerica-2024-problema-muy-largo', cid)]) {
    assert(ID_CLICS.test(id), `${id} (${id.length})`);
  }
});

Deno.test('duracionDJ e isoBogota con el formato de DOMjudge', () => {
  assertEquals(duracionDJ(180), '3:00:00.000');
  assertEquals(duracionDJ(45), '0:45:00.000');
  assertEquals(isoBogota(new Date('2026-11-20T19:00:00Z')), '2026-11-20T14:00:00-05:00');
});

Deno.test('concursoJson trae id, horario y congelado', () => {
  const j = concursoJson({ cid: 'x-20261120', nombre: 'X', inicio: new Date('2026-11-20T19:00:00Z'), duracionMin: 180, congeladoMin: 60 });
  assertEquals(j.start_time, '2026-11-20T14:00:00-05:00');
  assertEquals(j.duration, '3:00:00.000');
  assertEquals(j.scoreboard_freeze_duration, '1:00:00.000');
});

Deno.test('reimportar equipo y cuenta lleva el registro completo', () => {
  assertEquals(equipoJson('t1', 'Bit').group_ids, ['participants']);
  assertEquals(equipoJson('t1', 'Bit').organization_id, 'ufpso');
  const c = cuentaJson('t1', 'Bit', 'secreta-de-prueba');
  assertEquals([c.username, c.team_id, c.type], ['t1', 't1', 'team']);
});

Deno.test('htmlDeEnunciado escapa todo menos sup y sub', () => {
  const h = htmlDeEnunciado('Hola <script>x</script> y 10<sup>6</sup>\n\nEntrada\n\nUna linea\notra');
  assert(!h.includes('<script>'));
  assertStringIncludes(h, '&lt;script&gt;');
  assertStringIncludes(h, '10<sup>6</sup>');
  assertStringIncludes(h, '<h3>Entrada</h3>');
  assertStringIncludes(h, 'Una linea<br>otra');
});

Deno.test('paqueteKattis separa ejemplos y ocultos con salto final', () => {
  const zip = unzipSync(paqueteKattis({
    titulo: 'Suma "rapida"',
    enunciado: 'Suma dos numeros.',
    limiteSegundos: 2,
    memoriaMb: 256,
    fuente: 'Prueba',
    casos: [
      { entrada: '1 2', salida: '3', oculto: false },
      { entrada: '5 5\n', salida: '10\n', oculto: true },
    ],
  }, 'C'));
  assertEquals(strFromU8(zip['data/sample/01.in']), '1 2\n');
  assertEquals(strFromU8(zip['data/secret/01.ans']), '10\n');
  assertStringIncludes(strFromU8(zip['domjudge-problem.ini']), 'timelimit=2');
  assertStringIncludes(strFromU8(zip['problem.yaml']), 'memory: 256');
  assertStringIncludes(strFromU8(zip['problem.html']), 'C. Suma &quot;rapida&quot;');
});

Deno.test('aclaracionesDeEquipo no deja ver las de otros equipos', () => {
  const base = { reply_to_id: null, problem_id: null, text: '', time: '' };
  const lista = [
    { ...base, id: '1', from_team_id: 'a', to_team_id: null },
    { ...base, id: '2', from_team_id: null, to_team_id: 'a' },
    { ...base, id: '3', from_team_id: null, to_team_id: null },
    { ...base, id: '4', from_team_id: 'b', to_team_id: null },
    { ...base, id: '5', from_team_id: null, to_team_id: 'b' },
  ];
  assertEquals(aclaracionesDeEquipo(lista, 'a').map((x) => x.id), ['1', '2', '3']);
});

Deno.test('filasMarcador deja solo los equipos del concurso y recalcula el puesto', () => {
  const fila = (team: string, rank: number, solved: number, time: number) => ({
    rank, team_id: team, score: { num_solved: solved, total_time: time }, problems: [],
  });
  const filas = filasMarcador(
    [fila('otro', 1, 5, 10), fila('a', 2, 3, 50), fila('b', 3, 3, 50), fila('c', 4, 1, 9)],
    new Map([['a', 'A'], ['b', 'B'], ['c', 'C']]),
    new Map(),
    'b',
  );
  assertEquals(filas.map((f) => [f.equipo, f.puesto, f.propio]), [['A', 1, false], ['B', 1, true], ['C', 3, false]]);
});
