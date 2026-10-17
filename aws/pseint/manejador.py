# Lambda codecomp-pseint: ejecuta el PSeInt oficial una vez por entrada y devuelve la salida cruda.
# No juzga: la Edge Function compara con los ejemplos.
import ctypes
import os
import resource
import shutil
import subprocess
import tempfile

BINARIO = '/tmp/pseint'
TOPE_CODIGO = 20000
TOPE_ENTRADAS = 10
TOPE_ENTRADA = 64 * 1024
TOPE_SALIDA = 64 * 1024
SEGUNDOS_CPU = 2
SEGUNDOS_RELOJ = 3

# Perfil Flexible oficial, mas las marcas de E/S y el modo de evaluacion.
OPCIONES = [
    '--allow_dinamyc_dimensions=1', '--allow_concatenation=1', '--force_init_vars=0',
    '--force_semicolon=0', '--word_operators=1', '--lazy_syntax=1', '--base_zero_arrays=0',
    '--overload_equal=1', '--coloquial_conditions=1', '--force_define_vars=0',
    '--enable_string_functions=1', '--enable_user_functions=1', '--allow_accents=1',
    '--withioreferences', '--foreval', '--fortest',
]

# Sin volcado: otro proceso del mismo usuario no puede leer /proc de este (ni sus credenciales).
ctypes.CDLL(None).prctl(4, 0, 0, 0, 0)


def _preparar():
    if not os.path.exists(BINARIO):
        shutil.copy(os.path.join(os.path.dirname(__file__), 'pseint'), BINARIO)
        os.chmod(BINARIO, 0o500)


def _limites():
    resource.setrlimit(resource.RLIMIT_CPU, (SEGUNDOS_CPU, SEGUNDOS_CPU))
    resource.setrlimit(resource.RLIMIT_AS, (256 * 1024 * 1024,) * 2)
    resource.setrlimit(resource.RLIMIT_FSIZE, (TOPE_SALIDA,) * 2)
    resource.setrlimit(resource.RLIMIT_NOFILE, (16, 16))
    resource.setrlimit(resource.RLIMIT_NPROC, (1, 1))


def _rechazo(motivo):
    return {'error': motivo}


def _ejecutar(codigo, entrada):
    with tempfile.TemporaryDirectory() as carpeta:
        programa = os.path.join(carpeta, 'p.psc')
        with open(programa, 'w', encoding='latin-1', errors='replace') as f:
            f.write(codigo)
        salida = os.path.join(carpeta, 'salida.txt')
        with open(salida, 'wb') as destino:
            try:
                proceso = subprocess.run(
                    [BINARIO, programa, *OPCIONES],
                    input=entrada.encode('latin-1', errors='replace'),
                    stdout=destino, stderr=subprocess.STDOUT, cwd=carpeta,
                    preexec_fn=_limites, timeout=SEGUNDOS_RELOJ, env={'LANG': 'C'},
                )
                codigo_salida = proceso.returncode
            except subprocess.TimeoutExpired:
                codigo_salida = None
        with open(salida, 'rb') as f:
            texto = f.read(TOPE_SALIDA).decode('latin-1')
    # -24 y -25: SIGXCPU y SIGXFSZ, los topes de CPU y de salida.
    if codigo_salida is None or codigo_salida == -24:
        estado = 'tiempo'
    elif codigo_salida == -25:
        estado = 'salida'
    elif codigo_salida < 0:
        estado = 'fallo'
    else:
        estado = 'ok'
    return {'salida': texto, 'estado': estado}


def handler(evento, _contexto):
    codigo = evento.get('codigo') if isinstance(evento, dict) else None
    entradas = evento.get('entradas') if isinstance(evento, dict) else None
    if not isinstance(codigo, str) or len(codigo) > TOPE_CODIGO:
        return _rechazo('codigo')
    if not isinstance(entradas, list) or not 1 <= len(entradas) <= TOPE_ENTRADAS:
        return _rechazo('entradas')
    if any(not isinstance(e, str) or len(e) > TOPE_ENTRADA for e in entradas):
        return _rechazo('entradas')

    _preparar()
    # Sin caracteres de control: las marcas de E/S de PSeInt no se pueden falsificar.
    codigo = ''.join(c for c in codigo if c in '\n\t' or ord(c) >= 32)
    resultados = []
    for entrada in entradas:
        entrada = entrada.replace('\r', '')
        if entrada and not entrada.endswith('\n'):
            entrada += '\n'
        resultado = _ejecutar(codigo, entrada + '<{[END_OF_INPUT]}>\n')
        resultados.append(resultado)
        # Un ciclo infinito tarda lo mismo en todos los ejemplos: con uno basta.
        if resultado['estado'] == 'tiempo':
            break
    return {'resultados': resultados}
