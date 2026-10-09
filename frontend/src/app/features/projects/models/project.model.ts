import type { MilestoneStatus, ProjectStatus } from '../config/status.config';

export type { MilestoneStatus, ProjectStatus } from '../config/status.config';
export type ProjectRole = 'client' | 'freelancer';
export type MilestoneAction = 'fund' | 'submit' | 'release' | 'refund';

export interface ProjectParty {
  id: string;
  name: string;
  email?: string;
}

export interface ProjectSummary {
  totalMilestones: number;
  releasedMilestones: number;
  totalAmountBaseUnits: string;
}

export interface ProjectListItem {
  id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  clientId: string;
  freelancerId: string;
  role: ProjectRole;
  otherParty: ProjectParty;
  summary: ProjectSummary;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  sequence: number;
  title: string;
  description: string | null;
  amountBaseUnits: string;
  status: MilestoneStatus;
  escrowAddress: string | null;
  fundTxSignature: string | null;
  releaseTxSignature: string | null;
  refundTxSignature: string | null;
  fundedAt: string | null;
  submittedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail {
  id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  clientId: string;
  freelancerId: string;
  client: ProjectParty;
  freelancer: ProjectParty;
  role: ProjectRole;
  milestones: ProjectMilestone[];
  summary: ProjectSummary;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListResponse {
  items: ProjectListItem[];
  hasMore: boolean;
  limit: number;
  offset: number;
}

export interface CreateProjectRequest {
  title: string;
  description?: string;
  freelancerEmail: string;
  milestones: Array<{
    title: string;
    description?: string;
    amountBaseUnits: string;
  }>;
}

export interface CreateProjectResponse {
  id: string;
  status: ProjectStatus;
  totalAmountBaseUnits: string;
}

export interface UpdateProjectRequest {
  title?: string;
  description?: string;
}
