// Separado de index.ts porque ese llama a Deno.serve() al cargarse.
// '/functions/v1/api/problems/4' -> ['problems', '4']
export const segmentosDe = (pathname: string): string[] => {
  const partes = pathname.split('/').filter(Boolean);
  const i = partes.lastIndexOf('api');
  return i === -1 ? partes : partes.slice(i + 1);
};
