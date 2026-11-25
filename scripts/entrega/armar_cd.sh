#!/usr/bin/env bash
# Arma la entrega del codigo (CD) desde una rama: solo archivos versionados, sin credenciales
# ni identificadores del despliegue, revisada y firmada. Nunca imprime valores de los .env.
# Uso: bash scripts/entrega/armar_cd.sh <destino> <llave_privada> [rama]

set -euo pipefail
DESTINO="${1:?Falta la carpeta de destino}"
LLAVE="${2:?Falta la llave privada de firma}"
RAMA="${3:-origin/develop}"
RAIZ="$(git rev-parse --show-toplevel)"
SALIDA="$DESTINO/CODECOMP"

cd "$RAIZ"
[ -f "$LLAVE" ] || { echo "No existe la llave $LLAVE"; exit 1; }
[ -e "$SALIDA" ] && { echo "Ya existe $SALIDA: borrala o elige otro destino"; exit 1; }
git fetch -q origin || true
COMMIT="$(git rev-parse --short "$RAMA")"

echo "1. Copiando los archivos versionados de $RAMA ($COMMIT)"
mkdir -p "$SALIDA"
git archive "$RAMA" | tar -x -C "$SALIDA"

echo "2. Quitando lo que solo sirve al despliegue de los autores"
rm -rf "$SALIDA/supabase/.temp" "$SALIDA/.vscode" "$SALIDA/.claude"
printf '{\n  "projects": {\n    "default": "tu-proyecto-firebase"\n  }\n}\n' > "$SALIDA/.firebaserc"
sed -i -E \
  -e 's#^APP_URL=.*#APP_URL=https://tu-dominio#' \
  -e 's#^API_URL=.*#API_URL=https://api.tu-dominio#' \
  -e 's#^DOMJUDGE_URL=.*#DOMJUDGE_URL=https://juez.tu-dominio#' \
  -e 's#^CORREO_REMITENTE=.*#CORREO_REMITENTE=CODECOMP <avisos@tu-dominio>#' \
  "$SALIDA/.env.example"
printf 'CODECOMP\nRama: %s\nCommit: %s\nArmada: %s\n' "$RAMA" "$(git rev-parse "$RAMA")" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$SALIDA/VERSION"

echo "3. Revisando credenciales"
FALLOS=0
PROHIBIDOS=$(cd "$SALIDA" && find . -type f \( -name '.env' -o -name '.env.*' -o -name '*.pem' -o -name '*.p12' \
  -o -name '*.key' -o -name '.secret.local' -o -name 'codecomp_firma' -o -name 'id_*' \) ! -name '.env.example' | wc -l)
[ "$PROHIBIDOS" -eq 0 ] || { echo "   archivos prohibidos: $PROHIBIDOS"; FALLOS=1; }
PATRONES='AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{20,}|re_[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY|"private_key"[[:space:]]*:|postgres(ql)?://[^ <]*:[^ @<$*]{6,}@'
CON_PATRON=$(grep -r -l -I -E "$PATRONES" "$SALIDA" --exclude=package-lock.json \
  | grep -v -E '/supabase/tests/(enmascarar|pseint)_test\.ts$' | wc -l || true)
[ "$CON_PATRON" -eq 0 ] || { echo "   archivos con forma de credencial: $CON_PATRON"; FALLOS=1; }
# Valores reales de los .env locales (12+ caracteres) que no sean publicos; nunca se imprimen.
VALORES="$(mktemp)"
trap 'rm -f "$VALORES"' EXIT
PUBLICAS='^(JUDGE0_URL|IA_URL|IA_MODELO|VITE_API_BASE|VITE_.*_API_URL|ZONA_HORARIA|PSEINT_LAMBDA_.*|.*_MAX_.*|.*_TIMEOUT_MS|ALLOWED_ORIGINS|APP_URL|API_URL|DOMJUDGE_URL|CORREO_REMITENTE|JUDGE0_LENGUAJES)$'
for f in .env supabase/.env supabase/.env.produccion functions/.secret.local; do
  [ -f "$f" ] || continue
  while IFS= read -r linea; do
    k="${linea%%=*}"; v="${linea#*=}"; v="${v%$'\r'}"; v="${v%\"}"; v="${v#\"}"; v="${v%\'}"; v="${v#\'}"
    [[ "$k" =~ $PUBLICAS ]] && continue
    [ ${#v} -ge 12 ] && printf '%s\n' "$v" >> "$VALORES"
  done < <(grep -E '^[A-Z_][A-Z0-9_]*=' "$f")
done
REVISADOS=$(wc -l < "$VALORES")
CON_VALOR=$( [ "$REVISADOS" -gt 0 ] && grep -r -l -I -F -f "$VALORES" "$SALIDA" | wc -l || echo 0)
[ "$CON_VALOR" -eq 0 ] || { echo "   archivos con un valor real de los .env: $CON_VALOR"; FALLOS=1; }
echo "   $REVISADOS valores reales revisados; prohibidos=$PROHIBIDOS patrones=$CON_PATRON valores=$CON_VALOR"
[ "$FALLOS" -eq 0 ] || { echo "Entrega detenida: revisa lo anterior"; rm -rf "$SALIDA"; exit 1; }

echo "4. Firmando"
( cd "$SALIDA" && find . -type f ! -name SHA256SUMS ! -name SHA256SUMS.sig -print0 | sort -z \
  | xargs -0 sha256sum | sed 's#  \./#  #' > SHA256SUMS )
ssh-keygen -q -Y sign -f "$LLAVE" -n codecomp-entrega "$SALIDA/SHA256SUMS"
( cd "$SALIDA" && ssh-keygen -Y verify -f firma/allowed_signers -I codecomp -n codecomp-entrega \
  -s SHA256SUMS.sig < SHA256SUMS && sha256sum -c --quiet SHA256SUMS && echo "   huellas: OK" )

echo "Lista: $SALIDA ($(find "$SALIDA" -type f | wc -l) archivos, commit $COMMIT)"
