import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

import { DistributionService } from '../../../../../core/services/distribution.service';
import { OrganizationService } from '../../../../../core/services/organization.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { schedules } from '../../../../../core/models/distribution.model';
import { organization, zones } from '../../../../../core/models/organization.model';
import { Status } from '../../../../../core/models/payment.model';

@Component({
  selector: 'app-schedule-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './schedule-list.component.html'
})
export class ScheduleListComponent implements OnInit {
  schedules: schedules[] = [];
  filteredSchedules: schedules[] = [];
  organizations: organization[] = [];
  zones: zones[] = [];
  public currentUser: any = null;

  searchTerm: string = '';
  selectedStatus: string = 'activo';

  loading: boolean = false;
  showAlert: boolean = false;
  alertType: 'success' | 'error' | 'info' = 'success';
  alertMessage: string = '';

  constructor(
    private distributionService: DistributionService,
    private organizationService: OrganizationService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Obtener el usuario actual
    this.currentUser = this.authService.getCurrentUser();
    
    if (!this.currentUser) {
      Swal.fire('Error', 'Usuario no autenticado', 'error');
      this.router.navigate(['/auth/login']);
      return;
    }

    this.loadSchedules();
    this.loadOrganizations();
    this.loadZones();
  }

  loadSchedules(): void {
    this.loading = true;
    this.distributionService.getAll().subscribe({
      next: (data) => {
        this.schedules = Array.isArray(data) ? data : [];
        // Filtrar solo los horarios del usuario actual y su organización
        this.filterSchedulesByUser();
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar horarios', err);
        this.schedules = [];
        this.loading = false;
      }
    });
  }

  filterSchedulesByUser(): void {
    if (!this.currentUser) return;
    
    // Filtrar por organización del usuario actual
    this.schedules = this.schedules.filter(schedule => {
      const userOrgId = this.currentUser.organizationId;
      const scheduleOrgId = schedule.organizationId;
      
      return scheduleOrgId === userOrgId;
    });

    // Ordenar por código de horario (alfabéticamente)
    this.schedules.sort((a, b) => {
      const codeA = a.scheduleCode || '';
      const codeB = b.scheduleCode || '';
      return codeA.localeCompare(codeB);
    });
  }

  loadOrganizations(): void {
    this.organizationService.getAllOrganization().subscribe({
      next: (data) => {
        this.organizations = data.filter(o => o.status === 'ACTIVE');
      },
      error: (err) => {
        console.error('Error al cargar organizaciones', err);
        Swal.fire('Error', 'No se pudieron cargar las organizaciones', 'error');
      }
    });
  }

  loadZones(): void {
    this.organizationService.getAllZones().subscribe({
      next: (data) => {
        this.zones = data.filter(z => z.status === 'ACTIVE');
      },
      error: (err) => {
        console.error('Error al cargar zonas', err);
        Swal.fire('Error', 'No se pudieron cargar las zonas', 'error');
      }
    });
  }

  private applyFilters(): void {
    const searchTermLower = this.searchTerm.toLowerCase();

    this.filteredSchedules = this.schedules.filter(s => {
      const matchesSearch =
        s.scheduleCode.toLowerCase().includes(searchTermLower) ||
        s.scheduleName.toLowerCase().includes(searchTermLower);

      const matchesStatus =
        (this.selectedStatus === 'activo' && s.status === Status.ACTIVE) ||
        (this.selectedStatus === 'inactivo' && s.status === Status.INACTIVE);

      return matchesSearch && matchesStatus;
    });
  }

  onSearch(): void {
    this.applyFilters();
  }

  onStatusChange(): void {
    this.applyFilters();
  }

  // Funcionalidad de PDF
  downloadPDF(schedule: schedules): void {
    console.log('📄 Generando PDF para horario:', schedule.scheduleCode);
    
    try {
      const pdfContent = this.generatePDFContent(schedule);
      this.generatePDFSimple(pdfContent);
    } catch (error) {
      console.error('❌ Error en la generación del PDF:', error);
      Swal.fire('Error', 'Error al generar el PDF. Por favor, intente nuevamente.', 'error');
    }
  }

