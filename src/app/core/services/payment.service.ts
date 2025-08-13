import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { Payment, PaymentCreate, PaymentUpdate, PaymentResponse } from '../models/payment.model';
import { environment } from '../../../environments/environment';

interface ApiResponse<T> {
  status: boolean;
  data: T;
}

interface BackendResponse<T> {
  status: boolean;
  data: T;
  error?: any;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {

  private apiUrl = environment

  constructor(private http: HttpClient) { }

  private handleError(error: any) {
    console.error('API Error:', error);
    return throwError(() => error);
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
  }

  getAllPayments(): Observable<Payment[]> {
    return this.http.get<BackendResponse<Payment[]>>(this.apiUrl.payments, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Raw GetAllPayments Response:', response)),
      map(response => {
        console.log('GetAllPayments Response:', response);
        return response.data;
      }),
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<PaymentResponse> {
    return this.http.get<BackendResponse<PaymentResponse>>(`${this.apiUrl.payments}/${id}`, { headers: this.getHeaders() }).pipe(
      tap(response => console.log('Raw GetById Response:', response)),
      map(response => {
        console.log('GetById Response:', response);
        return response.data;
      }),
      catchError(this.handleError)
    );
  }

  create(payment: PaymentCreate): Observable<PaymentResponse> {
    console.log('Creating payment with data:', payment);
    const payload = JSON.stringify(payment);
    console.log('Request payload:', payload);

    return this.http.post<BackendResponse<PaymentResponse>>(this.apiUrl.payments, payment, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => console.log('Raw Create Response:', response)),
      map(response => {
        console.log('Create Response:', response);
        if (!response.status) {
          throw new Error(response.error?.message || 'Error creating payment');
        }
        return response.data;
      }),
      catchError(error => {
        console.error('Create payment error:', error);
        if (error.status === 0) {
          throw new Error('No se puede conectar con el servidor. Verifique que el backend esté ejecutándose.');
        }
        if (error.status === 400) {
          throw new Error('Datos inválidos. Verifique la información ingresada.');
        }
        if (error.status === 500) {
          throw new Error('Error interno del servidor.');
        }
        throw new Error(error.message || 'Error desconocido al crear el pago');
      })
    );
  }

  update(id: string, payment: PaymentUpdate): Observable<PaymentResponse> {
    console.log('Updating payment with data:', payment);
    return this.http.put<BackendResponse<PaymentResponse>>(`${this.apiUrl.payments}/${id}`, payment, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => console.log('Raw Update Response:', response)),
      map(response => {
        console.log('Update Response:', response);
        return response.data;
      }),
      catchError(this.handleError)
    );
  }

  getUserById(userId: string): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl.apiUrl}/${userId}`).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  getUserWithOrganization(userId: string): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl.apiUrl}/users/${userId}/with-organization`).pipe(
      tap(response => console.log('Raw User with Organization Response:', response)),
      map(response => {
        console.log('User with Organization Response:', response);
        if (!response.status) {
          throw new Error('Error fetching user with organization');
        }
        return response.data;
      }),
      catchError(error => {
        console.error('Error fetching user with organization:', error);
        throw new Error('No se pudo cargar el usuario con organización');
      })
    );
  }

  getAllUsers(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl.users}`).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  getOrganizationById(id: string): Observable<any> {
    console.log('Fetching organization with ID:', id);
    return this.http.get<ApiResponse<any>>(`${this.apiUrl.organizations}/${id}`).pipe(
      tap(response => console.log('Raw Organization Response:', response)),
      map(response => {
        console.log('Organization Response:', response);
        if (!response.status) {
          throw new Error('Error fetching organization');
        }
        return response.data;
      }),
      catchError(error => {
        console.error('Error fetching organization:', error);
        throw new Error('No se pudo cargar la organización');
      })
    );
  }

  getAllOrganizations(): Observable<any[]> {
    console.log('Fetching all organizations');
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl.organizations}`).pipe(
      tap(response => console.log('Raw All Organizations Response:', response)),
      map(response => {
        console.log('All Organizations Response:', response);
        if (!response.status) {
          throw new Error('Error fetching organizations');
        }
        return response.data;
      }),
      catchError(error => {
        console.error('Error fetching organizations:', error);
        throw new Error('No se pudieron cargar las organizaciones');
      })
    );
  }
}
