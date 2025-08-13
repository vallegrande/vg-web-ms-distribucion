import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Incident, IncidentResolution } from '../models/complaints-incidents.models';
import { IncidentResolutionsService } from '../services/incident-resolutions.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UserService } from '../../../core/services/user.service';
import { UserResponseDTO } from '../../../core/models/user.model';
import { InventoryService } from '../../../core/services/inventory.service';
import { ProductResponse } from '../../../core/models/inventory.model';

interface IncidentDetailsData {
  id?: string;
  organizationId: string;
  incidentCode: string;
  incidentTypeId: string;
  incidentCategory: 'GENERAL' | 'CALIDAD' | 'DISTRIBUCION';
  zoneId: string;
  incidentDate: number; // timestamp (milisegundos)
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'REPORTED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  affectedBoxesCount: number;
  reportedByUserId: string;
  assignedToUserId?: string;
  resolvedByUserId?: string;
  resolved: boolean;
  resolutionNotes?: string;
  recordStatus: 'ACTIVE' | 'INACTIVE';
  incidentType: string;
  estimatedResolutionTime: string;
  priorityLevel: string;
}

@Component({
  selector: 'app-incident-details-modal',
  templateUrl: './incident-details-modal.component.html',
  styleUrls: ['./incident-details-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule, MatProgressSpinnerModule],
  providers: [IncidentResolutionsService]
})
export class IncidentDetailsModalComponent {
  resolutionDetails: IncidentResolution | null = null;
  isResolutionLoading: boolean = false;
  clientUsers: UserResponseDTO[] = [];
  products: ProductResponse[] = [];

  constructor(
    public dialogRef: MatDialogRef<IncidentDetailsModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: IncidentDetailsData,
    private resolutionService: IncidentResolutionsService, // Inject the service
    private userService: UserService,
    private inventoryService: InventoryService
  ) {
    console.log('IncidentDetailsModalComponent opened with data:', this.data);
    console.log('Incident resolved status:', this.data.resolved);
    this.loadUsers();
    this.loadProducts();
    if (this.data.resolved) {
      this.loadResolutionDetails();
    }
  }

  loadUsers(): void {
    this.userService.getClientUsers().subscribe({
      next: (users: UserResponseDTO[]) => {
        this.clientUsers = users;
      },
      error: (err: any) => {
        console.error('Error fetching client users', err);
      }
    });
  }

  loadProducts(): void {
    this.inventoryService.getProducts().subscribe({
      next: (products: ProductResponse[]) => {
        this.products = products;
      },
      error: (err: any) => {
        console.error('Error fetching products', err);
      }
    });
  }

  getUsernameById(id: string): string {
    const user = this.clientUsers.find(u => u.id === id);
    return user ? user.fullName : id;
  }

  getProductNameById(id: string): string {
    const product = this.products.find(p => p.productId === id);
    return product ? product.productName : `Producto ID: ${id}`;
  }

  getResolutionDate(): Date | null {
    if (this.resolutionDetails && typeof this.resolutionDetails.resolutionDate === 'number' && this.resolutionDetails.resolutionDate > 0) {
      return new Date(this.resolutionDetails.resolutionDate);
    }
    return null;
  }

  loadResolutionDetails(): void {
    if (!this.data.id) {
      console.warn('No incident ID available to load resolution details.');
      return;
    }

    this.isResolutionLoading = true;
    this.resolutionService.getAll().subscribe({
      next: (resolutions: IncidentResolution[]) => {
        this.resolutionDetails = resolutions.find((res: IncidentResolution) => res.incidentId === this.data.id) || null;
        this.isResolutionLoading = false;
        console.log('Resolution details loaded:', this.resolutionDetails);
      },
      error: (error: any) => {
        console.error('Error loading resolution details:', error);
        this.isResolutionLoading = false;
        // Optionally, show an error message to the user
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}