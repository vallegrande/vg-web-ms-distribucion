import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { OrganizationService } from '../../../../../core/services/organization.service';
import { DistributionService } from '../../../../../core/services/distribution.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { schedulesUpdate, schedulesCreate } from '../../../../../core/models/distribution.model';
import { organization, zones } from '../../../../../core/models/organization.model';

@Component({
  selector: 'app-schedule-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './schedule-form.component.html',
  styleUrl: './schedule-form.component.css'
})
export class ScheduleFormComponent implements OnInit {
  scheduleForm: FormGroup;
  isEditMode: boolean = false;
  scheduleId: string = '';
  loading: boolean = false;
  organizations: organization[] = [];
  zones: zones[] = [];
  public currentUser: any = null;
  private scheduleCode: string = '';

  constructor(
    private fb: FormBuilder,
    private organizationService: OrganizationService,
    private distributionService: DistributionService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.scheduleForm = this.fb.group(
      {
        organizationId: ['', Validators.required],
        zoneId: ['', Validators.required],
        scheduleName: [
          '',
          [
            Validators.required,
            Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúÑñ][A-Za-zÁÉÍÓÚáéíóúÑñ ]*$/)
          ]
        ],
        daysOfWeek: [[], [Validators.required, Validators.minLength(1)]],
        startTime: ['', Validators.required],
        endTime: ['', Validators.required],
        durationHours: ['']
      },
      { validators: this.validateStartEndTime() }
    );
  }

  ngOnInit(): void {
    // Obtener el usuario actual
    this.currentUser = this.authService.getCurrentUser();
    
    if (!this.currentUser) {
      Swal.fire('Error', 'Usuario no autenticado', 'error');
      this.router.navigate(['/auth/login']);
      return;
    }

    Promise.all([this.loadOrganizations(), this.loadZones()])
      .then(() => this.checkEditMode())
      .catch(err => console.error('Error inicial:', err));
  }

  validateStartEndTime(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const startTime = group.get('startTime')?.value;
      const endTime = group.get('endTime')?.value;

      if (!startTime || !endTime) return null;

      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);

      const startTotal = startHour * 60 + startMin;
      const endTotal = endHour * 60 + endMin;

      return endTotal > startTotal ? null : { timeRangeInvalid: true };
    };
  }

  loadOrganizations(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.organizationService.getAllOrganization().subscribe({
        next: (data) => {
          // Filtrar solo la organización del usuario actual
          this.organizations = data.filter(o => 
            o.status === 'ACTIVE' && 
            o.organizationId === this.currentUser?.organizationId
          );
          
          // Si solo hay una organización, seleccionarla automáticamente
          if (this.organizations.length === 1) {
            this.scheduleForm.patchValue({
              organizationId: this.organizations[0].organizationId
            });
          }
          
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
          // Filtrar solo las zonas de la organización del usuario actual
          this.zones = data.filter(z => 
            z.status === 'ACTIVE' && 
            z.organizationId === this.currentUser?.organizationId
          );
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

  checkEditMode() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.scheduleId = id;
      this.loadSchedule(id);
    } else {
      // Para nuevos horarios, establecer automáticamente la organización del usuario
      if (this.currentUser?.organizationId && this.organizations.length > 0) {
        this.scheduleForm.patchValue({
          organizationId: this.currentUser.organizationId
        });
      }
    }
  }

  loadSchedule(id: string) {
    this.loading = true;
    this.distributionService.getByIdS(id).subscribe({
      next: (schedule) => {
        this.scheduleCode = schedule.scheduleCode;
        
        // Asegurarse de que las zonas estén cargadas antes de establecer el valor
        if (this.zones.length === 0) {
          this.loadZones().then(() => {
            this.scheduleForm.patchValue({
              scheduleName: schedule.scheduleName,
              daysOfWeek: schedule.daysOfWeek,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              durationHours: schedule.durationHours,
              organizationId: schedule.organizationId,
              zoneId: schedule.zoneId
            });
            this.loading = false;
          });
        } else {
          this.scheduleForm.patchValue({
            scheduleName: schedule.scheduleName,
            daysOfWeek: schedule.daysOfWeek,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            durationHours: schedule.durationHours,
            organizationId: schedule.organizationId,
            zoneId: schedule.zoneId
          });
          this.loading = false;
        }
      },
      error: () => {
        this.loading = false;
        Swal.fire('Error', 'No se pudo cargar el horario', 'error');
        this.router.navigate(['/admin/distribution/schedule']);
      }
    });
  }

  onCheckboxChange(event: Event) {
    const checkbox = event.target as HTMLInputElement;
    const value = checkbox.value;
    const daysArray: string[] = this.scheduleForm.get('daysOfWeek')?.value || [];

    if (checkbox.checked && !daysArray.includes(value)) {
      daysArray.push(value);
    } else if (!checkbox.checked) {
      const index = daysArray.indexOf(value);
      if (index > -1) daysArray.splice(index, 1);
    }

    this.scheduleForm.get('daysOfWeek')?.setValue(daysArray);
    this.scheduleForm.get('daysOfWeek')?.markAsTouched();
    this.scheduleForm.get('daysOfWeek')?.updateValueAndValidity();
  }

  isDayChecked(day: string): boolean {
    const selectedDays = this.scheduleForm.get('daysOfWeek')?.value || [];
    return selectedDays.includes(day);
  }

  getCurrentOrganizationName(): string {
    if (!this.currentUser?.organizationId) return 'Sin organización';
    const org = this.organizations.find(o => o.organizationId === this.currentUser.organizationId);
    return org ? org.organizationName : 'Organización desconocida';
  }

  onSubmit() {
    if (this.scheduleForm.invalid) {
      this.markFormGroupTouched();
      if (this.scheduleForm.errors?.['timeRangeInvalid']
) {
        Swal.fire('Error', 'La hora de fin debe ser posterior a la hora de inicio', 'warning');
      }
      return;
    }

    const formData = this.scheduleForm.value;
    this.loading = true;

    const [startHour, startMin] = formData.startTime.split(':').map(Number);
    const [endHour, endMin] = formData.endTime.split(':').map(Number);
    const duration = ((endHour * 60 + endMin) - (startHour * 60 + startMin)) / 60;

    this.scheduleForm.get('durationHours')?.setValue(duration);

    if (this.isEditMode) {
      const updateData: schedulesUpdate = {
        scheduleCode: this.scheduleCode,
        scheduleName: formData.scheduleName,
        daysOfWeek: formData.daysOfWeek,
        startTime: formData.startTime,
        endTime: formData.endTime,
        durationHours: duration,
        organizationId: formData.organizationId || this.currentUser?.organizationId,
        zoneId: formData.zoneId
      };

      this.distributionService.updateSchedules(this.scheduleId, updateData).subscribe({
        next: () => {
          this.loading = false;
          Swal.fire('Éxito', 'Horario actualizado correctamente', 'success').then(() => {
            this.router.navigate(['/admin/distribution/schedule']);
          });
        },
        error: () => {
          this.loading = false;
          Swal.fire('Error', 'No se pudo actualizar el horario', 'error');
        }
      });
    } else {
      const createData: schedulesCreate = {
        scheduleName: formData.scheduleName,
        daysOfWeek: formData.daysOfWeek,
        startTime: formData.startTime,
        endTime: formData.endTime,
        durationHours: duration,
        organizationId: formData.organizationId || this.currentUser?.organizationId,
        zoneId: formData.zoneId
      };

      this.distributionService.saveSchedules(createData).subscribe({
        next: () => {
          this.loading = false;
          Swal.fire('Éxito', 'Horario creado correctamente', 'success').then(() => {
            this.router.navigate(['/admin/distribution/schedule']);
          });
        },
        error: () => {
          this.loading = false;
          Swal.fire('Error', 'No se pudo crear el horario', 'error');
        }
      });
    }
  }

  markFormGroupTouched() {
    Object.values(this.scheduleForm.controls).forEach(control => {
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
        this.router.navigate(['/admin/distribution/schedule']);
      }
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.scheduleForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['min']) return 'Debe ser un número mayor que 0';
      if (field.errors['pattern']) return 'Solo letras y espacios. Debe comenzar con una letra.';
    }
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.scheduleForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }
}
