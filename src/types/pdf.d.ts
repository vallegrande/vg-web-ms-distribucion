// Tipos personalizados para jsPDF y html2canvas
declare module 'jspdf' {
  export class jsPDF {
    constructor(orientation?: 'p' | 'portrait' | 'l' | 'landscape', unit?: string, format?: string | number[]);
    addPage(): jsPDF;
    addImage(imageData: string, format: string, x: number, y: number, width: number, height: number): jsPDF;
    save(filename: string): void;
  }
}

declare module 'html2canvas' {
  export function html2canvas(element: HTMLElement, options?: any): Promise<HTMLCanvasElement>;
}

// Declaraciones globales
declare var jsPDF: any;
declare var html2canvas: any;


