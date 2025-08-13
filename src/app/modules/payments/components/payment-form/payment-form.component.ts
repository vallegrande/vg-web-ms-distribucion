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

  constructor(
    private fb: FormBuilder,
    private paymentService: PaymentService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

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
        const selectedUser = this.users.find(u => u.id === userId);
        console.log('Selected user:', selectedUser);
        
        if (selectedUser) {
          const orgId = selectedUser.organizationId || '';
          console.log('Organization ID from user:', orgId);
          this.paymentForm.get('organizationId')?.setValue(orgId);

          if (orgId) {
            this.paymentService.getOrganizationById(orgId).subscribe({
              next: organization => {
                console.log('Organization data received:', organization);
                
                // Intentar diferentes propiedades para el nombre
                this.organizationName = 
                  organization.name ||
                  organization.organizationName ||
                  organization.organization_name ||
                  organization.title ||
                  organization.displayName ||
                  'Organización desconocida';
                
                console.log('Organization name set to:', this.organizationName);
              },
              error: (error) => {
                console.error('Error loading organization:', error);
                this.organizationName = 'Error al cargar organización';
                Swal.fire('Error', 'No se pudo cargar la organización.', 'error');
              }
            });
          } else {
            console.log('No organization ID found for user');
            this.organizationName = '';
          }

          this.paymentForm.get('clientInfo')?.patchValue({
            documentType: selectedUser.documentType,
            documentNumber: selectedUser.documentNumber,
            firstName: selectedUser.firstName,
            lastName: selectedUser.lastName,
            phone: selectedUser.phone,
            email: selectedUser.email,
            address: {
              localityName: selectedUser.zoneId || '',
              streetName: selectedUser.streetAddress || ''
            }
          });
        }
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
      totalAmount: ['', Validators.required],
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
    this.details.push(
      this.fb.group({
        concept: ['SERVICIO_AGUA', Validators.required],
        year: [new Date().getFullYear(), Validators.required],
        month: [new Date().getMonth() + 1, Validators.required],
        amount: ['', Validators.required],
        description: [`Pago de servicio de Agua - ${this.getMonthName(new Date())} ${new Date().getFullYear()}`],
        periodStart: [this.formatDate(new Date()), Validators.required],
        periodEnd: ['', Validators.required]
      })
    );
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
          payment.details.forEach((detail: PaymentDetail) => {
            this.details.push(
              this.fb.group({
                concept: [detail.concept, Validators.required],
                year: [detail.year, Validators.required],
                month: [detail.month, Validators.required],
                amount: [detail.amount, Validators.required],
                description: [detail.description],
                periodStart: [this.formatDate(new Date(detail.periodStart)), Validators.required],
                periodEnd: [this.formatDate(new Date(detail.periodEnd)), Validators.required]
              })
            );
          });
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

    // Convierte fechas de los detalles correctamente
    const formattedDetails: PaymentDRequest[] = (formValue.details || []).map((detail: any) => ({
      concept: detail.concept,
      year: parseInt(detail.year),
      month: parseInt(detail.month),
      amount: parseFloat(detail.amount), // Convertir a number
      description: detail.description,
      periodStart: new Date(detail.periodStart),
      periodEnd: new Date(detail.periodEnd)
    }));

    if (this.isEditMode) {
      const updatePayload: PaymentUpdate = {
        organizationId: formValue.organizationId,
        paymentCode: formValue.paymentCode,
        userId: formValue.userId,
        waterBoxId: formValue.waterBoxId,
        paymentType: formValue.paymentType,
        paymentMethod: formValue.paymentMethod,
        totalAmount: parseFloat(formValue.totalAmount), // Convertir a number
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
        totalAmount: parseFloat(formValue.totalAmount), // Convertir a number
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
