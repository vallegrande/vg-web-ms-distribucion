import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PaymentService } from '../../../../core/services/payment.service';
import { OrganizationService } from '../../../../core/services/organization.service';
import { UserService } from '../../../../core/services/user.service';
import { BoxService } from '../../../../core/services/box.service';
import { PaymentResponse, PaymentDetail } from '../../../../core/models/payment.model';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-payment-detail',
  imports: [CommonModule],
  templateUrl: './payment-detail.component.html',
  styleUrl: './payment-detail.component.css'
})
export class PaymentDetailComponent implements OnInit {
  payment: PaymentResponse | null = null;
  organizationName: string = '';
  userName: string = '';
  waterBoxName: string = '';
  loading: boolean = true;
  error: string = '';

  months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private paymentService: PaymentService,
    private organizationService: OrganizationService,
    private userService: UserService,
    private boxService: BoxService
  ) { }

  ngOnInit(): void {
    this.loadPaymentDetail();
  }

  loadPaymentDetail(): void {
    const paymentId = this.route.snapshot.paramMap.get('id');

    if (!paymentId) {
      this.error = 'ID de pago no válido';
      this.loading = false;
      return;
    }

    this.paymentService.getById(paymentId).subscribe({
      next: (payment) => {
        this.payment = payment;
        this.loadAdditionalData();
      },
      error: (error) => {
        console.error('Error loading payment:', error);
        this.error = 'Error al cargar el detalle del pago';
        this.loading = false;
      }
    });
  }

  loadAdditionalData(): void {
    if (!this.payment) return;

    forkJoin({
      organization: this.organizationService.getOrganizationById(this.payment.organizationId),
      user: this.userService.getUserById(this.payment.userId),
      waterBox: this.boxService.getWaterBoxById(Number(this.payment.waterBoxId))
    }).subscribe({
      next: (data) => {
        this.organizationName = data.organization?.organizationName || 'Organización no encontrada';
        this.userName = `${data.user?.firstName || ''} ${data.user?.lastName || ''}`.trim() || 'Usuario no encontrado';
        this.waterBoxName = data.waterBox?.boxCode || 'Caja de agua no encontrada';
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading additional data:', error);
        this.organizationName = 'Error al cargar';
        this.userName = 'Error al cargar';
        this.waterBoxName = 'Error al cargar';
        this.loading = false;
      }
    });
  }

  getMonthName(monthNumber: number): string {
    if (monthNumber >= 1 && monthNumber <= 12) {
      return this.months[monthNumber - 1];
    }
    return 'Mes inválido';
  }

  formatDate(date: Date | string): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getPaymentTypeLabel(type: string): string {
    const types: { [key: string]: string } = {
      'monthly': 'Mensual',
      'annual': 'Anual',
      'mixed': 'Mixto'
    };
    return types[type] || type;
  }

  getPaymentMethodLabel(method: string): string {
    const methods: { [key: string]: string } = {
      'cash': 'Efectivo',
      'transfer': 'Transferencia',
      'card': 'Tarjeta'
    };
    return methods[method] || method;
  }

  getPaymentStatusLabel(status: string): string {
    const statuses: { [key: string]: string } = {
      'pending': 'Pendiente',
      'completed': 'Completado',
      'failed': 'Fallido',
      'cancelled': 'Cancelado'
    };
    return statuses[status] || status;
  }

  goBack(): void {
    this.router.navigate(['/admin/payments']);
  }

  editPayment(): void {
    if (this.payment) {
      this.router.navigate(['/admin/payments/edit', this.payment.paymentId]);
    }
  }
}
