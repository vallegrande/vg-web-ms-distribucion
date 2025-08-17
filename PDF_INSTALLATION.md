# Instalación de Dependencias para Generación de PDF

## 📦 Dependencias Requeridas

Para que la funcionalidad de descarga de PDF funcione correctamente, necesitas instalar las siguientes dependencias:

### 1. jsPDF
```bash
npm install jspdf
```

### 2. html2canvas
```bash
npm install html2canvas
```

### 3. Instalación Completa
```bash
npm install jspdf html2canvas
```

## 🔧 Configuración

### TypeScript
El proyecto ya incluye las declaraciones de tipos necesarias en `src/types/pdf.d.ts`.

### Angular
Las dependencias se importan automáticamente en el componente `ProgramDetailComponent`.

## 🚀 Uso

Una vez instaladas las dependencias, la funcionalidad de descarga de PDF estará disponible:

1. **Botón de Descarga**: Aparece al lado del botón "Editar" en la vista de detalle del programa
2. **Generación Automática**: Al hacer clic, se genera un PDF con toda la información del programa
3. **Descarga**: El archivo se descarga automáticamente con el nombre `programa_distribucion_[CODIGO]_[FECHA].pdf`

## 📋 Características del PDF

El PDF generado incluye:

- **Información Básica**: Código, fecha y estado del programa
- **Horarios**: Planificados y reales de inicio y fin
- **Ubicación**: Organización, zona y calle
- **Ruta y Horario**: Detalles de la ruta asignada
- **Responsable**: Usuario responsable del programa
- **Observaciones**: Notas adicionales del programa

## 🎨 Personalización

El diseño del PDF se puede personalizar modificando:

- `generatePDFContent()`: Contenido HTML del PDF
- `generatePDF()`: Configuración de generación
- Estilos CSS en el método `generatePDFContent()`

## ⚠️ Solución de Problemas

### Error: "jsPDF is not defined"
- Verifica que `jspdf` esté instalado: `npm list jspdf`
- Reinicia el servidor de desarrollo: `ng serve`

### Error: "html2canvas is not defined"
- Verifica que `html2canvas` esté instalado: `npm list html2canvas`
- Reinicia el servidor de desarrollo: `ng serve`

### PDF no se genera
- Verifica la consola del navegador para errores
- Asegúrate de que el programa esté cargado antes de intentar generar el PDF

## 📱 Compatibilidad

- **Navegadores**: Chrome, Firefox, Safari, Edge (versiones modernas)
- **Dispositivos**: Desktop, Tablet, Mobile
- **Angular**: Versión 19+
- **Node.js**: Versión 18+


