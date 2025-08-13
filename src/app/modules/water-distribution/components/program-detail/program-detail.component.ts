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
        routes.forEach(route => this.routeMap.set(route.id, route.routeName));
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
      this.router.navigate(['/admin/distribution/programs/edit', this.program.id]);
    }
  }

  goBack(): void {
    this.router.navigate(['/admin/distribution/programs']);
  }
}
