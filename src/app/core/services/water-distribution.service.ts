import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { DistributionProgram, DistributionProgramCreate, DistributionProgramUpdate } from '../models/water-distribution.model';
import { ApiResponse } from '../models/auth.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProgramsService {

  private readonly apiPrograms = `${environment.distribution}/programs`;

  constructor(private http: HttpClient) { }

  // MÉTODOS DE PROGRAMS

  getAllPrograms(): Observable<DistributionProgram[]> {
    return this.http.get<ApiResponse<DistributionProgram[]>>(this.apiPrograms).pipe(
      map(response => response.data)
    );
  }

  getProgramById(id: string): Observable<DistributionProgram> {
    return this.http.get<ApiResponse<DistributionProgram>>(`${this.apiPrograms}/${id}`).pipe(
      map(response => response.data)
    );
  }

  createProgram(program: DistributionProgramCreate): Observable<DistributionProgram> {
    return this.http.post<ApiResponse<DistributionProgram>>(this.apiPrograms, program).pipe(
      map(response => response.data)
    );
  }

  updateProgram(id: string, program: DistributionProgramUpdate): Observable<DistributionProgram> {
    return this.http.put<ApiResponse<DistributionProgram>>(`${this.apiPrograms}/${id}`, program).pipe(
      map(response => response.data)
    );
  }

  deleteProgram(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.apiPrograms}/${id}`).pipe(
      map(response => response.data)
    );
  }

  activateProgram(id: string): Observable<DistributionProgram> {
    return this.http.patch<ApiResponse<DistributionProgram>>(`${this.apiPrograms}/${id}/activate`, {}).pipe(
      map(response => response.data)
    );
  }

  deactivateProgram(id: string): Observable<DistributionProgram> {
    return this.http.patch<ApiResponse<DistributionProgram>>(`${this.apiPrograms}/${id}/deactivate`, {}).pipe(
      map(response => response.data)
    );
  }

  getNextProgramCode(): Observable<{ nextCode: string }> {
    return this.http.get<ApiResponse<{ nextCode: string }>>(`${this.apiPrograms}/next-code`).pipe(
      map(response => response.data)
    );
  }

}
