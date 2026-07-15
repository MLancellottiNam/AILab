# Carga de archivos y tutorial

Guía para subir archivos y crear tu primer envelope en eSAW. El flujo básico es: subir documento → crear configuration → enviar envelope.

## Carga de archivos

**Endpoint**: `POST /v6/file/upload`

Al subir un archivo, se retorna un `FileId` que usarás en la creación del envelope. El archivo se almacena temporalmente en el servidor durante 10 minutos; al incluirlo en un envelope, adquiere el tiempo de vida del envelope.

**Nota**: No está permitido subir múltiples archivos en una sola llamada.

### Tipos de archivo soportados

- **PDF** (por defecto)
- En SaaS, si está instalado Document Converter, también:
  - Microsoft Office: .docx, .xlsx, .pptx (y formatos legacy .doc, .xls, .ppt)
  - Open Document Formats: .odt, .ods, .odp (ya no soportados)
  - Texto: .txt, .xml, .md
  - Imágenes: .tif, .png, .jpg, .gif, .jp2, .emf

Los ficheros pueden validarse mediante FileContentValidationPlugin (ej. para detectar contenido malicioso).

## Estructura de la configuración del envelope

Tras subir el archivo, creas una **configuration** que define:

- **Envelope configuration**: Nombre, metadatos, timestamp, políticas generales
- **Documents**: Array de ficheros incluidos
- **Activities**: Array de firmatarios y sus tareas (Sign, View, SendCopy, SignAutomatic, SignAsP7M)
- **Unassigned Elements**: Campos de firma/formulario no asignados a actividades
- **Email configuration**: Asunto, cuerpo del email, remitente
- **Reminder configuration**: Avisos automáticos
- **Expiration configuration**: Expiración relativa o absoluta
- **Callback configuration**: URLs de callback para notificaciones
- **Agreement configuration**: Textos de acuerdo/disclaimer

### Políticas generales (General Policies)

En API v6, las siguientes políticas están activas por defecto:

```
AllowSaveDocument=true, AllowSaveAuditTrail=true,
AllowAdhocFreeHandAnnotations=false,
AllowAdhocPdfAttachments=false, AllowAdhocSignatures=false,
AllowAdhocStampings=false, AllowAdhocTypewriterAnnotations=false,
AllowEmailDocument=true, AllowPrintDocument=true,
AllowRejectWorkstep=true, AllowReloadOfFinishedWorkstep=true,
AllowDownloadOfSignedP7MFiles=true, AllowUndoLastAction=false
```

Puedes personalizar estas políticas en **Settings → Organization → Policy for the document viewer**.

## Envío del envelope

**Endpoint**: `POST /v6/envelope/send`

Tras crear la configuration, envías el envelope combinando:
- El **FileId** obtenido del upload
- La **configuration** completa (activities, elementos, políticas, etc.)

La respuesta retorna el **EnvelopeId** que usarás para gestionar el sobre.

## Ejemplo básico: Click to Sign

Configuración mínima con un firmante (Click to Sign) y un destinatario en copia:

```json
{
  "Documents": [
    {
      "FileId": "c5a229ae-xxxx-xxxx-b6e8-d4eb9fd7bcf5",
      "DocumentNumber": 1,
      "Name": "Test"
    }
  ],
  "Name": "My First Envelope",
  "Activities": [
    {
      "Action": {
        "Sign": {
          "RecipientConfiguration": {
            "ContactInformation": {
              "Email": "jane.doe@sample.com",
              "GivenName": "Jane",
              "Surname": "Doe",
              "LanguageCode": "EN"
            }
          },
          "Elements": {
            "Signatures": [
              {
                "ElementId": "sig1",
                "Required": true,
                "DocumentNumber": 1,
                "DisplayName": "Sign here",
                "AllowedSignatureTypes": {
                  "ClickToSign": {
                    "FieldDefinition": {
                      "Position": {
                        "PageNumber": 1,
                        "X": 100,
                        "Y": 200
                      },
                      "Size": {
                        "Width": 100,
                        "Height": 70
                      }
                    }
                  }
                }
              }
            ]
          },
          "SigningGroup": "firstSigner"
        }
      }
    },
    {
      "Action": {
        "SendCopy": {
          "RecipientConfiguration": {
            "ContactInformation": {
              "Email": "john.doe@sample.com",
              "GivenName": "John",
              "Surname": "Doe",
              "LanguageCode": "EN"
            }
          }
        }
      }
    }
  ],
  "EmailConfiguration": {
    "Subject": "Please sign the enclosed envelope",
    "Body": "Dear #RecipientFirstName# #RecipientLastName#\n\nPlease sign the envelope #EnvelopeName#"
  },
  "ExpirationConfiguration": {
    "ExpirationInSecondsAfterSending": 2419200
  }
}
```

## Recurso Developer Mode

En lugar de escribir JSON manualmente, usa **Developer Mode** para construir envelopes visualmente:

1. Abre eSAW UI
2. Crea un envelope (upload documentos, define firmantes, coloca campos)
3. Descarga la configuration como JSON (botón "Download")
4. Reemplaza datos específicos (nombres, emails) y úsala en tu integración

**Ventajas**:
- No necesitas conocer todas las propiedades ni coordenadas exactas
- Posicionamiento visual de campos
- Funciona igual en pre-envío o post-envío (si quieres testear primero)

---

# Recursos

## API Reference
- **REST API Swagger**: https://demo.esignanywhere.net/Api
- **Documentación oficial**: Guías de integración, FAQ, guías de usuario

## Tutoriales
- **Hello World Tutorial**: Flujo básico completo (upload → send → download)
- **REST Tutorial con Postman**: Paso a paso con ejemplos reales
- **Tutorial SoapUI**: Para usuarios que prefieren SOAP (deprecated)

## Guías técnicas
- **Beginner Guide (v5)**: Conceptos básicos (nota: v5 es deprecated)
- **Envelope XML & Workstep Configuration**: Documentación de estructura
- **Migration Guide**: Para migraciones desde SOAP a REST o v5 a v6
- **Integration & Use Cases**: Escenarios completos (OAuth, video ident, etc.)
- **Developer FAQ**: Preguntas frecuentes técnicas

## Herramientas
- **Java Library Tutorial**: Librería oficial para Java
- **Sample Code**: Ejemplos en C# y Java
- **Developer Mode**: Constructor visual en UI para exportar configuration

## Documentación de firma
- **Electronic Signature Guide**: Tipos de firma, niveles PAdES, evidencia
- **Signer Guide**: Flujos de usuario firmante (no desarrolladores)
- **Administration Guide**: Configuración de organización (on-premise)

## Endpoint SOAP (deprecated)
- **SOAP API Endpoint**: https://demo.esignanywhere.net/api.asmx
- **WSDL**: https://demo.esignanywhere.net/api.asmx?WSDL
- **User Management API**: https://demo.esignanywhere.net/UserManagementApi.asmx
- Nota: SOAP fue deprecado. SOAP en v21.76 (última release con soporte); v1-v5 solamente.

## Notas
- `demo.esignanywhere.net` es gratuito para pruebas; contacta a Namirial para acceso extendido
- Todos los ejemplos de this reference usan API v6 REST (recomendado)
- Para workflow de integración típica, ver [05-esaw-integration-flow.md](05-esaw-integration-flow.md)
