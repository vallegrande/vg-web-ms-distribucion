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
import { OrganizationResolverService } from 'app/core/services/organization-resolver.service';

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
  currentUser: any = null;
  error: string | null = null;

  loadZonesByOrganization(orgId: string) {
    console.log('🔄 Cargando zonas para organización:', orgId);
    this.organizationResolver.getZonesByOrganization(orgId).subscribe({
      next: (zones) => {
        this.zones = zones;
        console.log('📌 Zonas cargadas:', zones);
      },
      error: (err) => console.error('Error al cargar zonas', err)
    });
  }

  loadStreetsByZone(zoneId: string) {
    console.log('🔄 Cargando calles para zona:', zoneId);
    this.organizationResolver.getStreetsByZone(zoneId).subscribe({
      next: (streets) => {
        this.streets = streets;
        console.log('📌 Calles cargadas:', streets);
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
        console.log('👥 Usuarios cargados:', users);
        console.log('👤 Usuario actual:', this.currentUser);

        // Si no es modo edición, establecer el usuario actual como responsable por defecto
        if (!this.isEditMode && this.currentUser) {
          console.log('✅ Estableciendo usuario actual como responsable:', this.currentUser.id);
          this.programsForm.patchValue({ responsibleUserId: this.currentUser.id });
        }
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
    private authService: AuthService,
    private organizationResolver: OrganizationResolverService
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
    // Obtener el usuario actual
    this.currentUser = this.authService.getCurrentUser();
    console.log('👤 Usuario actual:', this.currentUser);

    // Detectar el modo basándose en la ruta
    const url = this.router.url;
    console.log('🔗 URL actual:', url);

    if (url.includes('/edit/')) {
      this.isEditMode = true;
      this.isViewMode = false;
      this.programId = this.route.snapshot.paramMap.get('id');
      console.log('✏️ Modo EDICIÓN detectado, ID:', this.programId);
    } else if (url.includes('/view/')) {
      this.isViewMode = true;
      this.isEditMode = false;
      this.programId = this.route.snapshot.paramMap.get('id');
      console.log('👁️ Modo VISTA detectado, ID:', this.programId);
    } else {
      // Modo creación
      this.isEditMode = false;
      this.isViewMode = false;
      this.programId = null;
      console.log('➕ Modo CREACIÓN detectado');
    }

    if (this.programId) {
      console.log('📋 Cargando programa existente...');
      this.loadProgram(); // edición o vista
    } else {
      console.log('🆕 Cargando datos para nuevo programa...');
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

    // Preparar los datos del formulario
    const formData = this.prepareFormData();
    console.log('📤 Datos del formulario a enviar:', formData);

    // Incluimos organizationId en la data enviada
    const finalData: DistributionProgram = {
      ...formData,
      organizationId: orgId
    };

    console.log('📤 Datos finales a enviar:', finalData);

    const request = this.isEditMode
      ? this.programsService.updateProgram(this.programId!, finalData)
      : this.programsService.createProgram(finalData);

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
    this.router.navigate(['/admin/distribution/programs']);
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
    console.log('📋 Valores del formulario:', form);

    const programDate = this.formatDateOnly(form.programDate);
    const base = {
      programCode: form.programCode,
      programDate,
      plannedStartTime: this.formatTimeOnly(form.plannedStartTime),
      plannedEndTime: this.formatTimeOnly(form.plannedEndTime),
      actualStartTime: form.actualStartTime ? this.formatTimeOnly(form.actualStartTime) : null,
      actualEndTime: form.actualEndTime ? this.formatTimeOnly(form.actualEndTime) : null,
      organizationId: form.organizationId,
      zoneId: form.zoneId || null,
      streetId: form.streetId || null,
      routeId: form.routeId || null,
      scheduleId: form.scheduleId || null,
      responsibleUserId: form.responsibleUserId || null,
      status: form.status,
      observations: form.observations
    };

    console.log('📋 Datos base preparados:', base);
    return this.isEditMode ? { ...base, id: this.programId! } : base;
  }

  private loadProgram(): void {
    if (!this.programId) return;

    this.programsService.getProgramById(this.programId).subscribe({
      next: (program) => {
        const dateOnly = program.programDate;
        console.log('📋 Programa cargado:', program);

        // Cargar datos de la organización, zonas y calles primero
        if (program.organizationId) {
          this.loadInitialData();

          // Usar setTimeout para dar tiempo a que se carguen los datos
          setTimeout(() => {
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
              zoneId: program.zoneId,
              streetId: program.streetId,
              responsibleUserId: program.responsibleUserId,
              status: program.status,
              observations: program.observations
            });

            // Si hay zonaId, cargar las calles correspondientes
            if (program.zoneId) {
              this.loadStreetsByZone(program.zoneId);
            }

            if (this.isViewMode) {
              this.programsForm.disable();
            }
          }, 500); // Esperar 500ms para que se carguen los datos
        }
      },
      error: (error) => {
        console.error('Error al cargar programa:', error);
        this.error = 'Error al cargar el programa';
      }
    });
  }

  private loadInitialData(): void {
    const orgId = this.authService.getCurrentOrganizationId();
    if (!orgId) {
      console.warn('⚠ No hay organizationId en el contexto.');
      return;
    }

    // Evitar cargar datos múltiples veces
    if (this.selectedOrganization && this.selectedOrganization.organizationId === orgId) {
      return;
    }

    console.log('🔄 Cargando datos iniciales para organización:', orgId);

    this.organizationService.getOrganizationById(orgId).subscribe({
      next: (org) => {
        console.log('📌 Organización cargada:', org);

        this.selectedOrganization = org;
        this.organizations = [org];

        this.programsForm.patchValue({ organizationId: org.organizationId });
        this.programsForm.get('organizationId')?.disable();

        // Cargar zonas de la organización
        this.loadZonesByOrganization(org.organizationId);

        this.loadRoutes(org.organizationId);
        this.loadSchedules(org.organizationId);
        this.loadResponsible();
      },
      error: (err) => {
        console.error('❌ Error cargando organización:', err);
        this.error = 'Error al cargar la organización';
      }
    });
  }

  onOrganizationChange(orgId: string) {
    this.loadZonesByOrganization(orgId);
    this.streets = [];
    this.programsForm.patchValue({ zoneId: '', streetId: '' });
  }

  onZoneChange(zoneId: string | null) {
    console.log('🔄 Cambio de zona:', zoneId);
    if (zoneId && zoneId !== '') {
      this.loadStreetsByZone(zoneId);
    } else {
      this.streets = [];
    }
    this.programsForm.patchValue({ streetId: '' });
  }
}
