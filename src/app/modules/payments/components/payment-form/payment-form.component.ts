import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PaymentService } from '../../../../core/services/payment.service';
import { Payment, PaymentCreate, PaymentDetail, PaymentUpdate, PaymentDRequest, PaymentResponse } from '../../../../core/models/payment.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-payment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './payment-form.component.html',
  styleUrl: './payment-form.component.css'
})
export class PaymentFormComponent implements OnInit {
  paymentForm!: FormGroup;
  isEditMode = false;
  paymentId: string | null = null;
  loading = false;
  submitting = false;
  showSuccessAlert = false;
  showErrorAlert = false;

  organizationName: string = '';
  users: any[] = [];

  // Conceptos y montos predefinidos
  concepts = [
    { value: 'SERVICIO_AGUA', label: 'Servicio de Agua', amount: 10 },
    { value: 'REPOSICION', label: 'Reposición', amount: 30 }
  ];

  // Meses del año
  months = [
    { value: 1, name: 'Enero' },
    { value: 2, name: 'Febrero' },
    { value: 3, name: 'Marzo' },
    { value: 4, name: 'Abril' },
    { value: 5, name: 'Mayo' },
    { value: 6, name: 'Junio' },
    { value: 7, name: 'Julio' },
    { value: 8, name: 'Agosto' },
    { value: 9, name: 'Septiembre' },
    { value: 10, name: 'Octubre' },
    { value: 11, name: 'Noviembre' },
    { value: 12, name: 'Diciembre' }
  ];

