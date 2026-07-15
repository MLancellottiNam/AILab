# Historial de Versiones de eSAW

Resumen histórico de versiones recientes de eSignAnyWhere. **Este documento es informativo**; la especificación actual de la API se documenta en [01-06](01-esaw-overview.md).

Nota: versiones mostradas desde 26.16 (abril 2026) hasta 23.49 (diciembre 2023). Para versiones anteriores, consulta la documentación en Confluence.

---

## 26.16 (Abril 2026)

**Compatibilidad con infraestructura y mejoras de procesamiento**

- **Actualización de soporte Aruba GSP**: nueva versión del módulo GSP de Aruba para compatibilidad continua con infraestructura de firma cualificada
- **Traducciones al rumano**: soporte de idioma extendido
- **Mejoras PDF**: calidad mejorada en procesamiento de documentos
- **Correcciones de accesibilidad y concurrencia**: edge cases en uso concurrente, validación de configuración

---

## 26.12 (Marzo 2026)

**Mejoras de rendimiento, notificaciones y procesamiento de envelopes**

- **Nuevo evento "Restart Envelope"**: integrations pueden reaccionar cuando un envelope se reinicia
- **Optimizaciones de cola de notificaciones**: procesamiento más eficiente incluso con alto volumen
- **Backups optimizados**: procesamiento más rápido de respaldos de envelopes finalizados
- **Seguridad (WSC)**: pre-autenticación en llamadas Workstep Controller para operaciones administrativas más seguras
- **Actualización de componentes**: viewer y SDK actualizados a versiones recientes

---

## 26.08 (Febrero 2026)

**Mayor flexibilidad en configuración de ID digital**

- **eID sin número de teléfono**: ahora es posible configurar identificación digital sin requerir número de teléfono, ampliando casos de uso y cumplimiento RGPD
- **Mejoras de seguridad y usabilidad**: correcciones en validación de configuración y manejo de errores

---

## 26.04 (Enero 2026)

**Mejoras API v6: experiencia de firma simplificada y trazabilidad SigString**

- **Control de flujo de firma**:
  - Opción de ocultar ventana de descarga (flujo más lineal)
  - Cierre automático al completar campos requeridos
- **Guía en pantalla configurable**:
  - Inicio automático o manual
  - Mostrar solo campos requeridos, u opcionales también
  - Desactivable para máxima libertad
- **Trazabilidad mejorada de SigString**: cada campo de firma ahora indica claramente qué etiqueta de texto lo creó, facilitando auditoría y troubleshooting

---

## 25.50 (Diciembre 2025)

**Estabilización y mejoras menores**

- Enfoque en firmeza de features existentes
- Mejoras menores en flujos de firma grupal y trazabilidad de envelope
- Mejoras en integraciones de plataforma

---

## 25.46 (Noviembre 2025)

**Optimizaciones de rendimiento y soporte CAdES**

- **Manejo de documentos grandes**: optimizaciones para preparación y procesamiento más rápidos
- **CAdES en API v5**: nuevo soporte de firmas CAdES vía API (API v5)

---

## 25.42 (Octubre 2025)

**Mejoras de confiabilidad y notificaciones push**

- **Mejora de gestión de idiomas en drafts**: actualización automática cuando un idioma se desactiva
- **Notificaciones push**: nuevas alertas para firma de documentos dentro de apps (preparación para generación siguiente de apps)

---

## 25.38 (Septiembre 2025)

**Estabilización y correcciones menores**

- Resolución de issues menores, enfoque en confiabilidad

---

## 25.30 (Julio 2025)

**Mejoras de estabilidad y rendimiento**

- Actualización menor de mantenimiento

---

## 25.26 (Junio 2025)

**Accesibilidad WCAG 2.2 y PDF/UA**

- **WCAG 2.2 AA**: cumplimiento completo para vista de usuario final (firmante)
- **PDF/UA**: nuevo soporte de PDF Universal Accessibility para mayor accesibilidad

---

## 25.20 (Mayo 2025)

**Progreso hacia cumplimiento EU Accessibility Act**

- Correcciones de criterios de éxito WCAG 2.2 específicos (2.1.1, 3.2.2, 3.3.2, 4.1.2)
- Actualizaciones técnicas de estabilidad y notificaciones

---

## 25.14 (Abril 2025)

**Mejoras UX y progreso de accesibilidad**

- Mejoras de experiencia de usuario e intuitividad
- Ajustes técnicos de estabilidad

---

## 24.76 LTS ("25 LTS") — Abril 2025

**Versión Long-Term Support** basada en feature release 24.52.

---

## 25.10 (Marzo 2025)

**Release saltada** — enfoque en desarrollo de features mayores internamente para cumplimiento WCAG 2.2 AA antes de EU Accessibility Act (junio 2025).

---

## 24.52 (Febrero 2025)

**Estabilización integral y nuevo canal de notificación WhatsApp**

- **Enfoque de estabilidad**: firmeza de features core, resolución de issues menores
- **WhatsApp como canal de notificación**: usuarios pueden recibir alertas vía WhatsApp
  - Feature flags: `AllowWhatsappNotification`, `BulkEnvelopesWithWhatsappNotifications`
