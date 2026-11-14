import { useEffect, useState } from 'react';
import { urlDeFoto } from '../scripts/cuentaApi';

/**
 * Foto cuadrada de un usuario de CODECOMP, pedida con el token. Sin foto (o sin permiso para verla)
 * muestra la inicial. `src` sirve cuando la foto ya está en memoria (la propia, en la cabecera).
 */
const FotoPerfil = ({ user, userId, version, src, nombre = '', grande = false }) => {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (src || !user || !userId || version == null) return undefined;
    let vigente = true;
    urlDeFoto(user, userId, version).then((u) => { if (vigente) setUrl(u); });
    return () => { vigente = false; };
  }, [user, userId, version, src]);

  const imagen = src || (version == null ? null : url);
  return (
    <span className={`nb-cuenta-foto${grande ? ' is-grande' : ''}`}>
      {imagen
        ? <img src={imagen} alt={nombre ? `Foto de ${nombre}` : 'Foto de perfil'} width="256" height="256" />
        : <span aria-hidden="true">{(nombre || '?').trim()[0]?.toUpperCase() || '?'}</span>}
    </span>
  );
};

export default FotoPerfil;
