# Aviso de autoría y firma

CODECOMP es obra de Andrés Salas y Javier Quintero, desarrollada como proyecto de grado de Ingeniería de Sistemas en la UFPS Ocaña (2026). Todos los derechos reservados; las condiciones de uso están en `LICENSE`.

Quien copie, ejecute o redistribuya este código, o una parte de él, debe conservar este aviso, el archivo `LICENSE` y la carpeta `firma/`.

## Firma de la entrega

Cada entrega lleva dos archivos en su raíz:

- `SHA256SUMS`: la huella SHA-256 de cada archivo de la entrega.
- `SHA256SUMS.sig`: la firma de esa lista, hecha con la llave privada de los autores.

La llave pública está en `firma/codecomp_firma.pub`. Su huella es:

```
SHA256:vCc3S3/RfZ2b/q7bJl2OTlmoCVgz4D2NWfk1KhzQmyk
```

La llave privada nunca se incluye en el código ni en la entrega. Una firma válida prueba que la lista de huellas salió de los autores; si las huellas también coinciden, ningún archivo se cambió después de firmar.

## Cómo comprobarla

Desde la raíz de la entrega, con OpenSSH 8.1 o superior (viene con Git para Windows, macOS y Linux):

```bash
# 1. La firma de la lista es de los autores
ssh-keygen -Y verify -f firma/allowed_signers -I codecomp -n codecomp-entrega -s SHA256SUMS.sig < SHA256SUMS

# 2. Ningún archivo cambió
sha256sum -c SHA256SUMS
```

El primer comando debe responder `Good "codecomp-entrega" signature for codecomp` y el segundo, `OK` en cada archivo. Cualquier otro resultado significa que la entrega fue alterada o no es de los autores.
