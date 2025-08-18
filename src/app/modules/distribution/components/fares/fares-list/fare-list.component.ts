import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import Swal from 'sweetalert2';

import { OrganizationService } from '../../../../../core/services/organization.service';
import { DistributionService } from '../../../../../core/services/distribution.service';
import { fares } from '../../../../../core/models/distribution.model';
import { organization } from '../../../../../core/models/organization.model';
import { Status } from '../../../../../core/models/payment.model';

@Component({
  selector: 'app-fare-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './fare-list.component.html',
  styleUrls: ['./fare-list.component.css']
})
export class FareListComponent implements OnInit {
  fares: fares[] = [];
  filteredFares: fares[] = [];
  organizations: organization[] = [];
  searchTerm: string = '';
  selectedStatus: string = 'activo';
  loading: boolean = false;

  showAlert: boolean = false;
  alertMessage: string = '';
  alertType: 'success' | 'error' | 'info' = 'success';

  constructor(
    private organizationService: OrganizationService,
    private distributionService: DistributionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadFares();
    this.loadOrganizations();
  }

  loadFares(): void {
    this.loading = true;

    const request$ = this.selectedStatus === 'activo'
      ? this.distributionService.getAllActiveF()
      : this.distributionService.getAllInactiveF();

    request$.subscribe({
      next: (data) => {
        this.fares = data;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar tarifas', err);
        this.loading = false;
      }
    });
  }

  loadOrganizations(): void {
    this.organizationService.getAllOrganization().subscribe({
      next: (data) => {
        this.organizations = data.filter(org => org.status === 'ACTIVE');
      },
      error: (err) => {
        console.error('Error al cargar organizaciones', err);
        Swal.fire('Error', 'No se pudieron cargar las organizaciones', 'error');
      }
    });
  }

  onSearch(): void {
    this.applyFilters();
  }

  onStatusChange(): void {
    this.loadFares();
  }

  private applyFilters(): void {
    this.filteredFares = this.fares.filter(fare => {
      const matchesSearch = this.searchTerm === '' ||
        fare.fareCode?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        fare.fareName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        fare.fareType?.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesStatus =
        (this.selectedStatus === 'activo' && fare.status === Status.ACTIVE) ||
        (this.selectedStatus === 'inactivo' && fare.status === Status.INACTIVE) ||
        this.selectedStatus === 'todos';

      return matchesSearch && matchesStatus;
    });
  }

