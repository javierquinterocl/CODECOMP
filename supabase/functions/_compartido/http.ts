export interface Rechazo {
  status: number;
  cuerpo: Record<string, unknown>;
  reintentarEn?: number;
}

const CABECERAS_BASE = {
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// null = origen rechazado. Sin Origin pasa: CORS solo protege al navegador.
export const cabecerasCors = (
  origen: string | null,
  origenesPermitidos: string[],
): Record<string, string> | null => {
  if (!origenesPermitidos.length) {
    return { ...CABECERAS_BASE, 'Access-Control-Allow-Origin': origen ?? '*' };
  }
  if (!origen) return { ...CABECERAS_BASE };
  if (origenesPermitidos.includes(origen)) {
    return { ...CABECERAS_BASE, 'Access-Control-Allow-Origin': origen, Vary: 'Origin' };
  }
  return null;
};

export const tokenDe = (req: Request): string | null => {
  const [esquema, token] = (req.headers.get('authorization') ?? '').split(' ');
  return esquema === 'Bearer' && token ? token : null;
};

export const responder = (
  { status, cuerpo, reintentarEn }: Rechazo,
  cors: Record<string, string> = {},
): Response => {
  const cabeceras = new Headers(cors);
  cabeceras.set('Content-Type', 'application/json; charset=utf-8');
  if (reintentarEn) cabeceras.set('Retry-After', String(reintentarEn));
  return new Response(JSON.stringify(cuerpo), { status, headers: cabeceras });
};

export const rechazo = (
  status: number,
  codigo: string,
  mensaje: string,
  extra: Partial<Rechazo> = {},
): Rechazo => ({ status, cuerpo: { codigo, message: mensaje }, ...extra });