  constructor(
    private fb: FormBuilder,
    private paymentService: PaymentService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.paymentForm = this.createForm();
    this.loadAllUsers();

    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.paymentId = params['id'];
        this.loadPayment();
      } else {
        this.generatePaymentCode();
      }
    });

    this.paymentForm.get('userId')!.valueChanges.subscribe(userId => {
      console.log('User ID changed to:', userId);
      if (userId) {
        // Usar el nuevo método que incluye la organización con zonas
        this.paymentService.getUserWithOrganization(userId).subscribe({
          next: (userData) => {
            console.log('User with organization data received:', userData);

            if (userData.organization) {
              const orgId = userData.organizationId || '';
              this.paymentForm.get('organizationId')?.setValue(orgId);
              this.organizationName = userData.organization.organizationName || 'Organización desconocida';
              console.log('Organization name set to:', this.organizationName);

              // Buscar la zona correspondiente
              let zoneName = '--';
              if (userData.organization.zones && userData.zoneId) {
                const zone = userData.organization.zones.find((z: any) => z.zoneId === userData.zoneId);
                if (zone) {
                  zoneName = zone.zoneName;
                }
              }

              this.paymentForm.get('clientInfo')?.patchValue({
                documentType: userData.documentType,
                documentNumber: userData.documentNumber,
                firstName: userData.firstName,
                lastName: userData.lastName,
                phone: userData.phone,
                email: userData.email,
                address: {
                  localityName: zoneName,
                  streetName: userData.streetAddress || ''
                }
              });
            } else {
              console.log('No organization data found for user');
              this.organizationName = '';
            }
          },
          error: (error) => {
            console.error('Error loading user with organization:', error);
            this.organizationName = 'Error al cargar organización';
            Swal.fire('Error', 'No se pudo cargar la información del usuario.', 'error');
          }
        });
      } else {
        console.log('No user selected');
        this.paymentForm.get('organizationId')?.reset();
        this.organizationName = '';
        this.paymentForm.get('clientInfo')?.reset();
      }
    });
  }

  private loadAllUsers(): void {
    this.paymentService.getAllUsers().subscribe({
      next: users => {
        console.log('All users loaded:', users);
        this.users = users;

        // Debug: mostrar estructura de algunos usuarios
        if (users.length > 0) {
          console.log('Sample user structure:', users[0]);
        }
      },
      error: (error) => {
        console.error('Error loading users:', error);
        Swal.fire('Error', 'No se pudo cargar la lista de usuarios.', 'error');
      }
    });
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private createForm(): FormGroup {
    return this.fb.group({
      clientInfo: this.fb.group({
        documentType: [''],
        documentNumber: [''],
        firstName: [''],
        lastName: [''],
        phone: [''],
        email: [''],
        address: this.fb.group({
          localityName: [''],
          streetName: ['']
        })
      }),
      userId: ['', Validators.required],
      organizationId: ['', Validators.required],
      paymentCode: ['', Validators.required],
      waterBoxId: [''],
      paymentType: ['AGUA', Validators.required],
      paymentMethod: ['EFECTIVO', Validators.required],
      totalAmount: [{ value: 0, disabled: true }, Validators.required],
      paymentDate: [this.formatDate(new Date()), Validators.required],
      paymentStatus: ['PAGADO', Validators.required],
      externalReference: [''],
      details: this.fb.array([])
    });
  }

  get details(): FormArray {
    return this.paymentForm.get('details') as FormArray;
  }

  addDetail(): void {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const detailGroup = this.fb.group({
      concept: ['SERVICIO_AGUA', Validators.required],
      year: [{ value: currentYear, disabled: true }, Validators.required],
      month: [currentMonth, Validators.required],
      amount: [{ value: 10, disabled: true }, Validators.required],
      description: [''], // Se actualizará con updateDescription
      periodStart: [{ value: '', disabled: true }, Validators.required],
      periodEnd: [{ value: '', disabled: true }, Validators.required]
    });

    // Configurar listeners para cambios automáticos
    this.setupDetailListeners(detailGroup, this.details.length);

    this.details.push(detailGroup);

    // Calcular automáticamente las fechas del periodo
    this.updatePeriodDates(detailGroup, currentMonth, currentYear);

    // Actualizar la descripción con los valores iniciales
    this.updateDescription(detailGroup);

    // Recalcular el monto total
    this.calculateTotalAmount();
  }

  private setupDetailListeners(detailGroup: FormGroup, index: number): void {
    // Listener para cambio de concepto
    detailGroup.get('concept')?.valueChanges.subscribe(concept => {
      const selectedConcept = this.concepts.find(c => c.value === concept);
      if (selectedConcept) {
        detailGroup.get('amount')?.setValue(selectedConcept.amount);
        this.updateDescription(detailGroup);
        this.calculateTotalAmount();
      }
    });

    // Listener para cambio de mes
    detailGroup.get('month')?.valueChanges.subscribe(month => {
      const year = detailGroup.get('year')?.value;
      this.updatePeriodDates(detailGroup, month, year);
      this.updateDescription(detailGroup);
    });
  }

  private updatePeriodDates(detailGroup: FormGroup, month: number, year: number): void {
    if (month && year) {
      // Primer día del mes
      const startDate = new Date(year, month - 1, 1);
      // Último día del mes
      const endDate = new Date(year, month, 0);

      detailGroup.get('periodStart')?.setValue(this.formatDate(startDate));
      detailGroup.get('periodEnd')?.setValue(this.formatDate(endDate));
    }
  }

  private updateDescription(detailGroup: FormGroup): void {
    const concept = detailGroup.get('concept')?.value;
    const month = detailGroup.get('month')?.value;
    const year = detailGroup.get('year')?.value;

    const conceptLabel = this.concepts.find(c => c.value === concept)?.label || concept;
    const monthName = this.getMonthNameByNumber(Number(month)); // Convertir a número

    const description = `Pago de ${conceptLabel} - ${monthName} - ${year}`;
    detailGroup.get('description')?.setValue(description);
  }

  private calculateTotalAmount(): void {
    let total = 0;
    this.details.controls.forEach(control => {
      const amount = control.get('amount')?.value || 0;
      total += parseFloat(amount);
    });
    this.paymentForm.get('totalAmount')?.setValue(total);
  }

  private getMonthNameByNumber(monthNumber: number): string {
    console.log('getMonthNameByNumber called with:', monthNumber, 'type:', typeof monthNumber);
    const month = this.months.find(m => m.value === monthNumber);
    console.log('Found month:', month);
    return month ? month.name : '';
  }

  getMonthName(date: Date): string {
    const months = [
      'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
      'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
    ];
    return months[date.getMonth()];
  }

  removeDetail(index: number): void {
    this.details.removeAt(index);
    this.calculateTotalAmount();
  }

  private loadPayment(): void {
    this.loading = true;
    this.paymentService.getById(this.paymentId!).subscribe({
      next: (payment: PaymentResponse) => {
        this.paymentForm.patchValue({
          organizationId: payment.organizationId,
          paymentCode: payment.paymentCode,
          userId: payment.userId,
          waterBoxId: payment.waterBoxId,
          paymentType: payment.paymentType,
          paymentMethod: payment.paymentMethod,
          totalAmount: payment.totalAmount,
          paymentDate: this.formatDate(new Date(payment.paymentDate)),
          paymentStatus: payment.paymentStatus,
          externalReference: payment.externalReference
        });

        if (payment.details && Array.isArray(payment.details)) {
          payment.details.forEach((detail: PaymentDetail, index: number) => {
            const detailGroup = this.fb.group({
              concept: [detail.concept, Validators.required],
              year: [{ value: detail.year, disabled: true }, Validators.required],
              month: [detail.month, Validators.required],
              amount: [{ value: detail.amount, disabled: true }, Validators.required],
              description: [detail.description],
              periodStart: [{ value: this.formatDate(new Date(detail.periodStart)), disabled: true }, Validators.required],
              periodEnd: [{ value: this.formatDate(new Date(detail.periodEnd)), disabled: true }, Validators.required]
            });

            // Configurar listeners para este detalle
            this.setupDetailListeners(detailGroup, index);

            this.details.push(detailGroup);
          });

          // Calcular el monto total
          this.calculateTotalAmount();
        }

        this.loading = false;
      },
      error: () => {
        this.loading = false;
        Swal.fire('Error', 'No se pudo cargar el pago.', 'error');
      }
    });
  }

  submit(): void {
    if (this.paymentForm.invalid) {
      this.showErrorAlert = true;
      return;
    }

    this.submitting = true;

    // Prepara el payload
    const formValue = this.paymentForm.value;

    // Convertir fechas de los detalles correctamente y obtener valores de campos deshabilitados
    const formattedDetails: PaymentDRequest[] = this.details.controls.map((control: any) => ({
      concept: control.get('concept')?.value,
      year: parseInt(control.get('year')?.value),
      month: parseInt(control.get('month')?.value),
      amount: parseFloat(control.get('amount')?.value),
      description: control.get('description')?.value,
      periodStart: new Date(control.get('periodStart')?.value),
      periodEnd: new Date(control.get('periodEnd')?.value)
    }));

    if (this.isEditMode) {
      const updatePayload: PaymentUpdate = {
        organizationId: formValue.organizationId,
        paymentCode: formValue.paymentCode,
        userId: formValue.userId,
        waterBoxId: formValue.waterBoxId,
        paymentType: formValue.paymentType,
        paymentMethod: formValue.paymentMethod,
        totalAmount: parseFloat(this.paymentForm.get('totalAmount')?.value), // Obtener valor del campo deshabilitado
        paymentDate: new Date(formValue.paymentDate),
        paymentStatus: formValue.paymentStatus,
        externalReference: formValue.externalReference
      };

      this.paymentService.update(this.paymentId!, updatePayload).subscribe({
        next: (response) => {
          console.log('Payment updated successfully:', response);
          this.handleSuccess();
        },
        error: (error) => {
          console.error('Error updating payment:', error);
          this.handleErrorWithMessage(error.message || 'Error al actualizar el pago');
        }
      });
    } else {
      const createPayload: PaymentCreate = {
        organizationId: formValue.organizationId,
        paymentCode: formValue.paymentCode,
        userId: formValue.userId,
        waterBoxId: formValue.waterBoxId,
        paymentType: formValue.paymentType,
        paymentMethod: formValue.paymentMethod,
        totalAmount: parseFloat(this.paymentForm.get('totalAmount')?.value), // Obtener valor del campo deshabilitado
        paymentDate: new Date(formValue.paymentDate),
        paymentStatus: formValue.paymentStatus,
        externalReference: formValue.externalReference,
        details: formattedDetails
      };

      console.log('Sending payment data:', createPayload);

      this.paymentService.create(createPayload).subscribe({
        next: (response) => {
          console.log('Payment created successfully:', response);
          this.handleSuccess();
        },
        error: (error) => {
          console.error('Error creating payment:', error);
          this.handleErrorWithMessage(error.message || 'Error al crear el pago');
        }
      });
    }
  }

  private handleSuccess(): void {
    this.submitting = false;
    this.showSuccessAlert = true;
    Swal.fire('Éxito', 'Pago guardado correctamente.', 'success');
    setTimeout(() => {
      this.router.navigate(['/admin/payments']);
    }, 2000);
  }

  private handleError(): void {
    this.submitting = false;
    this.showErrorAlert = true;
    Swal.fire('Error', 'Ocurrió un error al guardar el pago. Verifique la información ingresada.', 'error');
  }

  private handleErrorWithMessage(message: string): void {
    this.submitting = false;
    this.showErrorAlert = true;
    Swal.fire('Error', message, 'error');
  }

  cancel(): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Se cancelará el registro del pago.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No'
    }).then(result => {
      if (result.isConfirmed) {
        this.router.navigate(['/admin/payments']);
      }
    });
  }

  private generatePaymentCode(): void {
    this.paymentService.getAllPayments().subscribe({
      next: (payments) => {
        const codes = payments
          .map(p => p.paymentCode)
          .filter(code => code && code.startsWith('JASS-01-'));

        let maxNumber = 0;
        codes.forEach(code => {
          const parts = code.split('-');
          const numberPart = parts[2];
          const number = parseInt(numberPart, 10);
          if (!isNaN(number) && number > maxNumber) {
            maxNumber = number;
          }
        });

        const nextNumber = maxNumber + 1;
        const formattedNumber = String(nextNumber).padStart(6, '0');
        const newCode = `JASS-001-${formattedNumber}`;

        this.paymentForm.get('paymentCode')?.setValue(newCode);
      },
      error: () => {
        Swal.fire('Error', 'No se pudo generar el código de pago.', 'error');
      }
    });
  }
}