  deactivateFare(fare: fares): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: `¿Deseas desactivar la tarifa "${fare.fareName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.distributionService.deactivateFares(fare.id).subscribe({
          next: () => {
            this.showAlertMessage('Tarifa desactivada exitosamente', 'success');
            this.loadFares();
          },
          error: (err: any) => {
            console.error('Error al desactivar tarifa', err);
            this.showAlertMessage('Error al desactivar la tarifa', 'error');
          }
        });
      }
    });
  }

  activateFare(fare: fares): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: `¿Deseas activar la tarifa "${fare.fareName}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, activar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.distributionService.activateFares(fare.id).subscribe({
          next: () => {
            this.showAlertMessage('Tarifa activada exitosamente', 'success');
            this.loadFares();
          },
          error: (err: any) => {
            console.error('Error al activar tarifa', err);
            this.showAlertMessage('Error al activar la tarifa', 'error');
          }
        });
      }
    });
  }

  // Funcionalidad de PDF
  downloadPDF(fare: fares): void {
    console.log('📄 Generando PDF para tarifa:', fare.fareCode);
    
    try {
      const pdfContent = this.generatePDFContent(fare);
      this.generatePDFSimple(pdfContent);
    } catch (error) {
      console.error('❌ Error en la generación del PDF:', error);
      Swal.fire('Error', 'Error al generar el PDF. Por favor, intente nuevamente.', 'error');
    }
  }

  downloadAllPDFs(): void {
    console.log('📄 Generando PDF masivo para todas las tarifas');
    
    try {
      const pdfContent = this.generateAllPDFsContent();
      this.generatePDFSimple(pdfContent);
    } catch (error) {
      console.error('❌ Error en la generación del PDF masivo:', error);
      Swal.fire('Error', 'Error al generar el PDF masivo. Por favor, intente nuevamente.', 'error');
    }
  }

  private generatePDFContent(fare: fares): string {
    const organizationName = this.getNameOrganization(fare.organizationId);
    const statusText = this.getStatusLabel(fare.status);
    
    return `
     <!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Tarifa - ${fare.fareCode}</title>
  <style>
    :root {
      --brand:#2563eb;
      --brand-2:#3b82f6;
      --muted:#6b7280;
      --success:#10b981;
      --danger:#ef4444;
      --bg:#f8fafc;
      --border:#e5e7eb;
    }
    body {
      font-family:"Segoe UI",Roboto,Arial,sans-serif;
      margin:32px;
      background:var(--bg);
      color:#111827;
      line-height:1.6;
    }
    .header {
      text-align:center;
      border-bottom:2px solid var(--brand);
      padding-bottom:20px;
      margin-bottom:30px;
    }
    .header img.logo {
      max-height:70px;
      margin-bottom:10px;
    }
    .header h1 {
      margin:0;
      font-size:24px;
      color:#0f172a;
    }
    .header h2 {
      margin:6px 0;
      font-size:18px;
      font-weight:500;
      color:var(--brand);
    }
    .header p {
      margin:4px 0;
      font-size:13px;
      color:var(--muted);
    }
    .section {
      margin-bottom:25px;
      page-break-inside:avoid;
    }
    .section-title {
      background:linear-gradient(90deg,var(--brand),var(--brand-2));
      padding:10px;
      font-weight:bold;
      color:#fff;
      border-radius:6px;
      margin-bottom:15px;
      font-size:13px;
      letter-spacing:.5px;
    }
    .grid {
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:20px;
    }
    .field {
      margin-bottom:15px;
    }
    .label {
      font-weight:bold;
      color:var(--muted);
      font-size:12px;
      text-transform:uppercase;
    }
    .value {
      font-size:14px;
      margin-top:5px;
    }
    .status {
      display:inline-block;
      padding:5px 10px;
      border-radius:15px;
      font-size:12px;
      font-weight:bold;
    }
    .status-active { background:#d1fae5; color:#065f46; }
    .status-inactive { background:#fee2e2; color:#991b1b; }

    @media print {
      body { margin:0; padding:12mm; background:#fff; print-color-adjust:exact; -webkit-print-color-adjust:exact; }
      .header img.logo { max-height:50px; }
      @page { size:A4; margin:12mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <!-- Logo con múltiples rutas de respaldo -->
    <img 
      class="logo"
      alt="Logo"
      src="https://drive.google.com/uc?export=view&id=1RJBsvtfYi76XpXmelFv2MVfMxsJo1RY6"
      style="height:64px;width:auto;object-fit:contain"
      onerror="if(!this.dataset.fallback){this.dataset.fallback=1;this.src='https://drive.google.com/thumbnail?id=1RJBsvtfYi76XpXmelFv2MVfMxsJo1RY6&sz=w600';}
               else if(this.dataset.fallback==1){this.dataset.fallback=2;this.src='https://lh3.googleusercontent.com/d/1RJBsvtfYi76XpXmelFv2MVfMxsJo1RY6=s600';}
               else {this.removeAttribute('onerror'); this.alt='[Logo no disponible]';}" />

    <h1>INFORMACIÓN DE TARIFA</h1>
    <h2>${fare.fareCode}</h2>
    <p>Fecha de generación: ${new Date().toLocaleDateString('es-ES')}</p>
  </div>

  <div class="section">
    <div class="section-title">INFORMACIÓN BÁSICA</div>
    <div class="grid">
      <div class="field">
        <div class="label">Código de Tarifa</div>
        <div class="value">${fare.fareCode}</div>
      </div>
      <div class="field">
        <div class="label">Nombre de Tarifa</div>
        <div class="value">${fare.fareName}</div>
      </div>
      <div class="field">
        <div class="label">Tipo de Tarifa</div>
        <div class="value">${fare.fareType}</div>
      </div>
      <div class="field">
        <div class="label">Monto</div>
        <div class="value">S/. ${fare.fareAmount?.toFixed(2)}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">INFORMACIÓN ADICIONAL</div>
    <div class="grid">
      <div class="field">
        <div class="label">Organización</div>
        <div class="value">${organizationName}</div>
      </div>
      <div class="field">
        <div class="label">Estado</div>
        <div class="value">
          <span class="status status-${fare.status.toLowerCase()}">${statusText}</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>

    `;
  }

  private generateAllPDFsContent(): string {
    return `
     <!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Reporte de Tarifas</title>
  <style>
    :root {
      --brand:#2563eb;
      --brand-light:#eff6ff;
      --muted:#6b7280;
      --success-bg:#d1fae5;
      --success:#065f46;
      --danger-bg:#fee2e2;
      --danger:#991b1b;
      --border:#e5e7eb;
      --bg:#f9fafb;
    }
    body {
      font-family:"Segoe UI",Arial,sans-serif;
      margin:32px;
      background:var(--bg);
      color:#111827;
      line-height:1.6;
    }
    .header {
      display:flex;
      align-items:center;
      justify-content:space-between;
      border-bottom:3px solid var(--brand);
      padding-bottom:15px;
      margin-bottom:25px;
    }
    .header img {
      max-height:70px;
    }
    .header-info {
      text-align:right;
    }
    .header-info h1 {
      margin:0;
      font-size:22px;
      color:#0f172a;
    }
    .header-info p {
      margin:2px 0;
      font-size:13px;
      color:var(--muted);
    }
    table {
      width:100%;
      border-collapse:collapse;
      background:white;
      border-radius:8px;
      overflow:hidden;
    }
    th, td {
      border:1px solid var(--border);
      padding:10px 12px;
      font-size:14px;
    }
    th {
      background:var(--brand-light);
      color:#1e3a8a;
      font-weight:600;
      text-align:left;
    }
    tr:nth-child(even) {
      background:#f9fafb;
    }
    .status-active {
      background:var(--success-bg);
      color:var(--success);
      padding:4px 10px;
      border-radius:12px;
      font-size:12px;
      font-weight:bold;
    }
    .status-inactive {
      background:var(--danger-bg);
      color:var(--danger);
      padding:4px 10px;
      border-radius:12px;
      font-size:12px;
      font-weight:bold;
    }
    @media print {
      body { margin:0; padding:10mm; background:#fff; print-color-adjust:exact; -webkit-print-color-adjust:exact; }
      .header { border-color:black; }
      table { border:1px solid #999; }
      @page { size:A4; margin:12mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <!-- Logo con múltiples rutas de respaldo -->
    <img 
      alt="Logo"
      src="https://drive.google.com/uc?export=view&id=1RJBsvtfYi76XpXmelFv2MVfMxsJo1RY6"
      onerror="if(!this.dataset.fallback){this.dataset.fallback=1;this.src='https://drive.google.com/thumbnail?id=1RJBsvtfYi76XpXmelFv2MVfMxsJo1RY6&sz=w600';}
               else if(this.dataset.fallback==1){this.dataset.fallback=2;this.src='https://lh3.googleusercontent.com/d/1RJBsvtfYi76XpXmelFv2MVfMxsJo1RY6=s600';}
               else {this.removeAttribute('onerror'); this.alt='[Logo no disponible]';}" />

    <div class="header-info">
      <h1>REPORTE COMPLETO DE TARIFAS</h1>
      <p>Fecha de generación: ${new Date().toLocaleDateString('es-ES')}</p>
      <p>Total de tarifas: ${this.filteredFares.length}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>CÓDIGO</th>
        <th>NOMBRE</th>
        <th>TIPO</th>
        <th>MONTO</th>
        <th>ORGANIZACIÓN</th>
        <th>ESTADO</th>
      </tr>
    </thead>
    <tbody>
      ${this.filteredFares.map(fare => `
        <tr>
          <td>${fare.fareCode}</td>
          <td>${fare.fareName}</td>
          <td>${fare.fareType}</td>
          <td>S/. ${fare.fareAmount?.toFixed(2)}</td>
          <td>${this.getNameOrganization(fare.organizationId)}</td>
          <td><span class="status status-${fare.status.toLowerCase()}">${this.getStatusLabel(fare.status)}</span></td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>

    `;
  }

  private generatePDFSimple(htmlContent: string): void {
    try {
      // Crear un elemento temporal para renderizar el HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      document.body.appendChild(tempDiv);

      // Usar la API de impresión del navegador
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Esperar a que se cargue el contenido
        printWindow.onload = () => {
          printWindow.print();
          printWindow.close();
          
          // Limpiar el elemento temporal
          document.body.removeChild(tempDiv);
          
          console.log('✅ PDF generado exitosamente usando impresión del navegador');
        };
      } else {
        // Fallback: usar la función de impresión del navegador
        const printContent = htmlContent;
        const printFrame = document.createElement('iframe');
        printFrame.style.display = 'none';
        printFrame.src = 'data:text/html;charset=utf-8,' + encodeURIComponent(printContent);
        
        document.body.appendChild(printFrame);
        
        printFrame.onload = () => {
          printFrame.contentWindow?.print();
          
          // Limpiar después de un tiempo
          setTimeout(() => {
            document.body.removeChild(printFrame);
            document.body.removeChild(tempDiv);
          }, 1000);
          
          console.log('✅ PDF generado exitosamente usando iframe');
        };
      }

    } catch (error) {
      console.error('❌ Error en la generación del PDF:', error);
      Swal.fire('Error', 'Error al generar el PDF. Por favor, intente nuevamente.', 'error');
    }
  }

  editFare(fareId: string): void {
    this.router.navigate(['/admin/distribution/fares/edit', fareId]);
  }

  addNewFare(): void {
    this.router.navigate(['/admin/distribution/fares/new']);
  }

  getStatusClass(status: string): string {
    return status === Status.ACTIVE ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  }

  getStatusLabel(status: string): string {
    return status === Status.ACTIVE ? 'Activo' : 'Inactivo';
  }

  getActiveFareCount(): number {
    return this.fares.filter(f => f.status === Status.ACTIVE).length;
  }

  getInactiveFareCount(): number {
    return this.fares.filter(f => f.status === Status.INACTIVE).length;
  }

  getNameOrganization(organizationId: string): string {
    const org = this.organizations.find(o => o.organizationId === organizationId);
    return org ? org.organizationName : organizationId;
  }

  dismissAlert(): void {
    this.showAlert = false;
  }

  trackByFareId(index: number, fare: fares): string {
    return fare.id;
  }

  private showAlertMessage(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
    this.alertMessage = message;
    this.alertType = type;
    this.showAlert = true;

    setTimeout(() => {
      this.showAlert = false;
    }, 5000);
  }
}
