import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { UserService } from '../../../../core/services/user.service';
import { OrganizationResolverService, OrganizationData, ZoneData, StreetData } from '../../../../core/services/organization-resolver.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ReniecService } from '../../../../core/services/reniec.service';
import {
  UserCreateDTO,
  UserResponseDTO,
  UserUpdateDTO,
  DocumentType,
  RolesUsers,
  StatusUsers
} from '../../../../core/models/user.model';

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './client-form.component.html',
  styleUrl: './client-form.component.css'
})
export class ClientFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  clientForm!: FormGroup;
  isEditMode = false;
  isLoading = false;
  isSaving = false;
  clientId: string | null = null;
  isFormInitialized = false;

  DocumentType = DocumentType;

  // Datos para los selectores
  organizations: OrganizationData[] = [];
  zones: ZoneData[] = [];
  streets: StreetData[] = [];
  loadingStreets = false;

  // Estados para RENIEC
  isConsultingReniec = false;
  reniecDataFound = false;

  errors: any = {};

  /**
   * Obtener zonas filtradas por organización
   */
  get filteredZones(): ZoneData[] {
    // Ya están filtradas desde el servicio por la organización actual
    return this.zones;
  }

  /**
   * Obtener calles filtradas por zona
   */
  get filteredStreets(): StreetData[] {
    const zoneId = this.clientForm.get('zoneId')?.value;
    if (!zoneId) return [];
    return this.streets.filter(street => street.zoneId === zoneId);
  }

  passwordStrength = {
    hasLowercase: false,
    hasUppercase: false,
    hasNumber: false,
    hasSpecial: false,
    isValidLength: false
  };

  // Control de visibilidad de contraseñas
  showPassword = false;
  showConfirmPassword = false; constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private userService: UserService,
    private organizationResolver: OrganizationResolverService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private reniecService: ReniecService
  ) {
  } ngOnInit(): void {
    this.clientId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.clientId;

    this.initializeForm();
    this.loadOrganizationData();
    this.isFormInitialized = true;

    if (this.isEditMode && this.clientId) {
      this.loadClient(this.clientId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Cargar datos de organizaciones, zonas y calles
   */
  private loadOrganizationData(): void {
    const currentOrganizationId = this.authService.getCurrentOrganizationId();

    if (!currentOrganizationId) {
      console.error('❌ No se encontró organizationId del usuario actual');
      this.notificationService.error(
        'Error de sesión',
        'No se pudo obtener la organización del usuario actual'
      );
      return;
    }

    // Cargar la organización específica del usuario
    console.log('🔄 Cargando organización actual:', currentOrganizationId);
    this.organizationResolver.getAllOrganizations().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (organizations) => {
        // Filtrar solo la organización del usuario actual
        this.organizations = organizations.filter(org => org.organizationId === currentOrganizationId);
        console.log('✅ Organización cargada:', this.organizations);

        if (this.organizations.length === 0) {
          console.error('❌ No se encontró la organización del usuario');
          this.notificationService.error(
            'Error',
            'No se encontró información de la organización del usuario'
          );
        }
      },
      error: (error) => {
        console.error('❌ Error loading organization:', error);
        this.notificationService.error(
          'Error',
          'No se pudo cargar la información de la organización'
        );
      }
    });

    // Cargar zonas de la organización específica
    console.log('🔄 Cargando zonas de la organización:', currentOrganizationId);
    this.organizationResolver.getZonesByOrganization(currentOrganizationId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (zones) => {
        console.log('✅ Zonas cargadas:', zones);
        this.zones = zones;
      },
      error: (error) => {
        console.error('❌ Error loading zones:', error);
        this.notificationService.error(
          'Error',
          'No se pudieron cargar las zonas de la organización'
        );
      }
    });

    // Cargar todas las calles (se filtrarán por zona cuando se seleccione)
    this.organizationResolver.getAllStreets().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (streets) => {
        this.streets = streets;
        console.log('✅ Calles cargadas:', streets.length);
      },
      error: (error) => {
        console.error('❌ Error loading streets:', error);
        this.notificationService.error(
          'Error',
          'No se pudieron cargar las calles'
        );
      }
    });
  }
  /**
   * Inicializar formulario
   */
  private initializeForm(): void {
    this.clientForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50), this.nameValidator]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50), this.nameValidator]],
      documentType: [DocumentType.DNI, Validators.required],
      documentNumber: ['', [Validators.required, this.documentNumberValidator.bind(this)]],

      email: ['', [Validators.required, Validators.email, this.emailValidator]],
      phone: ['', [Validators.required, this.phoneValidator]],

      organizationId: ['', Validators.required],
      streetAddress: ['', [Validators.required, Validators.maxLength(200)]],
      streetId: ['', Validators.required],
      zoneId: ['', Validators.required],

      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
      password: ['', [Validators.required, this.passwordValidator]],
      confirmPassword: ['', Validators.required]
    });

    // Inicializar controles disabled - solo organización bloqueada
    this.clientForm.get('organizationId')?.disable();

    // Preseleccionar la organización del usuario actual
    const currentOrganizationId = this.authService.getCurrentOrganizationId();
    if (currentOrganizationId) {
      this.clientForm.patchValue({
        organizationId: currentOrganizationId
      });
    }

    if (this.isEditMode) {
      // En modo edición: bloquear username, firstName y lastName para no permitir cambios
      this.clientForm.get('username')?.disable();
      this.clientForm.get('firstName')?.disable();
      this.clientForm.get('lastName')?.disable();

      // Remover validaciones de password ya que no se editarán
      this.clientForm.removeControl('password');
      this.clientForm.removeControl('confirmPassword');
    } else {
      this.clientForm.addValidators(this.passwordMatchValidator.bind(this));

      this.clientForm.get('password')?.valueChanges.pipe(
        takeUntil(this.destroy$)
      ).subscribe(password => {
        this.updatePasswordStrength(password || '');
      });
    }

    // Configurar listener para cambios en DNI (tanto para crear como editar)
    this.clientForm.get('documentNumber')?.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(800), // Esperar 800ms después de que el usuario deje de escribir
      distinctUntilChanged()
    ).subscribe(dni => {
      // Solo consultar automáticamente si es DNI válido y el tipo de documento es DNI
      if (this.clientForm.get('documentType')?.value === 'DNI' &&
        dni &&
        dni.length === 8 &&
        /^\d{8}$/.test(dni)) {
        console.log('🔍 DNI válido detectado, consultando automáticamente:', dni);
        this.consultReniecIfDniValid(dni);
      }
    });

    this.clientForm.get('documentType')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      const documentNumberControl = this.clientForm.get('documentNumber');
      if (documentNumberControl) {
        documentNumberControl.updateValueAndValidity();
      }
    });

    // Limpiar calle cuando cambie la zona y cargar nuevas calles
    this.clientForm.get('zoneId')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe((zoneId) => {
      console.log('🔄 Cambio de zona detectado:', zoneId);

      // Limpiar calle seleccionada
      this.clientForm.patchValue({
        streetId: ''
      });

      // Cargar calles de la nueva zona
      if (zoneId) {
        this.loadingStreets = true;
        this.organizationResolver.getStreetsByZone(zoneId).subscribe({
          next: (streets) => {
            this.streets = streets;
            this.loadingStreets = false;
            console.log('✅ Calles cargadas para zona:', zoneId, streets);
          },
          error: (error) => {
            console.error('❌ Error al cargar calles por zona:', error);
            this.streets = [];
            this.loadingStreets = false;
          }
        });
      } else {
        this.streets = [];
        this.loadingStreets = false;
      }
    });
  }
  /**
   * Validador para nombres y apellidos (solo letras y espacios)
   */
  private nameValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const namePattern = /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]+$/;
    if (!namePattern.test(value)) {
      return { invalidName: true };
    }
    return null;
  }
  /**
   * Validador para número de documento según tipo
   */
  private documentNumberValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    if (!this.clientForm) return null;

    const documentType = this.clientForm.get('documentType')?.value;

    if (documentType === DocumentType.DNI) {
      const dniPattern = /^\d{8}$/;
      if (!dniPattern.test(value)) {
        return { invalidDni: true };
      }
    } else if (documentType === DocumentType.CARNET_EXTRANJERIA) {
      const carnetPattern = /^[a-zA-Z0-9]{1,20}$/;
      if (!carnetPattern.test(value)) {
        return { invalidCarnet: true };
      }
    }

    return null;
  }

  /**
   * Validador mejorado para email
   */
  private emailValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(value)) {
      return { invalidEmailFormat: true };
    }

    return null;
  }

  /**
   * Validador para teléfono (debe empezar con 9)
   */
  private phoneValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const phonePattern = /^9\d{8}$/;
    if (!phonePattern.test(value)) {
      return { invalidPhone: true };
    }

    return null;
  }

  /**
   * Validador para contraseña con patrón específico
   */
  private passwordValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[\s\S]+$/;
    if (!passwordPattern.test(value)) {
      return { invalidPasswordPattern: true };
    }

    if (value.length < 8) {
      return { minLength: { requiredLength: 8, actualLength: value.length } };
    }

    return null;
  }

  /**
   * Actualizar indicadores de fortaleza de contraseña
   */
  private updatePasswordStrength(password: string): void {
    this.passwordStrength = {
      hasLowercase: /[a-z]/.test(password),
      hasUppercase: /[A-Z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecial: /[\W_]/.test(password),
      isValidLength: password.length >= 8
    };
  }

  /**
   * Obtener el número de criterios cumplidos de la contraseña
   */
  get passwordCriteriaCount(): number {
    const { hasLowercase, hasUppercase, hasNumber, hasSpecial, isValidLength } = this.passwordStrength;
    return [hasLowercase, hasUppercase, hasNumber, hasSpecial, isValidLength].filter(Boolean).length;
  }

  /**
   * Obtener clase CSS para la barra de fortaleza
   */
  get passwordStrengthClass(): string {
    const count = this.passwordCriteriaCount;
    if (count <= 1) return 'bg-red-500';
    if (count <= 2) return 'bg-orange-500';
    if (count <= 3) return 'bg-yellow-500';
    if (count <= 4) return 'bg-blue-500';
    return 'bg-green-500';
  }

  /**
   * Obtener texto de fortaleza de contraseña
   */
  get passwordStrengthText(): string {
    const count = this.passwordCriteriaCount;
    if (count <= 1) return 'Muy débil';
    if (count <= 2) return 'Débil';
    if (count <= 3) return 'Regular';
    if (count <= 4) return 'Fuerte';
    return 'Muy fuerte';
  }

  /**
   * Validador de coincidencia de passwords
   */
  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const formGroup = control as FormGroup;
    const password = formGroup.get('password');
    const confirmPassword = formGroup.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }  /**
   * Cargar datos del cliente
   */
  private loadClient(clientId: string): void {
    this.isLoading = true;

    this.userService.getUserById(clientId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (client) => {
        this.populateForm(client);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading client:', error);
        this.isLoading = false;
        this.router.navigate(['/admin/users']);
      }
    });
  }

  /**
   * Poblar formulario con datos del cliente
   */
  private populateForm(client: UserResponseDTO): void {
    console.log('🔄 Poblando formulario con datos del cliente:', client);

    // Primero asignar todos los datos básicos
    this.clientForm.patchValue({
      firstName: client.firstName,
      lastName: client.lastName,
      documentType: client.documentType,
      documentNumber: client.documentNumber,
      email: client.email,
      phone: client.phone,
      organizationId: client.organizationId,
      streetAddress: client.streetAddress,
      username: client.username
    });

    // Asignar zona inmediatamente
    if (client.zoneId) {
      this.clientForm.patchValue({ zoneId: client.zoneId });
      console.log('✅ Zona asignada:', client.zoneId);
    }

    // Para la calle, necesitamos asegurar que las calles estén cargadas
    if (client.streetId) {
      // Si las calles ya están cargadas, asignar directamente
      if (this.streets.length > 0) {
        this.clientForm.patchValue({ streetId: client.streetId });
        console.log('✅ Calle asignada inmediatamente:', client.streetId);
      } else {
        // Si no están cargadas, esperar a que se carguen
        console.log('⏳ Esperando que se carguen las calles para asignar:', client.streetId);
        const streetSubscription = this.organizationResolver.getAllStreets().subscribe({
          next: (streets) => {
            this.streets = streets;
            console.log('✅ Calles cargadas, asignando calle:', client.streetId);
            this.clientForm.patchValue({ streetId: client.streetId });
            streetSubscription.unsubscribe(); // Desuscribirse después de usar
          },
          error: (error) => {
            console.error('❌ Error cargando calles para asignación:', error);
            streetSubscription.unsubscribe();
          }
        });
      }
    }
  }

  /**
   * Obtener organizationId del usuario actual
   */
  private getCurrentOrganizationId(): string {
    const organizationId = this.authService.getCurrentOrganizationId();
    if (!organizationId) {
      throw new Error('No se encontró ID de organización');
    }
    return organizationId;
  }

  /**
   * Enviar formulario
   */
  onSubmit(): void {
    if (this.clientForm.valid) {
      this.isSaving = true;
      this.errors = {};

      if (this.isEditMode) {
        this.updateClient();
      } else {
        this.createClient();
      }
    } else {
      this.markFormGroupTouched(this.clientForm);
    }
  }

  /**
   * Crear nuevo cliente
   */
  private createClient(): void {
    // Usar getRawValue() para obtener también los campos deshabilitados (RENIEC)
    const formValue = this.clientForm.getRawValue();

    // Obtener organizationId del control deshabilitado
    const organizationId = this.clientForm.get('organizationId')?.value || this.getCurrentOrganizationId();

    const clientData: UserCreateDTO = {
      organizationId: organizationId,
      documentType: formValue.documentType,
      documentNumber: formValue.documentNumber,
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      phone: formValue.phone,
      streetAddress: formValue.streetAddress,
      streetId: formValue.streetId,
      zoneId: formValue.zoneId,
      username: formValue.username,
      password: formValue.password,
      roles: [RolesUsers.CLIENT]
    };

    console.log('🚀 Enviando datos del cliente:', clientData); this.userService.createUser(clientData).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.isSaving = false;
        this.notificationService.success(
          'Cliente creado',
          `El cliente ${response.fullName} ha sido creado exitosamente`
        );
        this.router.navigate(['/admin/users']);
      },
      error: (error) => {
        this.isSaving = false;
        this.notificationService.error(
          'Error al crear cliente',
          'No se pudo crear el cliente. Verifique los datos e inténtelo nuevamente.'
        );
        this.handleError(error);
      }
    });
  }
  /**
   * Actualizar cliente existente
   */
  private updateClient(): void {
    if (!this.clientId) return;

    const formValue = this.clientForm.value;

    // Obtener organizationId del control deshabilitado
    const organizationId = this.clientForm.get('organizationId')?.value || this.getCurrentOrganizationId();

    const updateData: UserUpdateDTO = {
      organizationId: organizationId,
      documentType: formValue.documentType,
      documentNumber: formValue.documentNumber,
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      phone: formValue.phone,
      streetAddress: formValue.streetAddress,
      streetId: formValue.streetId,
      zoneId: formValue.zoneId,
      username: formValue.username,
      roles: [RolesUsers.CLIENT]
    }; this.userService.updateUser(this.clientId, updateData).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.isSaving = false;
        this.notificationService.success(
          'Cliente actualizado',
          `El cliente ${response.fullName} ha sido actualizado exitosamente`
        );
        this.router.navigate(['/admin/users']);
      },
      error: (error) => {
        this.isSaving = false;
        this.notificationService.error(
          'Error al actualizar cliente',
          'No se pudo actualizar el cliente. Verifique los datos e inténtelo nuevamente.'
        );
        this.handleError(error);
      }
    });
  }

  /**
   * Manejar errores
   */
  private handleError(error: any): void {
    console.error('Error saving client:', error);

    if (error.error && error.error.errors) {
      this.errors = error.error.errors;
    } else if (error.error && error.error.message) {
      this.errors = { general: error.error.message };
    } else {
      this.errors = { general: 'Ocurrió un error inesperado' };
    }
  }

  /**
   * Marcar todos los campos como tocados
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();

      if ((control as any).controls) {
        this.markFormGroupTouched(control as FormGroup);
      }
    });
  }

  /**
   * Verificar si un campo tiene error
   */
  hasError(fieldName: string): boolean {
    const field = this.clientForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
  /**
   * Obtener mensaje de error para un campo
   */
  getErrorMessage(fieldName: string): string {
    const field = this.clientForm.get(fieldName);

    if (field && field.errors) {
      if (field.errors['required']) {
        return 'Este campo es requerido';
      }
      if (field.errors['email']) {
        return 'Ingrese un email válido';
      }
      if (field.errors['invalidEmailFormat']) {
        return 'El formato del email no es válido';
      }
      if (field.errors['minlength']) {
        return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      }
      if (field.errors['maxlength']) {
        return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
      }
      if (field.errors['pattern']) {
        return 'Formato inválido';
      }
      if (field.errors['invalidName']) {
        return 'Solo se permiten letras y espacios';
      }
      if (field.errors['invalidDni']) {
        return 'El DNI debe tener exactamente 8 dígitos';
      }
      if (field.errors['invalidCarnet']) {
        return 'El carnet debe tener entre 1 y 20 caracteres alfanuméricos';
      }
      if (field.errors['invalidPhone']) {
        return 'El teléfono debe empezar con 9 y tener 9 dígitos';
      }
      if (field.errors['invalidPasswordPattern']) {
        return 'La contraseña debe tener al menos una minúscula, una mayúscula, un número y un símbolo';
      }
    }

    if (this.clientForm.errors && this.clientForm.errors['passwordMismatch'] && fieldName === 'confirmPassword') {
      return 'Las contraseñas no coinciden';
    }

    return '';
  }
  /**
   * Cancelar y volver
   */
  onCancel(): void {
    this.router.navigate(['/admin/clients']);
  }

  /**
   * Obtener título de la página
   */
  get pageTitle(): string {
    return this.isEditMode ? 'Editar Cliente' : 'Nuevo Cliente';
  }

  /**
   * Obtener texto del botón
   */
  get submitButtonText(): string {
    if (this.isSaving) {
      return this.isEditMode ? 'Actualizando...' : 'Creando...';
    }
    return this.isEditMode ? 'Actualizar Cliente' : 'Crear Cliente';
  }

  /**
   * Consultar RENIEC si el DNI es válido
   */
  private consultReniecIfDniValid(documentNumber: string): void {
    // Solo consultar si es modo creación y el tipo de documento es DNI
    if (this.isEditMode) return;

    const documentType = this.clientForm.get('documentType')?.value;
    if (documentType !== DocumentType.DNI) return;

    // Validar que el DNI tenga el formato correcto (8 dígitos)
    if (!documentNumber || documentNumber.length !== 8 || !/^\d{8}$/.test(documentNumber)) {
      this.reniecDataFound = false;
      return;
    }

    // Evitar consultas si ya estamos consultando
    if (this.isConsultingReniec) return;

    // Mostrar notificación de consulta automática
    this.notificationService.info(
      'Consultando RENIEC',
      `Verificando DNI ${documentNumber} automáticamente...`,
      3000
    );

    // Consultar en RENIEC (permitir todos los DNIs, el manejo de errores mostrará mensajes apropiados)
    this.consultReniec(documentNumber);
  }

  /**
   * Consultar datos en RENIEC
   */
  private consultReniec(dni: string): void {
    this.isConsultingReniec = true;
    this.reniecDataFound = false;

    console.log('🔍 Consultando RENIEC para DNI:', dni);

    this.reniecService.getPersonalDataByDni(dni).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (personalData) => {
        console.log('✅ Datos de RENIEC obtenidos:', personalData);
        this.populateFormWithReniecData(personalData);
        this.reniecDataFound = true;
        this.isConsultingReniec = false;

        this.notificationService.success(
          'Datos encontrados',
          `Se han cargado los datos de ${personalData.fullName} desde RENIEC`
        );
      },
      error: (error) => {
        console.error('❌ Error completo consultando RENIEC:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error error:', error.error);

        this.isConsultingReniec = false;
        this.reniecDataFound = false;

        // Analizar el tipo de error y mostrar mensaje específico
        let title = 'Error en RENIEC';
        let message = 'No se pudo consultar los datos de RENIEC';

        // Verificar si hay información del error HTTP
        if (error.status) {
          switch (error.status) {
            case 404:
              title = 'DNI no encontrado';
              message = `No se encontraron datos para el DNI ${dni} en RENIEC. Verifique que el número sea correcto.`;
              break;
            case 400:
              title = 'DNI inválido';
              message = 'El formato del DNI no es válido. Debe contener exactamente 8 dígitos.';
              break;
            case 500:
              title = 'Servicio no disponible';
              message = 'El servicio de RENIEC no está disponible en este momento. Intente más tarde.';
              break;
            case 503:
              title = 'Servicio temporalmente no disponible';
              message = 'RENIEC está experimentando problemas temporales. Intente nuevamente en unos minutos.';
              break;
            default:
              title = 'Error de conexión';
              message = `Error al conectar con RENIEC (Código: ${error.status}). Verifique su conexión a internet.`;
          }
        }
        // Si no hay código de estado, verificar el mensaje del error
        else if (error.error?.message || error.message) {
          const errorMessage = error.error?.message || error.message;

          if (errorMessage.includes('No se encontraron datos') || errorMessage.includes('not found')) {
            title = 'DNI no encontrado';
            message = `No se encontraron datos para el DNI ${dni} en RENIEC. Verifique que el número sea correcto.`;
          } else if (errorMessage.includes('Error interno') || errorMessage.includes('Internal Server Error')) {
            title = 'Servicio no disponible';
            message = 'El servicio de RENIEC no está disponible en este momento. Intente más tarde.';
          } else {
            message = errorMessage;
          }
        }

        // Mostrar notificación según el tipo de error
        if (title.includes('no encontrado') || title.includes('inválido')) {
          this.notificationService.warning(title, message);
        } else {
          this.notificationService.error(title, message);
        }
      }
    });
  }

  /**
   * Consultar RENIEC manualmente mediante botón
   */
  consultReniecManually(): void {
    const documentNumber = this.clientForm.get('documentNumber')?.value;
    const documentType = this.clientForm.get('documentType')?.value;

    // Validar tipo de documento
    if (documentType !== DocumentType.DNI) {
      this.notificationService.warning(
        'Solo DNI permitido',
        'La consulta RENIEC solo está disponible para documentos tipo DNI'
      );
      return;
    }

    // Validar que existe número de documento
    if (!documentNumber) {
      this.notificationService.warning(
        'DNI requerido',
        'Por favor, ingrese un número de DNI para consultar en RENIEC'
      );
      return;
    }

    // Validar formato del DNI
    if (documentNumber.length !== 8) {
      this.notificationService.warning(
        'DNI incompleto',
        'El DNI debe tener exactamente 8 dígitos'
      );
      return;
    }

    // Validar que solo contenga números
    if (!/^\d{8}$/.test(documentNumber)) {
      this.notificationService.warning(
        'DNI inválido',
        'El DNI debe contener solo números (8 dígitos)'
      );
      return;
    }

    // Validar DNIs obviamente inválidos
    if (documentNumber === '00000000' || documentNumber === '11111111' ||
      documentNumber === '12345678' || documentNumber === '87654321') {
      this.notificationService.warning(
        'DNI no válido',
        'Por favor, ingrese un DNI real y válido'
      );
      return;
    }

    // Mostrar notificación de consulta en progreso
    this.notificationService.info(
      'Consultando RENIEC',
      `Buscando datos para el DNI ${documentNumber}...`,
      3000
    );

    this.consultReniec(documentNumber);
  }
  private populateFormWithReniecData(personalData: any): void {
    // Actualizar siempre con datos de RENIEC
    this.clientForm.patchValue({
      firstName: personalData.firstName,
      lastName: personalData.lastName,
      username: personalData.generatedUsername
    });

    // Deshabilitar campos que vienen de RENIEC para evitar modificaciones
    this.clientForm.get('firstName')?.disable();
    this.clientForm.get('lastName')?.disable();
    this.clientForm.get('username')?.disable();

    // Marcar los campos como tocados para mostrar validación
    this.clientForm.get('firstName')?.markAsTouched();
    this.clientForm.get('lastName')?.markAsTouched();
    this.clientForm.get('username')?.markAsTouched();
  }

  /**
   * Habilitar campos para edición manual si no hay datos de RENIEC
   */
  private enableManualEditing(): void {
    this.clientForm.get('firstName')?.enable();
    this.clientForm.get('lastName')?.enable();
    this.clientForm.get('username')?.enable();
  }

  /**
   * Limpiar datos de RENIEC y habilitar edición manual
   */
  clearReniecData(): void {
    this.reniecDataFound = false;
    this.clientForm.patchValue({
      firstName: '',
      lastName: '',
      username: ''
    });
    this.enableManualEditing();

    this.notificationService.info(
      'Datos limpiados',
      'Ahora puede ingresar los datos manualmente'
    );
  }

  /**
   * Alternar visibilidad de la contraseña
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Alternar visibilidad de confirmar contraseña
   */
  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  /**
   * Limitar caracteres en input de DNI (máximo 8)
   */
  limitDniInput(event: any): void {
    const value = event.target.value;
    if (value.length > 8) {
      event.target.value = value.slice(0, 8);
      this.clientForm.get('documentNumber')?.setValue(value.slice(0, 8));
    }
  }

  /**
   * Limitar caracteres en input de teléfono (máximo 9)
   */
  limitPhoneInput(event: any): void {
    const value = event.target.value;
    if (value.length > 9) {
      event.target.value = value.slice(0, 9);
      this.clientForm.get('phone')?.setValue(value.slice(0, 9));
    }
  }
}
