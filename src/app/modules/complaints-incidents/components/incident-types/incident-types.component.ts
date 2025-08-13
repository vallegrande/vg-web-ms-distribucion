import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { IncidentTypesService } from '../../services/incident-types.service';
import { IncidentType } from '../../models/complaints-incidents.models';
import { IncidentTypeFormModalComponent } from '../incident-type-form-modal/incident-type-form-modal.component';
import { IncidentTypeDetailsModalComponent } from '../incident-type-details-modal/incident-type-details-modal.component';
import Swal from 'sweetalert2';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-incident-types',
  templateUrl: './incident-types.component.html',
  styleUrls: ['./incident-types.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatIconModule
  ]
})
export class IncidentTypesComponent implements OnInit {
  incidentTypes: IncidentType[] = [];
  showInactive = false;

  constructor(
    private incidentTypeService: IncidentTypesService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.loadIncidentTypes();
  }

  loadIncidentTypes(): void {
    this.incidentTypeService.getAll().subscribe({
      next: (types) => {
        this.incidentTypes = types;
      },
      error: (error) => {
        console.error('Error loading incident types:', error);
        this.showErrorAlert('Error cargando tipos de incidencia.');
      }
    });
  }

  toggleShowInactive(): void {
    this.showInactive = !this.showInactive;
  }

  getIncidentTypesList(): IncidentType[] {
    return this.showInactive
      ? this.incidentTypes.filter(t => t.status === 'INACTIVE')
      : this.incidentTypes.filter(t => t.status === 'ACTIVE' || !t.status);
  }

  getPriorityLevelInSpanish(priorityLevel: string): string {
    const priorityTranslations: { [key: string]: string } = {
      'CRITICAL': 'CRÍTICA',
      'HIGH': 'ALTA',
      'MEDIUM': 'MEDIA',
      'LOW': 'BAJA'
    };
    return priorityTranslations[priorityLevel] || priorityLevel;
  }

  openIncidentTypeForm(incidentType?: IncidentType): void {
    const dialogRef = this.dialog.open(IncidentTypeFormModalComponent, {
      width: '600px',
      data: { incidentType: incidentType }
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.loadIncidentTypes();
        this.showSuccessAlert('Operación completada con éxito');
      }
    });
  }

  viewIncidentTypeDetails(incidentType: IncidentType): void {
    this.dialog.open(IncidentTypeDetailsModalComponent, {
      width: '600px',
      data: { incidentType: incidentType }
    });
  }

  deleteIncidentType(id: string): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'No podrás revertir esto!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminarlo!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.incidentTypeService.getById(id).subscribe({
          next: (incidentType) => {
            const updatedIncidentType = { ...incidentType, status: 'INACTIVE' as const };
            this.incidentTypeService.update(id, updatedIncidentType).subscribe({
              next: () => {
                this.loadIncidentTypes();
                this.showSuccessAlert('Tipo de incidencia eliminado con éxito.');
              },
              error: (error) => {
                console.error('Error eliminando tipo de incidencia:', error);
                this.showErrorAlert('Error eliminando tipo de incidencia.');
              }
            });
          },
          error: (error) => {
            console.error('Error obteniendo tipo de incidencia para eliminar:', error);
            this.showErrorAlert('Error obteniendo tipo de incidencia para eliminar.');
          }
        });
      }
    });
  }

  restoreIncidentType(id: string): void {
    Swal.fire({
      title: '¿Estás seguro de restaurar?',
      text: 'El tipo de incidencia volverá a estar activo.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, restaurar!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.incidentTypeService.getById(id).subscribe({
          next: (incidentType) => {
            const updatedIncidentType = { ...incidentType, status: 'ACTIVE' as const };
            this.incidentTypeService.update(id, updatedIncidentType).subscribe({
              next: () => {
                this.loadIncidentTypes();
                this.showSuccessAlert('Tipo de incidencia restaurado con éxito.');
              },
              error: (error) => {
                console.error('Error restaurando tipo de incidencia:', error);
                this.showErrorAlert('Error restaurando tipo de incidencia.');
              }
            });
          },
          error: (error) => {
            console.error('Error obteniendo tipo de incidencia para restaurar:', error);
            this.showErrorAlert('Error obteniendo tipo de incidencia para restaurar.');
          }
        });
      }
    });
  }

  private showSuccessAlert(message: string): void {
    Swal.fire({
      icon: 'success',
      title: 'Éxito',
      text: message,
      confirmButtonColor: '#4CAF50',
      customClass: {
        popup: 'swal2-popup',
        title: 'swal2-title',
        htmlContainer: 'swal2-html-container',
        actions: 'swal2-actions',
        confirmButton: 'swal2-confirm',
        cancelButton: 'swal2-cancel',
        icon: 'swal2-icon'
      }
    });
  }

  private showErrorAlert(message: string): void {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: message,
      confirmButtonColor: '#F44336',
      customClass: {
        popup: 'swal2-popup',
        title: 'swal2-title',
        htmlContainer: 'swal2-html-container',
        actions: 'swal2-actions',
        confirmButton: 'swal2-confirm',
        cancelButton: 'swal2-cancel'
      }
    });
  }
} 