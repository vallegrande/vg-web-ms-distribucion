import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DistributionProgram } from '../../../../core/models/water-distribution.model';
import { ProgramsService } from '../../../../core/services/water-distribution.service';
import { UserResponseDTO } from '../../../../core/models/user.model';
import { UserService } from '../../../../core/services/user.service';
import { organization } from '../../../../core/models/organization.model';
import { OrganizationService } from '../../../../core/services/organization.service';
import { OrganizationResolverService } from '../../../../core/services/organization-resolver.service';
import { routes, schedules } from '../../../../core/models/distribution.model';
import { DistributionService } from '../../../../core/services/distribution.service';

@Component({
  selector: 'app-program-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './program-detail.component.html',
  styleUrl: './program-detail.component.css'
})
export class ProgramDetailComponent implements OnInit {
  program: DistributionProgram | null = null;
  loading = true;
  error: string | null = null;
  isDownloading = false;

  // Mapas para búsquedas rápidas
  private organizationMap = new Map<string, string>();
  private routeMap = new Map<string, string>();
  private scheduleMap = new Map<string, string>();
  private userMap = new Map<string, string>();
  private zoneMap = new Map<string, string>();
  private streetMap = new Map<string, string>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private programsService: ProgramsService,
    private distributionService: DistributionService,
    private userService: UserService,
    private organizationService: OrganizationService,
    private organizationResolver: OrganizationResolverService
  ) {}

  ngOnInit(): void {
    console.log('🚀 ProgramDetailComponent inicializado');
    console.log('🔗 URL actual:', this.router.url);
    
    const programId = this.route.snapshot.paramMap.get('id');
    console.log('🆔 ID del programa obtenido:', programId);
    
    if (programId) {
      console.log('📋 Cargando programa con ID:', programId);
      this.loadProgram(programId);
      this.loadSupportingData();
    } else {
      console.error('❌ No se encontró ID del programa');
      this.error = 'ID del programa no encontrado';
      this.loading = false;
    }
  }

  private loadProgram(programId: string): void {
    console.log('🔄 Iniciando carga del programa:', programId);
    
    this.programsService.getProgramById(programId).subscribe({
      next: (program) => {
        console.log('✅ Programa cargado exitosamente:', program);
        this.program = program;
        this.loading = false;
        
        // Cargar zonas y calles después de tener el programa
        this.loadZonesAndStreets();
      },
      error: (error) => {
        console.error('❌ Error al cargar programa:', error);
        this.error = 'Error al cargar el programa';
        this.loading = false;
      }
    });
  }

  private loadSupportingData(): void {
    // Cargar organizaciones
    this.organizationService.getAllOrganization().subscribe({
      next: (organizations) => {
        organizations.forEach(org => this.organizationMap.set(org.organizationId, org.organizationName));
      },
      error: (err) => console.error('Error loading organizations:', err)
    });

    // Cargar rutas
    this.distributionService.getAllR().subscribe({
      next: (routes) => {
        routes.forEach(route => this.routeMap.set(route.id, route.routeName || route.route_name || ''));
      },
      error: (err) => console.error('Error loading routes:', err)
    });

    // Cargar horarios
    this.distributionService.getAll().subscribe({
      next: (schedules) => {
        schedules.forEach(schedule => this.scheduleMap.set(schedule.id, schedule.scheduleName));
      },
      error: (err) => console.error('Error loading schedules:', err)
    });

    // Cargar usuarios
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        users.forEach(user => this.userMap.set(user.id, user.fullName));
      },
      error: (err) => console.error('Error loading users:', err)
    });

    // Cargar zonas y calles si hay un programa
    if (this.program) {
      this.loadZonesAndStreets();
    }
  }

  private loadZonesAndStreets(): void {
    if (!this.program?.organizationId) return;

    // Cargar zonas de la organización
    this.organizationResolver.getZonesByOrganization(this.program.organizationId).subscribe({
      next: (zones: any[]) => {
        zones.forEach((zone: any) => this.zoneMap.set(zone.zoneId, zone.zoneName));
        console.log('✅ Zonas cargadas:', zones.length);
      },
      error: (err: any) => console.error('Error loading zones:', err)
    });

    // Cargar calles si hay zona
    if (this.program.zoneId) {
      this.organizationResolver.getStreetsByZone(this.program.zoneId).subscribe({
        next: (streets: any[]) => {
          streets.forEach((street: any) => this.streetMap.set(street.streetId, street.streetName));
          console.log('✅ Calles cargadas:', streets.length);
        },
        error: (err: any) => console.error('Error loading streets:', err)
      });
    }
  }

  getOrganizationName(organizationId: string): string {
    return this.organizationMap.get(organizationId) || organizationId;
  }

  getRouteName(routeId: string): string {
    return this.routeMap.get(routeId) || routeId;
  }

  getScheduleName(scheduleId: string): string {
    return this.scheduleMap.get(scheduleId) || scheduleId;
  }

  getResponsibleName(responsibleUserId: string): string {
    return this.userMap.get(responsibleUserId) || responsibleUserId;
  }

  getZoneName(zoneId: string | null | undefined): string {
    if (!zoneId) return 'No especificada';
    return this.zoneMap.get(zoneId) || zoneId;
  }

  getStreetName(streetId: string | null | undefined): string {
    if (!streetId) return 'No especificada';
    return this.streetMap.get(streetId) || streetId;
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'PLANNED': return 'PLANIFICADO';
      case 'IN_PROGRESS': return 'EN PROGRESO';
      case 'COMPLETED': return 'COMPLETADO';
      case 'CANCELLED': return 'CANCELADO';
      default: return 'DESCONOCIDO';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PLANNED': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'COMPLETED': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'CANCELLED': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  }

  editProgram(): void {
    if (this.program) {
      console.log('🔄 Navegando a editar programa:', this.program.id);
      this.router.navigate(['/admin/distribution/programs/edit', this.program.id]);
    } else {
      console.error('❌ No hay programa para editar');
    }
  }

  downloadPDF(): void {
    if (!this.program) {
      console.error('❌ No hay programa para generar PDF');
      return;
    }

    console.log('📄 Generando PDF para programa:', this.program.programCode);
    
    this.isDownloading = true;
    
    try {
      // Crear el contenido HTML para el PDF
      const pdfContent = this.generatePDFContent();
      
      // Generar el PDF usando la API del navegador
      this.generatePDFSimple(pdfContent);
    } catch (error) {
      console.error('❌ Error en la generación del PDF:', error);
      this.isDownloading = false;
      alert('Error al generar el PDF. Por favor, intente nuevamente.');
    }
  }

  private generatePDFContent(): string {
    if (!this.program) return '';

    const programDate = this.program.programDate ? new Date(this.program.programDate).toLocaleDateString('es-ES') : 'Fecha no especificada';
    const createdAt = this.program.createdAt ? new Date(this.program.createdAt).toLocaleDateString('es-ES') : 'Fecha no especificada';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Programa de Distribución - ${this.program.programCode}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            color: #333; 
            line-height: 1.6;
          }
          .header { 
            text-align: center; 
            border-bottom: 2px solid #3b82f6; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
          }
          .section { 
            margin-bottom: 25px; 
            page-break-inside: avoid;
          }
          .section-title { 
            background: #f3f4f6; 
            padding: 10px; 
            font-weight: bold; 
            border-left: 4px solid #3b82f6; 
            margin-bottom: 15px; 
          }
          .grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 20px; 
          }
          .field { 
            margin-bottom: 15px; 
          }
          .label { 
            font-weight: bold; 
            color: #6b7280; 
            font-size: 12px; 
            text-transform: uppercase; 
          }
          .value { 
            font-size: 14px; 
            margin-top: 5px; 
          }
          .status { 
            display: inline-block; 
            padding: 5px 10px; 
            border-radius: 15px; 
            font-size: 12px; 
            font-weight: bold; 
          }
          .status-planned { background: #dbeafe; color: #1e40af; }
          .status-progress { background: #fef3c7; color: #92400e; }
          .status-completed { background: #d1fae5; color: #065f46; }
          .status-cancelled { background: #fee2e2; color: #991b1b; }
          .observations { 
            background: #f9fafb; 
            padding: 15px; 
            border-radius: 8px; 
            border-left: 4px solid #10b981; 
          }
          @media print {
            body { margin: 0; }
            .section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PROGRAMA DE DISTRIBUCIÓN DE AGUA</h1>
          <h2>${this.program.programCode}</h2>
          <p>Fecha de generación: ${new Date().toLocaleDateString('es-ES')}</p>
        </div>

        <div class="section">
          <div class="section-title">INFORMACIÓN BÁSICA</div>
          <div class="grid">
            <div class="field">
              <div class="label">Código del Programa</div>
              <div class="value">${this.program.programCode}</div>
            </div>
            <div class="field">
              <div class="label">Fecha del Programa</div>
              <div class="value">${programDate}</div>
            </div>
            <div class="field">
              <div class="label">Estado</div>
              <div class="value">
                <span class="status status-${this.program.status.toLowerCase()}">${this.getStatusText(this.program.status)}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">HORARIOS</div>
          <div class="grid">
            <div class="field">
              <div class="label">Hora Planificada Inicio</div>
              <div class="value">${this.program.plannedStartTime || '--:--'}</div>
            </div>
            <div class="field">
              <div class="label">Hora Planificada Fin</div>
              <div class="value">${this.program.plannedEndTime || '--:--'}</div>
            </div>
            <div class="field">
              <div class="label">Hora Real Inicio</div>
              <div class="value">${this.program.actualStartTime || '--:--'}</div>
            </div>
            <div class="field">
              <div class="label">Hora Real Fin</div>
              <div class="value">${this.program.actualEndTime || '--:--'}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">INFORMACIÓN DE UBICACIÓN</div>
          <div class="grid">
            <div class="field">
              <div class="label">Organización</div>
              <div class="value">${this.getOrganizationName(this.program.organizationId)}</div>
            </div>
            <div class="field">
              <div class="label">Zona</div>
              <div class="value">${this.getZoneName(this.program.zoneId)}</div>
            </div>
            <div class="field">
              <div class="label">Calle</div>
              <div class="value">${this.getStreetName(this.program.streetId)}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">RUTA Y HORARIO</div>
          <div class="grid">
            <div class="field">
              <div class="label">Ruta</div>
              <div class="value">${this.getRouteName(this.program.routeId)}</div>
            </div>
            <div class="field">
              <div class="label">Horario</div>
              <div class="value">${this.getScheduleName(this.program.scheduleId)}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">RESPONSABLE E INFORMACIÓN ADICIONAL</div>
          <div class="grid">
            <div class="field">
              <div class="label">Responsable</div>
              <div class="value">${this.getResponsibleName(this.program.responsibleUserId)}</div>
            </div>
            <div class="field">
              <div class="label">Fecha de Creación</div>
              <div class="value">${createdAt}</div>
            </div>
          </div>
          <div class="field" style="margin-top: 20px;">
            <div class="label">Observaciones</div>
            <div class="observations">${this.program.observations || 'Sin observaciones'}</div>
          </div>
        </div>
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
          this.isDownloading = false;
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
          this.isDownloading = false;
        };
      }

    } catch (error) {
      console.error('❌ Error en la generación del PDF:', error);
      this.isDownloading = false;
      alert('Error al generar el PDF. Por favor, intente nuevamente.');
    }
  }

  goBack(): void {
    this.router.navigate(['/admin/distribution/programs']);
  }
}
