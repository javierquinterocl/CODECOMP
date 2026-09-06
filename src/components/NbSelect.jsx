import { useEffect, useId, useRef, useState } from 'react';


const NbSelect = ({ value, onChange, options, label, disabled = false }) => {
  const [abierto, setAbierto] = useState(false);
  const [resaltado, setResaltado] = useState(0);
  const cajaRef = useRef(null);
  const botonRef = useRef(null);
  const listaRef = useRef(null);
  const idLista = useId();

  const indiceActual = Math.max(0, options.findIndex((o) => o.value === value));
  const seleccionada = options[indiceActual];

  // Clic fuera del componente: cerrar sin elegir.
  useEffect(() => {
    if (!abierto) return undefined;
    const alClicar = (e) => {
      if (cajaRef.current && !cajaRef.current.contains(e.target)) setAbierto(false);
    };
    document.addEventListener('mousedown', alClicar);
    return () => document.removeEventListener('mousedown', alClicar);
  }, [abierto]);

  // La opción resaltada siempre visible dentro de la lista.
  useEffect(() => {
    if (!abierto || !listaRef.current) return;
    listaRef.current.children[resaltado]?.scrollIntoView({ block: 'nearest' });
  }, [abierto, resaltado]);

  const abrir = () => {
    setResaltado(indiceActual);
    setAbierto(true);
  };

  const elegir = (indice) => {
    const opcion = options[indice];
    if (opcion) onChange(opcion.value);
    setAbierto(false);
    botonRef.current?.focus();
  };

  const alTeclear = (e) => {
    if (disabled) return;

    if (!abierto) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        abrir();
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setAbierto(false);
        botonRef.current?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setResaltado((i) => (i + 1) % options.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setResaltado((i) => (i - 1 + options.length) % options.length);
        break;
      case 'Home':
        e.preventDefault();
        setResaltado(0);
        break;
      case 'End':
        e.preventDefault();
        setResaltado(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        elegir(resaltado);
        break;
      case 'Tab':
        setAbierto(false);
        break;
      default:
        break;
    }
  };

  return (
    <div className="nb-select" ref={cajaRef}>
      {label && <span className="nb-select-label">{label}</span>}

      <button
        type="button"
        ref={botonRef}
        className={`nb-select-btn${abierto ? ' is-open' : ''}`}
        onClick={() => (abierto ? setAbierto(false) : abrir())}
        onKeyDown={alTeclear}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-label={label}
      >
        <span className="nb-select-value">{seleccionada?.label ?? ''}</span>
        <span className="nb-select-caret" aria-hidden="true">▾</span>
      </button>

      {abierto && (
        <ul
          className="nb-select-menu"
          role="listbox"
          id={idLista}
          ref={listaRef}
          tabIndex={-1}
          aria-label={label}
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={`nb-select-opt${i === resaltado ? ' is-highlighted' : ''}${o.value === value ? ' is-selected' : ''}`}
              onMouseEnter={() => setResaltado(i)}
              onClick={() => elegir(i)}
            >
              {o.label}
              {o.value === value && <span className="nb-select-check" aria-hidden="true">✓</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default NbSelect;
