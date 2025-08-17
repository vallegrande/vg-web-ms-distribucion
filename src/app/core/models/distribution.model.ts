export interface fares {
  id: string; 
  organizationId: string;
  fareCode: string;
  fareName: string;
  fareType: FareType;
  fareAmount: number;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export interface faresCreate {
  organizationId: string;    
  fareCode: string;         
  fareName: string;
  fareType: FareType;
  fareAmount: number;
}

export interface faresUpdate {
    organizationId: string; 
    fareCode: string;
    fareName: string;
    fareType: FareType;
    fareAmount: number
}

export enum FareType {
    DIARIA = 'DIARIA',
    SEMANAL = 'SEMANAL',
    MENSUAL = 'MENSUAL'
}


// distribution schedules
export interface schedules {
  id: string;
  scheduleCode: string;
  scheduleName: string;
  daysOfWeek: string[];
  startTime: string;
  endTime: string;
  durationHours: number;
  organizationId: string;
  zoneId: string;
  status: 'ACTIVE' | 'INACTIVE'; // <- IMPORTANTE
}

export interface schedulesCreate {
  scheduleName: string;
  daysOfWeek: string[]; 
  startTime: string;
  endTime: string;
  durationHours: number;
  organizationId: string;
  zoneId: string;
}

export interface schedulesUpdate {
  scheduleCode: string;
  scheduleName: string;
  daysOfWeek: string[]; 
  startTime: string;
  endTime: string;
  durationHours: number;
  organizationId: string;
  zoneId: string;
}


export enum DaysOfWeek {
    LUNES = 'LUNES',
    MIÉRCOLES = 'MIÉRCOLES',
    VIERNES = 'VIERNES'
}

// distribution routes
export interface routes {
    id: string;
    organization_id: string; // Cambiado para coincidir con MongoDB
    route_code: string;      // Cambiado para coincidir con MongoDB
    route_name: string;      // Cambiado para coincidir con MongoDB
    zones: Zones[];
    total_estimated_duration: number; // Cambiado para coincidir con MongoDB
    responsible_user_id: string;      // Cambiado para coincidir con MongoDB
    status: Status;
    created_at: string;
    // Campos adicionales para compatibilidad con el frontend
    organizationId?: string;
    routeCode?: string;
    routeName?: string;
    totalEstimatedDuration?: number;
    responsibleUserId?: string;
}

export interface routesCreate {
    organization_id: string;           // Agregado para coincidir con MongoDB
    route_code: string;
    route_name: string;
    zones: Zones[];
    total_estimated_duration: number;
    responsible_user_id: string;
    // Campos adicionales para compatibilidad
    organizationId?: string;
    routeCode?: string;
    routeName?: string;
    totalEstimatedDuration?: number;
    responsibleUserId?: string;
}

export interface routesUpdate {
    route_code: string;
    route_name: string;
    zones: Zones[];
    total_estimated_duration: number;
    responsible_user_id: string;
    // Campos adicionales para compatibilidad
    routeCode?: string;
    routeName?: string;
    totalEstimatedDuration?: number;
    responsibleUserId?: string;
}

export interface Zones {
  zone_id?: string;           // Cambiado para coincidir con MongoDB
  order: number;
  estimated_duration: number; // Cambiado para coincidir con MongoDB
  // Campos adicionales para compatibilidad
  zoneId?: string;
  estimatedDuration?: number;
}


// EMUN STATUS GLOBAL
export enum Status{
    ACTIVE ='ACTIVE',
    INACTIVE = 'INACTIVE'
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success?: boolean;
}
