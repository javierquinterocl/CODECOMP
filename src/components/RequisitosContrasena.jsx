import { requisitosContrasena } from '../scripts/validaciones';

/** Requisitos de la contraseña marcados en vivo. Se enlaza al campo con `aria-describedby`. */
const RequisitosContrasena = ({ id, valor }) => (
  <ul id={id} className="nb-requisitos" aria-label="Requisitos de la contraseña">
    {requisitosContrasena(valor).map((r) => (
      <li key={r.texto} className={r.cumple ? 'is-ok' : ''}>
        <span aria-hidden="true">{r.cumple ? '✓' : '·'}</span> {r.texto}
        <span className="nb-sr"> {r.cumple ? '(cumplido)' : '(pendiente)'}</span>
      </li>
    ))}
  </ul>
);

export default RequisitosContrasena;
