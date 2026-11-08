// Código estudiantil UFPSO: desde 2026 son exactamente 7 dígitos (antes 6).

export const LARGO_CODIGO = 7;
const FORMATO = /^\d{7}$/;

/** true si el código ya tiene el formato nuevo. */
export const codigoVigente = (codigo) => FORMATO.test(String(codigo ?? '').trim());

/** Mensaje de error para el formulario, o null si el código es válido. */
export const errorDeCodigo = (codigo) => {
  const valor = String(codigo ?? '').trim();
  if (!valor) return 'El código es obligatorio.';
  if (!FORMATO.test(valor)) return `El código debe tener exactamente ${LARGO_CODIGO} dígitos.`;
  return null;
};
