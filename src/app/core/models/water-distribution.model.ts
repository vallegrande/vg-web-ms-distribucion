
// distribution programas
export interface DistributionProgram {
  id: string;
  organizationId: string;
  programCode: string;
  scheduleId: string;
  routeId: string;
  programDate: string; // formato YYYY-MM-DD
  plannedStartTime: string; // "08:00"
  plannedEndTime: string;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  status: ProgramStatus;
  responsibleUserId: string;
  observations?: string;
  createdAt?: string;
  zoneId?: string;
  streetId?: string;
}

export interface DistributionProgramCreate {
  organizationId: string;
  scheduleId: string;
  routeId: string;
  programDate: string;
  plannedStartTime: string;
  plannedEndTime: string;
  responsibleUserId: string;
  observations?: string;
  zoneId?:  string;
  streetId?: string;
}

export interface DistributionProgramUpdate extends DistributionProgramCreate {}

export enum ProgramStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