- **Preparación para versión LTS**: base sólida para soporte a largo plazo

---

## 24.49 (Diciembre 2024)

**PDF/A-2b para audit trails e identificación tardía**

- **Audit trails PDF/A-2b**: cumplimiento de estándares de preservación digital a largo plazo (visual integrity, future-proofing)
- **Identificación tardía (Late Identification)**: los usuarios pueden abrir y leer documentos antes de completar identificación; identificación se hace solo al firmar

---

## 24.45 (Noviembre 2024)

**Mejoras de UI**

- Relocalización de Terms & Conditions, Privacy y API links al diálogo "About" para interfaz más limpio

---

## 24.40 (Octubre 2024)

**Backup mejorado**

- Backup multipart en almacenamiento zip y cloud
- Soporte para múltiples tipos de almacenamiento (todos ahora con capacidad de backup)
- Tamaño de parte configurable en `global.xml`

---

## 24.36 (Septiembre 2024)

**Soporte AML, datos de eID para certificados desechables, y lotes de firma múltiples**

- **AML (Anti-Money Laundering)**: soporte completo para tipo desechable AML; campos de documento ahora opcionales (excepto si uno está presente, todos obligatorios)
- **eID assertions para certificados desechables**: reutilizar datos de eID (OAuth) en múltiples envelopes sin re-entrada manual
- **Lotes de firma múltiples**: nuevos batch groups permiten agrupar firmas por custom grupos, permitiendo firma simultánea dentro de grupo

---

## 24.27 (Julio 2024)

**Prevención de acciones en PDFs firmados y OAuth instance-wide**

- **"Prevent actions on signed PDFs"**: setting de organización que bloquea cualquier acción en PDFs ya firmados (preserva integridad)
- **MyNamirial OAuth instance-wide**: soporte para configurar un único OAuth provider para toda la instancia, centralizando autenticación

---

## 24.23 (Junio 2024)

**AML Disposable, visibilidad P7M, aumento de límite de API v6**

- **Tipo AML para firma desechable**: integración de Anti-Money Laundering en proceso de firma
- **Visibilidad de documento en P7M signers**: soporte completo
- **Aumento de límite de archivos API v6**: de 50 a 100 por envelope

---

## 24.19 (Mayo 2024)

**Notificación SMS y mejora de cola de notificaciones**

- **SMS notifications**: alternativa a email para notificaciones basada en número de teléfono (requiere plugins actualizados)
  - Feature flags: `AllowSmsNotification`, `BulkEnvelopesWithSmsNotification`
- **Reprocesamiento de cola mejorado**: mayor agilidad y entrega más oportuna

---

## 24.14 (Abril 2024)

**Validación de contraseña y cambios de tipos de documento**

- **Prevención de reutilización de contraseñas**: sistema rastrea N contraseñas anteriores (configurable, default 8, max 20)
- **Cambio de tipos de documento soportados**: removidos ods/odp/odt; soportados now: pdf, docx, xlsx, pptx, png, bmp, jpeg, jpg, doc, xls, ppt, gif, jp2, tif, txt, xml, md

---

## 23.76 LTS ("24 LTS") — Abril 2024

**Versión Long-Term Support** basada en feature release 23.52. **Última versión que incluye API v3/v4** (deprecadas en marzo 2024; removidas en junio/diciembre 2024).

---

## 24.10 (Marzo 2024)

**CIE (Electronic ID Italiano) y certificado local basado en archivo**

- **Nuevos tipos de documento para firma desechable (CIE)**:
  - Resident Permit, Italian National Electronic Identity Card, Temporary Resident Permit, Embassy/Consulate Personnel Documents
- **FileBasedLocalCertificate**: nuevo plugin permite firmar usando certificado local (.cer, .key) del dispositivo del firmante

---

## 24.9 (Febrero 2024) — LTS Preparation

**Estabilización y mejoras de features**

- Enfoque en solidez de core features y resolución de issues menores
- Preparación para versión LTS 23.76

---

## 23.49 (Diciembre 2023)

**Certificados de sellado personalizados por envelope**

- **Certificados de sellado por envelope**: antes configurables solo a nivel de organización; ahora personalizable por envelope para mayor control sobre medidas de seguridad

---

## Deprecaciones y Migraciones Importantes

- **API v3/v4**: deprecadas en marzo 2024 (versión 23.76 es la última LTS que las incluye); removidas de feature stream en diciembre 2024
- **API v5**: mantiene compatibilidad pero se recomienda migrar a **v6** (diseño simplificado, HTTP GET/POST solo, estructuras simétricas)
- Consulta *API Migration Guides* en documentación oficial para detalles de migración

---

## Notas sobre Versiones

- **Feature releases**: mensualmente (con excepciones durante desarrollo de features mayores)
- **LTS releases**: "Long-Term Support"; proporcionan estabilidad extendida vs. feature stream
- Cada versión prioriza estabilidad y mejora incremental sobre grandes cambios disruptivos
