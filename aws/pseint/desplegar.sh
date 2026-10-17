#!/usr/bin/env bash
# Crea o actualiza la Lambda de PSeInt: rol, red privada sin salida ni DNS, registros y codigo.
# Uso: AWS_PROFILE=codecomp bash aws/pseint/desplegar.sh   (FUNCION=codecomp-pseint-prueba para la de prueba)
set -euo pipefail

export AWS_PROFILE="${AWS_PROFILE:-codecomp}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"
AWS="${AWS:-aws}"
FUNCION="${FUNCION:-codecomp-pseint}"
MANEJADOR="${MANEJADOR:-manejador.py}"
ROL=codecomp-pseint-ejecucion
RED=codecomp-pseint
REGISTROS="/aws/lambda/$FUNCION"
CONCURRENCIA="${CONCURRENCIA:-10}"
VERSION=20250314
PAQUETE="pseint-l64-$VERSION.tgz"
HUELLA_PAQUETE=871312634da8e1a0e45b0badbdcb8a0e67dbe51e4bf8cf5fe3ff37fd9817191b
HUELLA_BINARIO=96c6fe1884d6f6b95c406c8992555ef043338e96ae3f6109d5e950fbc9178930

AQUI="$(cd "$(dirname "$0")" && pwd)"
TRABAJO="$(mktemp -d)"
trap 'rm -rf "$TRABAJO"' EXIT
ruta() { if command -v cygpath >/dev/null; then cygpath -w "$1"; else echo "$1"; fi; }
CUENTA="$("$AWS" sts get-caller-identity --query Account --output text)"
existe_funcion() { "$AWS" lambda get-function --function-name "$FUNCION" >/dev/null 2>&1; }

echo "== Ejecutable oficial de PSeInt $VERSION"
# Primero el que ya corre en la Lambda; SourceForge solo si todavia no hay funcion.
if existe_funcion; then
  curl -sSL -o "$TRABAJO/actual.zip" \
    "$("$AWS" lambda get-function --function-name "$FUNCION" --query Code.Location --output text)"
  python -I -c 'import sys, zipfile; zipfile.ZipFile(sys.argv[1]).extract("pseint", sys.argv[2])' \
    "$(ruta "$TRABAJO/actual.zip")" "$(ruta "$TRABAJO")"
else
  curl -sSL -A 'Wget/1.21' -o "$TRABAJO/$PAQUETE" \
    "https://downloads.sourceforge.net/project/pseint/$VERSION/$PAQUETE"
  echo "$HUELLA_PAQUETE  $TRABAJO/$PAQUETE" | sha256sum -c -
  tar --force-local -xzf "$TRABAJO/$PAQUETE" -C "$TRABAJO" pseint/bin/pseint
  mv "$TRABAJO/pseint/bin/pseint" "$TRABAJO/pseint.bin" && rm -rf "$TRABAJO/pseint"
  mv "$TRABAJO/pseint.bin" "$TRABAJO/pseint"
fi
echo "$HUELLA_BINARIO  $TRABAJO/pseint" | sha256sum -c -

python -I - "$(ruta "$AQUI/$MANEJADOR")" "$(ruta "$TRABAJO/pseint")" "$(ruta "$TRABAJO/funcion.zip")" <<'EOF'
import sys, zipfile
manejador, binario, destino = sys.argv[1:]
with zipfile.ZipFile(destino, 'w', zipfile.ZIP_DEFLATED) as z:
    for origen, nombre, modo in [(manejador, 'manejador.py', 0o644), (binario, 'pseint', 0o755)]:
        info = zipfile.ZipInfo(nombre)
        info.external_attr = modo << 16
        info.compress_type = zipfile.ZIP_DEFLATED
        with open(origen, 'rb') as f:
            z.writestr(info, f.read())
EOF

echo "== Rol $ROL (registros y red privada, nada mas)"
if ! "$AWS" iam get-role --role-name "$ROL" >/dev/null 2>&1; then
  "$AWS" iam create-role --role-name "$ROL" --query Role.Arn --output text \
    --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
  sleep 10
fi
"$AWS" iam put-role-policy --role-name "$ROL" --policy-name solo-registros --policy-document \
  "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"logs:CreateLogStream\",\"logs:PutLogEvents\"],\"Resource\":\"arn:aws:logs:$AWS_DEFAULT_REGION:$CUENTA:log-group:/aws/lambda/codecomp-pseint*:*\"}]}"
"$AWS" iam attach-role-policy --role-name "$ROL" \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole

echo "== Red privada $RED (sin puerta a internet, sin NAT y sin DNS)"
VPC="$("$AWS" ec2 describe-vpcs --filters "Name=tag:Name,Values=$RED" --query 'Vpcs[0].VpcId' --output text)"
if [ "$VPC" = "None" ]; then
  VPC="$("$AWS" ec2 create-vpc --cidr-block 10.42.0.0/24 --query Vpc.VpcId --output text \
    --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=$RED}]")"
fi
"$AWS" ec2 modify-vpc-attribute --vpc-id "$VPC" --no-enable-dns-support
ZONAS=($("$AWS" ec2 describe-availability-zones --query 'AvailabilityZones[0:2].ZoneName' --output text))
for i in 0 1; do
  BLOQUE="10.42.0.$((i * 128))/25"
  HAY="$("$AWS" ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC" "Name=cidr-block,Values=$BLOQUE" --query 'length(Subnets)' --output text)"
  if [ "$HAY" = "0" ]; then
    "$AWS" ec2 create-subnet --vpc-id "$VPC" --cidr-block "$BLOQUE" --availability-zone "${ZONAS[$i]}" \
      --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$RED}]" --query Subnet.SubnetId --output text
  fi
done
GRUPO="$("$AWS" ec2 describe-security-groups --filters "Name=vpc-id,Values=$VPC" "Name=group-name,Values=$RED-sin-salida" --query 'SecurityGroups[0].GroupId' --output text)"
if [ "$GRUPO" = "None" ]; then
  GRUPO="$("$AWS" ec2 create-security-group --vpc-id "$VPC" --group-name "$RED-sin-salida" \
    --description 'Lambda de PSeInt: sin entrada ni salida' --query GroupId --output text)"
fi
if [ "$("$AWS" ec2 describe-security-groups --group-ids "$GRUPO" --query 'length(SecurityGroups[0].IpPermissionsEgress)' --output text)" != "0" ]; then
  "$AWS" ec2 revoke-security-group-egress --group-id "$GRUPO" \
    --ip-permissions '[{"IpProtocol":"-1","IpRanges":[{"CidrIp":"0.0.0.0/0"}]}]' >/dev/null
fi
SALIDAS="$("$AWS" ec2 describe-security-groups --group-ids "$GRUPO" --query 'length(SecurityGroups[0].IpPermissionsEgress)' --output text)"
[ "$SALIDAS" = "0" ] || { echo "El grupo $GRUPO tiene reglas de salida; se aborta." >&2; exit 1; }
SUBREDES="$("$AWS" ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC" --query 'Subnets[].SubnetId' --output text | tr '\t' ',')"

echo "== Registros (7 dias)"
"$AWS" logs create-log-group --log-group-name "$REGISTROS" 2>/dev/null || true
"$AWS" logs put-retention-policy --log-group-name "$REGISTROS" --retention-in-days 7

echo "== Funcion $FUNCION"
CODIGO="fileb://$(ruta "$TRABAJO/funcion.zip")"
CONFIG=(--runtime python3.12 --handler manejador.handler --memory-size 512 --timeout 10
  --vpc-config "SubnetIds=$SUBREDES,SecurityGroupIds=$GRUPO"
  --logging-config "LogFormat=JSON,ApplicationLogLevel=WARN,SystemLogLevel=WARN,LogGroup=$REGISTROS")
if existe_funcion; then
  "$AWS" lambda update-function-code --function-name "$FUNCION" --zip-file "$CODIGO" --query LastUpdateStatus --output text
  "$AWS" lambda wait function-updated-v2 --function-name "$FUNCION"
  "$AWS" lambda update-function-configuration --function-name "$FUNCION" "${CONFIG[@]}" \
    --role "arn:aws:iam::$CUENTA:role/$ROL" --environment 'Variables={}' --query LastUpdateStatus --output text
else
  "$AWS" lambda create-function --function-name "$FUNCION" --architectures x86_64 "${CONFIG[@]}" \
    --zip-file "$CODIGO" --role "arn:aws:iam::$CUENTA:role/$ROL" --query State --output text
fi
"$AWS" lambda wait function-updated-v2 --function-name "$FUNCION"

# Si la cuota de la cuenta no deja reservar, sigue sin reserva y lo avisa.
"$AWS" lambda put-function-concurrency --function-name "$FUNCION" \
  --reserved-concurrent-executions "$CONCURRENCIA" >/dev/null 2>&1 \
  || echo "Aviso: no se pudo reservar concurrencia $CONCURRENCIA; revisa la cuota de la cuenta."
echo "== Listo: $FUNCION"
