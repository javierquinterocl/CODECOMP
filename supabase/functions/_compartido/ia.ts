

import type { Config } from './config.ts';

export interface Mensaje {
  role: 'system' | 'user';
  content: string;
}

export interface RespuestaIa {
  ok: boolean;
  texto: string;
  mensaje?: string;
}

// Recorta por caracteres, no por tokens: no hace falta precision, hace falta techo.
export const recortarA = (texto: string, limite: number): string => {
  const limpio = (texto ?? '').trim();
  return limpio.length > limite ? `${limpio.slice(0, limite)}\n...(recortado)` : limpio;
};

export const consultar = async (mensajes: Mensaje[], config: Config): Promise<RespuestaIa> => {
  if (!config.iaApiKey) {
    return { ok: false, texto: '', mensaje: 'La retroalimentacion no esta configurada.' };
  }

  const corte = new AbortController();
  const alarma = setTimeout(() => corte.abort(), config.iaTimeoutMs);

  try {
    const res = await fetch(`${config.iaUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.iaApiKey}`,
      },
      body: JSON.stringify({
        model: config.iaModelo,
        messages: mensajes,
        // El tope duro de gasto por llamada.
        max_tokens: config.iaMaxTokens,
        // Baja: se quiere una pista consistente, no creatividad.
        temperature: 0.3,
        stream: false,
       
        chat_template_kwargs: { enable_thinking: false },
      }),
      signal: corte.signal,
    });

    const texto = await res.text();
    let data: Record<string, unknown> = {};
    try {
      data = texto ? JSON.parse(texto) : {};
    } catch {
      data = {};
    }

    if (!res.ok) {
      // El detalle del proveedor va al log, nunca al estudiante.
      console.error('Tutor IA rechazo la peticion:', res.status, texto.slice(0, 500));
      return { ok: false, texto: '', mensaje: 'La retroalimentacion no esta disponible en este momento.' };
    }


    const uso = data.usage as
      | { prompt_tokens?: number; completion_tokens?: number; estimated_cost?: number }
      | undefined;
    if (uso) {
      console.log(
        `Tutor IA: ${uso.prompt_tokens ?? '?'} entrada, ${uso.completion_tokens ?? '?'} salida,`,
        `costo estimado ${uso.estimated_cost ?? '?'}`,
      );
    }

    const opciones = data.choices as
      | Array<{ finish_reason?: string; message?: { content?: string; reasoning_content?: string } }>
      | undefined;
    const eleccion = opciones?.[0];
    // Si el modelo dejo todo en el razonamiento, eso es mejor que nada.
    const contenido = eleccion?.message?.content?.trim() ||
      eleccion?.message?.reasoning_content?.trim() || '';

    if (!contenido) {
      console.error(
        'Tutor IA devolvio contenido vacio. finish_reason:',
        eleccion?.finish_reason ?? '(ninguno)',
        'campos del mensaje:',
        Object.keys(eleccion?.message ?? {}).join(',') || '(ninguno)',
      );
      return { ok: false, texto: '', mensaje: 'No se pudo generar la retroalimentacion.' };
    }

    return { ok: true, texto: contenido };
  } catch (error) {
    const abortado = error instanceof DOMException && error.name === 'AbortError';
    console.error('Tutor IA fallo:', error);
    return {
      ok: false,
      texto: '',
      mensaje: abortado
        ? 'La retroalimentacion tardo demasiado. Intentalo de nuevo.'
        : 'No se pudo generar la retroalimentacion.',
    };
  } finally {
    clearTimeout(alarma);
  }
};
