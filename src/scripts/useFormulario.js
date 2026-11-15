import { useState } from 'react';
import { erroresDe } from './validaciones';

/**
 * Estado de un formulario con validación visible: cada campo se valida al salir de él y,
 * desde ahí, mientras se escribe. Al enviar se muestran todos los errores y el foco va al
 * primero. `validadores` es `{ campo: (valor, valores) => mensaje | null }`.
 */
export const useFormulario = (inicial, validadores) => {
  const [valores, setValores] = useState(inicial);
  const [tocados, setTocados] = useState({});
  const [intentado, setIntentado] = useState(false);

  const todos = erroresDe(valores, validadores);
  const errores = Object.fromEntries(Object.entries(todos).filter(([c]) => intentado || tocados[c]));

  const cambiar = (e) => {
    const { name, value, type, checked } = e.target;
    setValores((v) => ({ ...v, [name]: type === 'checkbox' ? checked : value }));
  };
  const salir = (e) => setTocados((t) => ({ ...t, [e.target.name]: true }));

  /** true si todo está bien; si no, muestra los errores y enfoca el primero. */
  const validarTodo = () => {
    setIntentado(true);
    const primero = Object.keys(validadores).find((c) => todos[c]);
    if (primero) document.getElementById(primero)?.focus();
    return !primero;
  };

  const reiniciar = (nuevos = inicial) => {
    setValores(nuevos);
    setTocados({});
    setIntentado(false);
  };

  /** Props para el input de un campo: valor, eventos y error visible. */
  const campo = (nombre) => ({ id: nombre, name: nombre, value: valores[nombre] ?? '', onChange: cambiar, onBlur: salir });

  return {
    valores, setValores, errores, cambiar, salir, campo, validarTodo, reiniciar,
    totalErrores: intentado ? Object.keys(todos).length : 0,
  };
};
