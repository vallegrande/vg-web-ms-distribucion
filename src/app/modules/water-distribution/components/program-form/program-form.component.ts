import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DistributionProgram } from '../../../../core/models/water-distribution.model';
import { DistributionService } from '../../../../core/services/distribution.service';
import { User as ResponsibleUser, UserResponseDTO } from '../../../../core/models/user.model';
import { UserService } from '../../../../core/services/user.service';
import { organization as Organization } from '../../../../core/models/organization.model';
import { OrganizationService } from '../../../../core/services/organization.service';
import Swal from 'sweetalert2';
import { ProgramsService } from '../../../../core/services/water-distribution.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment.production';
import { zones, street } from '../../../../core/models/organization.model';
import { OrganizationContextService } from 'app/core/services/organization-context.service';
import { routes as Route, schedules as Schedule } from '../../../../core/models/distribution.model';
import { AuthService } from 'app/core/services/auth.service';

@Component({
  selector: 'app-program-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './program-form.component.html',
  styleUrls: ['./program-form.component.css']
})
export class ProgramFormComponent implements OnInit {
  programsForm: FormGroup;
  isEditMode = false;
  isViewMode = false;
  isSubmitting = false;
  programId: string | null = null;
  organizations: Organization[] = [];
  routes: Route[] = [];
  schedules: Schedule[] = [];
  responsible: UserResponseDTO[] = [];
  minDateTime: string = '';
  selectedOrganization: any = null; 
  zones: any[] = [];
  streets: any[] = [];

loadZonesByOrganization(orgId: string) {
  this.organizationService.getZoneById(orgId).subscribe({
    next: (zone) => {
      this.zones = [zone]; // Si solo devuelve una, la ponemos en array
    },
    error: (err) => console.error('Error al cargar zonas', err)
  });
}

loadStreetsByZone(zoneId: string) {
  this.organizationService.getStreetById(zoneId).subscribe({
    next: (street) => {
      this.streets = [street];
    },
    error: (err) => console.error('Error al cargar calles', err)
  });
}

loadRoutes(organizationId: string) {
  this.distributionService.getRoutesByOrganization(organizationId).subscribe({
    next: (data: Route[]) => this.routes = data,
    error: (err) => console.error("❌ Error cargando rutas:", err)
  });
}

loadSchedules(organizationId: string) {
  this.distributionService.getSchedulesByOrganization(organizationId).subscribe({
    next: (data: Schedule[]) => this.schedules = data,
    error: (err) => console.error("❌ Error cargando horarios:", err)
  });
}

loadResponsible(): void {
  this.userService.getUsersByOrganization().subscribe({
    next: (users) => {
      this.responsible = users;
    },
    error: (err) => console.error("Error cargando responsables:", err)
  });
}

constructor(
  private fb: FormBuilder,
  private route: ActivatedRoute,
  private router: Router,
  private http: HttpClient,
  private programsService: ProgramsService,
  private distributionService: DistributionService,
  private userService: UserService,
  private organizationService: OrganizationService,
  private organizationContextService: OrganizationContextService,
  private authService: AuthService 
) {
   this.programsForm = this.fb.group({
  programCode: ['', [Validators.required, Validators.maxLength(20)]],
  programDate: ['', Validators.required],
  plannedStartTime: ['', Validators.required],
  plannedEndTime: ['', Validators.required],
  actualStartTime: [''],
  actualEndTime: [''],
  organizationId: [{ value: '', disabled: true }, Validators.required],
  routeId: ['', Validators.required],
  scheduleId: ['', Validators.required],
  zoneId: ['', Validators.required],    
  streetId: ['', Validators.required],  
  responsibleUserId: ['', Validators.required],
  status: ['', Validators.required],
  observations: ['', [
    Validators.maxLength(300),
    Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúÑñ][A-Za-zÁÉÍÓÚáéíóúÑñ ]*$/)
  ]]
    });
  }
 
