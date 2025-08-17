import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { OrganizationService } from '../../../../../core/services/organization.service';
import { DistributionService } from '../../../../../core/services/distribution.service';
import { UserService } from '../../../../../core/services/user.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { routesUpdate, routesCreate } from '../../../../../core/models/distribution.model';
import { organization, zones } from '../../../../../core/models/organization.model';
import { UserResponseDTO } from '../../../../../core/models/user.model';
import { routes } from '../../../../../core/models/distribution.model';

@Component({
  selector: 'app-routes-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './routes-form.component.html',
  styleUrl: './routes-form.component.css'
})
export class RoutesFormComponent implements OnInit {
  routeForm: FormGroup;
  isEditMode: boolean = false;
  routeId: string = '';
  loading: boolean = false;
  organizations: organization[] = [];
  zones: zones[] = [];
  users: UserResponseDTO[] = [];
  private routeCode: string = '';
  public currentUser: any = null;

  constructor(
    private fb: FormBuilder,
    private organizationService: OrganizationService,
    private distributionService: DistributionService,
    private userService: UserService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.routeForm = this.fb.group({
      organizationId: ['', Validators.required],
      routeCode: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[A-Z0-9]+$/)
        ]
      ],
      routeName: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúÑñ][A-Za-zÁÉÍÓÚáéíóúÑñ ]*$/)
        ]
      ],
      responsibleUserId: ['', Validators.required],
      zones: this.fb.array([])
    });
  }

  ngOnInit(): void {
    // Obtener el usuario actual
    this.currentUser = this.authService.getCurrentUser();
    
    if (!this.currentUser) {
      Swal.fire('Error', 'Usuario no autenticado', 'error');
      this.router.navigate(['/auth/login']);
      return;
    }

    // Primero cargar los datos de referencia
    Promise.all([this.loadOrganizations(), this.loadZones(), this.loadUsers()])
      .then(() => {
        // Después de cargar los datos, verificar si es modo edición
        this.checkEditMode();
      })
      .catch(err => {
        console.error('Error inicial:', err);
        Swal.fire('Error', 'Error al cargar los datos iniciales', 'error');
      });
  }

  get routeZones(): FormArray {
    return this.routeForm.get('zones') as FormArray;
  }

  addZone(): void {
    // Asegurarse de que el FormArray esté inicializado
    if (!this.routeZones) {
      console.error('FormArray de zonas no está inicializado');
      return;
    }
    
    const zoneGroup = this.fb.group({
      zoneId: ['', Validators.required],
      order: [this.routeZones.length + 1, [Validators.required, Validators.min(1)]],
      estimatedDuration: [1, [Validators.required, Validators.min(0.5)]]
    });
    this.routeZones.push(zoneGroup);
  }

  removeZone(index: number): void {
    // Asegurarse de que el FormArray esté inicializado
    if (!this.routeZones || this.routeZones.length <= 1) {
      return;
    }
    
    this.routeZones.removeAt(index);
    // Reordenar los índices
    this.routeZones.controls.forEach((control, i) => {
      control.patchValue({ order: i + 1 });
    });
  }

  loadOrganizations(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.organizationService.getAllOrganization().subscribe({
        next: (data) => {
          this.organizations = data.filter(o => o.status === 'ACTIVE');
          resolve();
        },
        error: (err) => {
          console.error('Error al cargar organizaciones', err);
          Swal.fire('Error', 'No se pudieron cargar las organizaciones', 'error');
          reject(err);
        }
      });
    });
  }

  loadZones(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.organizationService.getAllZones().subscribe({
        next: (data) => {
          this.zones = data.filter(z => z.status === 'ACTIVE');
          resolve();
        },
        error: (err) => {
          console.error('Error al cargar zonas', err);
          Swal.fire('Error', 'No se pudieron cargar las zonas', 'error');
          reject(err);
        }
      });
    });
  }

  loadUsers(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.userService.getAllUsers().subscribe({
        next: (data) => {
          this.users = data;
          resolve();
        },
        error: (err) => {
          console.error('Error al cargar usuarios', err);
          Swal.fire('Error', 'No se pudieron cargar los usuarios', 'error');
          reject(err);
        }
      });
    });
  }

  checkEditMode() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.routeId = id;
      this.loadRoute(id);
    } else {
      // Establecer valores automáticos para nueva ruta
      this.setDefaultValues();
      // Agregar al menos una zona por defecto para nueva ruta
      this.addZone();
    }
  }

  setDefaultValues(): void {
    if (this.currentUser) {
      // Establecer organización automáticamente
      if (this.currentUser.organizationId) {
        this.routeForm.patchValue({
          organizationId: this.currentUser.organizationId
        });
      }
      
      // Establecer responsable automáticamente
      if (this.currentUser.id) {
        this.routeForm.patchValue({
          responsibleUserId: this.currentUser.id
        });
      }
    }
  }

  clearZones(): void {
    // Limpiar el array de zonas de forma segura
    if (!this.routeZones) {
      console.error('FormArray de zonas no está inicializado');
      return;
    }
    
    while (this.routeZones.length !== 0) {
      this.routeZones.removeAt(0);
    }
  }

  loadRoute(id: string) {
    this.loading = true;
    this.distributionService.getByIdR(id).subscribe({
      next: (route) => {
        this.routeCode = route.route_code || route.routeCode || '';
        
        // Limpiar el array de zonas existente de forma segura
        this.clearZones();

        // Agregar las zonas de la ruta
        if (route.zones && route.zones.length > 0) {
          // Ordenar las zonas por orden antes de agregarlas
          const sortedZones = [...route.zones].sort((a, b) => (a.order || 0) - (b.order || 0));
          
          sortedZones.forEach(zone => {
            const zoneGroup = this.fb.group({
              zoneId: [zone.zone_id || zone.zoneId || '', Validators.required],
              order: [zone.order || 1, [Validators.required, Validators.min(1)]],
              estimatedDuration: [zone.estimated_duration || zone.estimatedDuration || 1, [Validators.required, Validators.min(0.5)]]
            });
            this.routeZones.push(zoneGroup);
          });
        } else {
          // Si no hay zonas, agregar una por defecto
          this.addZone();
        }

        this.routeForm.patchValue({
          routeCode: route.route_code || route.routeCode || '',
          routeName: route.route_name || route.routeName || '',
          responsibleUserId: route.responsible_user_id || route.responsibleUserId || this.currentUser?.id || '',
          organizationId: route.organization_id || route.organizationId || this.currentUser?.organizationId || ''
        });
        
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar ruta:', err);
        this.loading = false;
        Swal.fire('Error', 'No se pudo cargar la ruta', 'error');
        this.router.navigate(['/admin/distribution/routes']);
      }
    });
  }

  onSubmit() {
    if (this.routeForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    const formData = this.routeForm.value;
    this.loading = true;

    // Calcular duración total
    const totalDuration = this.routeZones.controls.reduce((total, control) => {
      return total + (control.value.estimatedDuration || 0);
    }, 0);

    if (this.isEditMode) {
      const updateData: routesUpdate = {
        route_code: formData.routeCode || '',
        route_name: formData.routeName || '',
        zones: formData.zones.map((zone: any) => ({
          zone_id: zone.zoneId || '',
          order: zone.order || 1,
          estimated_duration: zone.estimatedDuration || 1
        })),
        total_estimated_duration: totalDuration,
        responsible_user_id: formData.responsibleUserId || this.currentUser?.id || ''
      };

      this.distributionService.updateRoutes(this.routeId, updateData).subscribe({
        next: () => {
          this.loading = false;
          Swal.fire('Éxito', 'Ruta actualizada correctamente', 'success').then(() => {
            this.router.navigate(['/admin/distribution/routes']);
          });
        },
        error: (err) => {
          console.error('Error al actualizar ruta:', err);
          this.loading = false;
          Swal.fire('Error', 'No se pudo actualizar la ruta', 'error');
        }
      });
    } else {
      const createData: routesCreate = {
        organization_id: formData.organizationId || this.currentUser?.organizationId || '',
        route_code: formData.routeCode || '',
        route_name: formData.routeName || '',
        zones: formData.zones.map((zone: any) => ({
          zone_id: zone.zoneId || '',
          order: zone.order || 1,
          estimated_duration: zone.estimatedDuration || 1
        })),
        total_estimated_duration: totalDuration,
        responsible_user_id: formData.responsibleUserId || this.currentUser?.id || ''
      };

      this.distributionService.saveRoutes(createData).subscribe({
        next: () => {
          this.loading = false;
          Swal.fire('Éxito', 'Ruta creada correctamente', 'success').then(() => {
            this.router.navigate(['/admin/distribution/routes']);
          });
        },
        error: (err) => {
          console.error('Error al crear ruta:', err);
          this.loading = false;
          Swal.fire('Error', 'No se pudo crear la ruta', 'error');
        }
      });
    }
  }

  markFormGroupTouched() {
    Object.values(this.routeForm.controls).forEach(control => {
      control.markAsTouched();
    });
  }

  cancel() {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Los cambios no guardados se perderán',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, salir',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.router.navigate(['/admin/distribution/routes']);
      }
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.routeForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['min']) return 'Debe ser un número mayor que 0';
      if (field.errors['pattern']) {
        if (fieldName === 'routeCode') return 'Solo letras mayúsculas y números. Debe comenzar con una letra.';
        return 'Solo letras y espacios. Debe comenzar con una letra.';
      }
    }
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.routeForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  trackByZoneIndex(index: number, item: any): number {
    return index;
  }

  calculateTotalDuration(): number {
    if (!this.routeZones || this.routeZones.length === 0) return 0;
    return this.routeZones.controls.reduce((total, control) => {
      return total + (control.value.estimatedDuration || 0);
    }, 0);
  }

  getOrganizationName(organizationId: string): string {
    if (!organizationId) return 'Sin organización';
    const org = this.organizations.find(o => o.organizationId === organizationId);
    return org ? org.organizationName : 'Organización desconocida';
  }
}
