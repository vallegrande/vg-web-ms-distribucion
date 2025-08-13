import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { DistributionProgram } from '../../../../core/models/water-distribution.model';
import { DistributionService } from '../../../../core/services/distribution.service';
import { ProgramsService } from '../../../../core/services/water-distribution.service';
import { UserResponseDTO } from '../../../../core/models/user.model';
import { UserService } from '../../../../core/services/user.service';
import { organization } from '../../../../core/models/organization.model';
import { OrganizationService } from '../../../../core/services/organization.service';
import { routes, schedules } from '../../../../core/models/distribution.model';

@Component({
  selector: 'app-program-list',
  templateUrl: './program-list.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ProgramListComponent implements OnInit {
  programs: DistributionProgram[] = [];
  filteredPrograms: DistributionProgram[] = [];

  routes: routes[] = [];
  schedules: schedules[] = [];
  users: UserResponseDTO[] = [];
  organization: organization[] = [];

  // Mapas para búsquedas rápidas
  private organizationMap = new Map<string, string>();
  private routeMap = new Map<string, string>();
  private scheduleMap = new Map<string, string>();
  private userMap = new Map<string, string>();

  loading = false;
  showAlert = false;
  alertType: 'success' | 'error' | 'info' = 'info';
  alertMessage = '';
  searchTerm = '';
  selectedStatus = 'todos';

  constructor(
    private programsService: ProgramsService,
    private distributionService: DistributionService,
    private userService: UserService,
    private organizationService: OrganizationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPrograms();
    this.loadRoutes();
    this.loadSchedules();
    this.loadUsers();
    this.loadOrganizations();
  }

  private loadPrograms(): void {
    this.loading = true;
    this.programsService.getAllPrograms().subscribe({
      next: (programList) => {
        this.programs = programList;
        this.filteredPrograms = programList;
        this.loading = false;
      },
      error: (error) => {
        this.handleError('Error al cargar los programas', error);
        this.loading = false;
      }
    });
  }

  private loadRoutes(): void {
    this.distributionService.getAllR().subscribe({
      next: (data: routes[]) => {
        this.routes = data;
        this.routeMap.clear();
        data.forEach(r => this.routeMap.set(r.id, r.routeName));
      },
      error: (error: any) => console.error('Error al cargar rutas:', error)
    });
  }

  private loadSchedules(): void {
    this.distributionService.getAll().subscribe({
      next: (data: schedules[]) => {
        this.schedules = data;
        this.scheduleMap.clear();
        data.forEach(s => this.scheduleMap.set(s.id, s.scheduleName));
      },
      error: (error: any) => console.error('Error al cargar horarios:', error)
    });
  }

private loadUsers(): void {
  this.userService.getAllUsers().subscribe({
    next: (data: UserResponseDTO[]) => {
      console.log('Usuarios recibidos:', data); // Verifica estructura
      this.users = data;
      this.userMap.clear();

      data.forEach(u => {
        console.log('Mapeando usuario:', u.id, '->', u.fullName); // Asegúrate de usar 'id' si así viene del backend
        this.userMap.set(u.id, u.fullName); // Mapear correctamente
      });
    },
    error: (error: any) => console.error('Error al cargar usuarios:', error)
  });
}


  private loadOrganizations(): void {
    this.organizationService.getAllOrganization().subscribe({
      next: (data: organization[]) => {
        this.organization = data;
        this.organizationMap.clear();
        data.forEach(o => this.organizationMap.set(o.organizationId, o.organizationName));
      },
      error: (error: any) => console.error('Error al cargar organizaciones:', error)
    });
  }

  onSearch(): void {
    this.filterPrograms();
  }

  onStatusChange(): void {
    this.filterPrograms();
  }

  private filterPrograms(): void {
    this.filteredPrograms = this.programs.filter(program => {
      const matchesSearch = !this.searchTerm ||
        program.programCode.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesStatus = this.selectedStatus === 'todos' ||
        program.status === this.selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }

  getAcceptableProgramsCount(): number {
    return this.programs.filter(p => p.status === 'COMPLETED').length;
  }

  getWarningProgramsCount(): number {
    return this.programs.filter(p => p.status === 'IN_PROGRESS').length;
  }

  getCriticalProgramsCount(): number {
    return this.programs.filter(p => p.status === 'CANCELLED').length;
  }

getResponsibleName(responsibleUserId: string): string {
  const name = this.userMap.get(responsibleUserId);
  return name || responsibleUserId;
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

  getStatusText(status: string): string {
    switch (status) {
      case 'PLANNED': return 'PLANIFICADO';
      case 'IN_PROGRESS': return 'EN CURSO';
      case 'COMPLETED': return 'TERMINADO';
      case 'CANCELLED': return 'CANCELADO';
      default: return 'DESCONOCIDO';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PLANNED': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  viewProgramsDetail(id: string): void {
    console.log('👁️ Navegando a detalles del programa:', id);
    console.log('🔗 Ruta destino:', `/admin/distribution/programs/view/${id}`);
    this.router.navigate(['/admin/distribution/programs/view', id]);
  }

  updatePrograms(id: string): void {
    console.log('✏️ Navegando a editar programa:', id);
    console.log('🔗 Ruta destino:', `/admin/distribution/programs/edit/${id}`);
    this.router.navigate(['/admin/distribution/programs/edit', id]);
  }

  addNewPrograms(): void {
    this.router.navigate(['/admin/distribution/programs/new']);
  }

  trackByProgramsId(index: number, program: DistributionProgram): string {
    return program.id;
  }

  dismissAlert(): void {
    this.showAlert = false;
  }

  private handleError(message: string, error: any): void {
    console.error('Error:', error);
    this.showAlert = true;
    this.alertType = 'error';
    this.alertMessage = message;
  }
}