  downloadAllPDFs(): void {
    console.log('📄 Generando PDF masivo para todos los horarios');
    
    try {
      const pdfContent = this.generateAllPDFsContent();
      this.generatePDFSimple(pdfContent);
    } catch (error) {
      console.error('❌ Error en la generación del PDF masivo:', error);
      Swal.fire('Error', 'Error al generar el PDF masivo. Por favor, intente nuevamente.', 'error');
    }
  }

  private generatePDFContent(schedule: schedules): string {
    const organizationName = this.getNameOrganization(schedule.organizationId);
    const zoneName = this.getNameZone(schedule.zoneId);
    const statusText = this.getStatusLabel(schedule.status);
    
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Horario - ${schedule.scheduleCode}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root{
      --brand:#2563eb;
      --brand-2:#3b82f6;
      --success:#10b981;
      --danger:#ef4444;
      --muted:#6b7280;
      --bg:#f8fafc;
      --card:#ffffff;
      --border:#e5e7eb;
    }
    body{
      font-family:"Segoe UI",Roboto,Arial,sans-serif;
      margin:0;
      padding:32px;
      background:var(--bg);
      color:#111827;
      line-height:1.6;
    }
    .wrapper{max-width:880px;margin:0 auto}

    header.schedule-head{
      text-align:center;
      padding-bottom:20px;
      margin-bottom:28px;
      border-bottom:2px solid var(--brand);
    }
    header.schedule-head img.logo{
      max-height:70px;
      margin-bottom:12px;
    }
    header.schedule-head h1{
      margin:0;
      font-size:24px;
      color:#0f172a;
      text-transform:uppercase;
    }
    header.schedule-head h2{
      margin:8px 0 0;
      font-size:18px;
      color:var(--muted);
    }
    header.schedule-head p{
      margin:4px 0 0;
      font-size:13px;
      color:var(--muted);
    }

    .section{
      margin-bottom:24px;
      background:var(--card);
      border:1px solid var(--border);
      border-radius:14px;
      box-shadow:0 4px 12px rgba(0,0,0,.04);
      overflow:hidden;
      page-break-inside:avoid;
    }
    .section-title{
      background:linear-gradient(90deg,var(--brand),var(--brand-2));
      color:#fff;
      padding:12px 16px;
      font-weight:700;
      font-size:13px;
      text-transform:uppercase;
    }
    .section-body{padding:18px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
    .field{margin-bottom:15px}
    .label{font-weight:700;color:var(--muted);font-size:12px;text-transform:uppercase}
    .value{font-size:14px;margin-top:4px}

    .status{display:inline-block;padding:5px 10px;border-radius:999px;font-size:12px;font-weight:700}
    .status-active{background:#d1fae5;color:#065f46}
    .status-inactive{background:#fee2e2;color:#991b1b}

    @media print{
      body{
        padding:12mm;
        background:#fff;
        print-color-adjust:exact;
        -webkit-print-color-adjust:exact;
      }
      header.schedule-head{
        border-bottom:1px solid var(--border);
        margin-bottom:12px;
        padding-bottom:12px;
        background:#fff;
        position:static; /* ✅ evita corte del encabezado */
      }
      header.schedule-head img.logo{max-height:50px}
      .section{box-shadow:none}
      @page{size:A4;margin:20mm}
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <header class="schedule-head">
      <!-- Logo con múltiples rutas de respaldo para Google Drive -->
      <img
        class="logo"
        alt="Logo"
        src="https://drive.google.com/uc?export=view&id=1RJBsvtfYi76XpXmelFv2MVfMxsJo1RY6"
        style="height:64px;width:auto;object-fit:contain"
        onerror="if(!this.dataset.fallback){this.dataset.fallback=1;this.src='https://drive.google.com/thumbnail?id=1RJBsvtfYi76XpXmelFv2MVfMxsJo1RY6&sz=w600';}
                 else if(this.dataset.fallback==1){this.dataset.fallback=2;this.src='https://lh3.googleusercontent.com/d/1RJBsvtfYi76XpXmelFv2MVfMxsJo1RY6=s600';}
                 else {this.removeAttribute('onerror'); this.alt='[Logo no disponible]';}" />

      <h1>Información de Horario</h1>
      <h2>${schedule.scheduleCode}</h2>
      <p>Fecha de generación: ${new Date().toLocaleDateString('es-ES')}</p>
    </header>

    <section class="section">
      <div class="section-title">Información Básica</div>
      <div class="section-body grid">
        <div class="field">
          <div class="label">Código de Horario</div>
          <div class="value">${schedule.scheduleCode}</div>
        </div>
        <div class="field">
          <div class="label">Nombre de Horario</div>
          <div class="value">${schedule.scheduleName}</div>
        </div>
        <div class="field">
          <div class="label">Días de la Semana</div>
          <div class="value">${schedule.daysOfWeek}</div>
        </div>
        <div class="field">
          <div class="label">Estado</div>
          <div class="value"><span class="status status-${schedule.status.toLowerCase()}">${statusText}</span></div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-title">Horarios y Duración</div>
      <div class="section-body grid">
        <div class="field">
          <div class="label">Hora de Inicio</div>
          <div class="value">${schedule.startTime}h</div>
        </div>
        <div class="field">
          <div class="label">Hora de Fin</div>
          <div class="value">${schedule.endTime}h</div>
        </div>
        <div class="field">
          <div class="label">Duración</div>
          <div class="value">${schedule.durationHours}h</div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-title">Ubicación</div>
      <div class="section-body grid">
        <div class="field">
          <div class="label">Organización</div>
          <div class="value">${organizationName}</div>
        </div>
        <div class="field">
          <div class="label">Zona</div>
          <div class="value">${zoneName}</div>
        </div>
      </div>
    </section>
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
  <title>Reporte de Horarios</title>
  <style>
    :root{
      --brand:#2563eb;
      --brand-2:#3b82f6;
      --muted:#6b7280;
      --success:#10b981;
      --danger:#ef4444;
      --bg:#f8fafc;
      --border:#e5e7eb;
    }
    body{
      font-family:"Segoe UI",Roboto,Arial,sans-serif;
      margin:32px;
      background:var(--bg);
      color:#111827;
      line-height:1.6;
    }
    .header{
      text-align:center;
      border-bottom:2px solid var(--brand);
      padding-bottom:20px;
      margin-bottom:30px;
    }
    .header img.logo{
      max-height:70px;
      margin-bottom:10px;
    }
    .header h1{
      margin:0;
      font-size:24px;
      color:#0f172a;
    }
    .header p{
      margin:4px 0;
      font-size:13px;
      color:var(--muted);
    }

    table{
      width:100%;
      border-collapse:collapse;
      margin-top:20px;
      background:#fff;
      border-radius:10px;
      overflow:hidden;
      box-shadow:0 2px 6px rgba(0,0,0,.05);
    }
    th,td{
      border:1px solid var(--border);
      padding:10px 12px;
      text-align:left;
      font-size:13px;
    }
    th{
      background:linear-gradient(90deg,var(--brand),var(--brand-2));
      color:#fff;
      font-size:12px;
      text-transform:uppercase;
      letter-spacing:.5px;
    }
    tr:nth-child(even){
      background:#f9fafb;
    }

    .status{
      display:inline-block;
      padding:4px 10px;
      border-radius:12px;
      font-size:11px;
      font-weight:700;
    }
    .status-active{background:#d1fae5;color:#065f46}
    .status-inactive{background:#fee2e2;color:#991b1b}

    @media print{
      body{margin:0;padding:12mm;background:#fff;print-color-adjust:exact;-webkit-print-color-adjust:exact}
      .header img.logo{max-height:50px}
      table{box-shadow:none;border:1px solid var(--border)}
      th{color:#fff !important}
      @page{size:A4; margin:12mm}
    }
  </style>
</head>
<body>
  <div class="header">
    <!-- Logo con rutas de respaldo -->
    <img 
      class="logo"
      alt="Logo"
      src="https://drive.google.com/uc?export=view&id=1RJBsvtfYi76XpXmelFv2MVfMxsJo1RY6"
      style="height:64px;width:auto;object-fit:contain"
      onerror="if(!this.dataset.fallback){this.dataset.fallback=1;this.src='https://drive.google.com/thumbnail?id=1RJBsvtfYi76XpXmelFv2MVfMxsJo1RY6&sz=w600';}
               else if(this.dataset.fallback==1){this.dataset.fallback=2;this.src='https://lh3.googleusercontent.com/d/1RJBsvtfYi76XpXmelFv2MVfMxsJo1RY6=s600';}
               else {this.removeAttribute('onerror'); this.alt='[Logo no disponible]';}" />

    <h1>Reporte Completo de Horarios</h1>
    <p>Fecha de generación: ${new Date().toLocaleDateString('es-ES')}</p>
    <p>Total de horarios: ${this.filteredSchedules.length}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Código</th>
        <th>Nombre</th>
        <th>Días</th>
        <th>Inicio</th>
        <th>Fin</th>
        <th>Duración</th>
        <th>Organización</th>
        <th>Zona</th>
        <th>Estado</th>
      </tr>
    </thead>
    <tbody>
      ${this.filteredSchedules.map(schedule => `
        <tr>
          <td>${schedule.scheduleCode}</td>
          <td>${schedule.scheduleName}</td>
          <td>${schedule.daysOfWeek}</td>
          <td>${schedule.startTime}h</td>
          <td>${schedule.endTime}h</td>
          <td>${schedule.durationHours}h</td>
          <td>${this.getNameOrganization(schedule.organizationId)}</td>
          <td>${this.getNameZone(schedule.zoneId)}</td>
          <td><span class="status status-${schedule.status.toLowerCase()}">${this.getStatusLabel(schedule.status)}</span></td>
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
  
  

  getStatusLabel(status: string): string {
    return status === Status.ACTIVE ? 'Activo' : 'Inactivo';
  }

  deactivateSchedules(schedule: schedules): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: `¿Deseas eliminar el horario "${schedule.scheduleName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    }).then(result => {
      if (result.isConfirmed) {
        this.distributionService.deactivateSchedules(schedule.id).subscribe({
          next: () => {
            schedule.status = Status.INACTIVE;
            this.applyFilters();
            this.showAlertMessage(`Horario "${schedule.scheduleName}" eliminado correctamente`, 'success');
          },
          error: (err) => {
            console.error('Error al eliminar el horario:', err);
            this.showAlertMessage('Error al eliminar el horario', 'error');
          }
        });
      }
    });
  }

  activateSchedules(schedule: schedules): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: `¿Deseas restaurar el horario "${schedule.scheduleName}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, restaurar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d'
    }).then(result => {
      if (result.isConfirmed) {
        this.distributionService.activateSchedules(schedule.id).subscribe({
          next: () => {
            schedule.status = Status.ACTIVE;
            this.applyFilters();
            this.showAlertMessage(`Horario "${schedule.scheduleName}" restaurado correctamente`, 'success');
          },
          error: (err) => {
            console.error('Error al restaurar el horario:', err);
            this.showAlertMessage('Error al restaurar el horario', 'error');
          }
        });
      }
    });
  }

  private showAlertMessage(message: string, type: 'success' | 'error' | 'info'): void {
    this.alertMessage = message;
    this.alertType = type;
    this.showAlert = true;

    setTimeout(() => {
      this.showAlert = false;
    }, 5000);
  }

  dismissAlert(): void {
    this.showAlert = false;
  }

editSchedule(scheduleCode: string) {
  this.router.navigate(['/admin/distribution/schedule/edit', scheduleCode]);
}



addNewSchedule() {
  console.log('Navegando a formulario');
  this.router.navigate(['/admin/distribution/schedule/new']);
}


  getStatusClass(status: string): string {
    return status === Status.ACTIVE ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  }

  getNameZone(zoneId: string): string {
    if (!zoneId) return 'Sin zona';
    const zone = this.zones.find(z => z.zoneId === zoneId);
    return zone ? zone.zoneName : 'Zona desconocida';
  }

  getCurrentOrganizationName(): string {
    if (!this.currentUser?.organizationId) return 'Sin organización';
    const org = this.organizations.find(o => o.organizationId === this.currentUser.organizationId);
    return org ? org.organizationName : 'Organización desconocida';
  }

  getNameOrganization(id: string): string {
    const org = this.organizations.find(o => o.organizationId === id);
    return org?.organizationName ?? 'Org. desconocida';
  }

  trackByScheduleId(index: number, item: schedules): string {
    return item.scheduleCode;
  }

  getActiveSCount(): number {
    return this.schedules.filter(s => s.status === Status.ACTIVE).length;
  }

  getInactiveSCount(): number {
    return this.schedules.filter(s => s.status === Status.INACTIVE).length;
  }
}