ngOnInit(): void {
  if (this.programId) {
    this.loadProgram(); // edición
  } else {
    this.loadInitialData(); // creación
    this.generateProgramCode();
    this.programsForm.patchValue({
      programDate: this.getTodayDateTime()
    });
  }
}



  private getTodayDateTime(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private generateProgramCode(): void {
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.programsForm.patchValue({ programCode: `PRG${random}` });
  }

  isFormValid(): boolean {
    return this.programsForm.valid;
  }

  getFieldError(fieldName: string): string {
    const field = this.programsForm.get(fieldName);
    if (!field || !field.errors) return '';
    if (field.errors['required']) return 'Este campo es requerido';
    if (field.errors['maxlength']) return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
    return 'Campo inválido';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.programsForm.get(fieldName);
    return !!(field && field.invalid && (field.touched || field.dirty));
  }

  onSubmit(): void {
  if (this.programsForm.invalid) {
    this.markFormGroupTouched(this.programsForm);
    return;
  }

  const orgId = this.authService.getCurrentOrganizationId();
  if (!orgId) {
    console.error('❌ No se encontró ID de organización');
    return;
  }

  this.isSubmitting = true;

  // Incluimos organizationId en la data enviada
  const formData: DistributionProgram = {
    ...this.prepareFormData(),
    organizationId: orgId
  };

  const request = this.isEditMode
    ? this.programsService.updateProgram(this.programId!, formData)
    : this.programsService.createProgram(formData);

  request.subscribe({
    next: () => {
      Swal.fire({
        icon: 'success',
        title: this.isEditMode ? 'Programa actualizado' : 'Programa creado',
        text: this.isEditMode
          ? 'El programa de distribución se actualizó correctamente.'
          : 'El programa de distribución se creó correctamente.',
        confirmButtonText: 'Aceptar'
      }).then(() => {
        this.router.navigate(['/admin/distribution/programs']);
      });
    },
    error: (error) => {
      this.isSubmitting = false;
      console.error('❌ Error al guardar programa:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un error al guardar el programa.',
        confirmButtonText: 'Cerrar'
      });
    }
  });
}

  goBack(): void {
    this.router.navigate(['/admin/programs']);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => control.markAsTouched());
  }

  private formatDateOnly(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  }

  private formatTimeOnly(datetime: string): string {
    if (!datetime) return '';
    const date = new Date(datetime);
    if (isNaN(date.getTime())) return '';
    return date.toTimeString().slice(0, 5);
  }

  private toDatetimeLocal(date: string, time: string = '00:00'): string {
    if (!date || !time) return '';
    return `${date}T${time}`;
  }

private prepareFormData(): any {
  const form = this.programsForm.getRawValue(); // 🔹 Incluye los disabled
  const programDate = this.formatDateOnly(form.programDate);
  const base = {
    programCode: form.programCode,
    programDate,
    plannedStartTime: this.formatTimeOnly(form.plannedStartTime),
    plannedEndTime: this.formatTimeOnly(form.plannedEndTime),
    actualStartTime: form.actualStartTime ? this.formatTimeOnly(form.actualStartTime) : null,
    actualEndTime: form.actualEndTime ? this.formatTimeOnly(form.actualEndTime) : null,
    organizationId: form.organizationId, // 🔹 Ahora sí lo obtienes
    routeId: form.routeId || null,
    scheduleId: form.scheduleId || null,
    responsibleUserId: form.responsibleUserId || null,
    status: form.status,
    observations: form.observations
  };
  return this.isEditMode ? { ...base, id: this.programId! } : base;
}

  private loadProgram(): void {
    this.programsService.getProgramById(this.programId!).subscribe({
      next: (program) => {
        const dateOnly = program.programDate;

        this.programsForm.patchValue({
          programCode: program.programCode,
          programDate: this.toDatetimeLocal(dateOnly),
          plannedStartTime: this.toDatetimeLocal(dateOnly, program.plannedStartTime),
          plannedEndTime: this.toDatetimeLocal(dateOnly, program.plannedEndTime),
          actualStartTime: program.actualStartTime ? this.toDatetimeLocal(dateOnly, program.actualStartTime) : '',
          actualEndTime: program.actualEndTime ? this.toDatetimeLocal(dateOnly, program.actualEndTime) : '',
          organizationId: program.organizationId,
          routeId: program.routeId,
          scheduleId: program.scheduleId,
          responsibleUserId: program.responsibleUserId,
          status: program.status,
          observations: program.observations
        });
        if (this.isViewMode) {
          this.programsForm.disable();
        }
      },
      error: (error) => {
        console.error('Error al cargar programa:', error);
      }
    });
  }

private loadInitialData(): void {
  const orgId = this.organizationContextService.getCurrentOrganizationId();
  if (!orgId) {
    console.warn('⚠ No hay organizationId en el contexto.');
    return;
  }

  this.organizationService.getOrganizationById(orgId).subscribe({
    next: (org) => {
      console.log('📌 Organización cargada:', org);

      this.selectedOrganization = org;
      this.organizations = [org];

      this.programsForm.patchValue({ organizationId: org.organizationId });
      this.programsForm.get('organizationId')?.disable();

      this.zones = (org as any).zones || [];
      if (this.zones.length > 0) {
        this.streets = this.zones[0].streets || [];
      }

      this.loadRoutes(org.organizationId);
      this.loadSchedules(org.organizationId);
      this.loadResponsible();
    },
    error: (err) => console.error('❌ Error cargando organización:', err)
  });
}

onOrganizationChange(orgId: string) {
  const org = this.organizations.find(o => o.organizationId === orgId);
  this.zones = (org as any)?.zones || [];
  this.streets = [];
  this.programsForm.patchValue({ zoneId: '', streetId: '' });
}

onZoneChange(zoneId: string) {
  const zone = this.zones.find(z => z.zoneId === zoneId);
  this.streets = (this.zones[0] as any)?.streets || [];
  this.programsForm.patchValue({ streetId: '' });
}
}