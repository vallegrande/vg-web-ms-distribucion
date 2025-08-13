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
    organizationId: string;
    routeCode: string;
    routeName: string;
    zones: Zones[];
    totalEstimatedDuration: number;
    responsibleUserId: string;
    status: Status;
    created_at: string
}

export interface routesCreate {
    routeCode: string;
    routeName: string;
    zones: Zones[];
    totalEstimatedDuration: number;
    responsibleUserId: string;
}

export interface routesUpdate {
    routeCode: string;
    routeName: string;
    zones: Zones[];
    totalEstimatedDuration: number;
    responsibleUserId: string;
}

export interface Zones {
  zoneId?: string; 
  order: number;
  estimatedDuration: number;
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
