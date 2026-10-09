import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateProjectRequest,
  CreateProjectResponse,
  MilestoneAction,
  ProjectDetail,
  ProjectListResponse,
  ProjectRole,
  UpdateProjectRequest,
} from '../models/project.model';

@Injectable({ providedIn: 'root' })
export class ProjectsApiService {
  private readonly http = inject(HttpClient);

  list(
    role: ProjectRole,
    options: { limit: number; offset: number },
  ): Observable<ProjectListResponse> {
    const params = new HttpParams()
      .set('role', role)
      .set('limit', options.limit)
      .set('offset', options.offset);

    return this.http.get<ProjectListResponse>(`${environment.apiUrl}/projects`, {
      params,
    });
  }

  create(request: CreateProjectRequest): Observable<CreateProjectResponse> {
    return this.http.post<CreateProjectResponse>(`${environment.apiUrl}/projects`, request);
  }

  getById(projectId: string): Observable<ProjectDetail> {
    return this.http.get<ProjectDetail>(`${environment.apiUrl}/projects/${projectId}`);
  }

  update(projectId: string, request: UpdateProjectRequest): Observable<void> {
    return this.http.patch<void>(`${environment.apiUrl}/projects/${projectId}`, request);
  }

  activate(projectId: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/projects/${projectId}/activate`, {});
  }

  delete(projectId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/projects/${projectId}`);
  }

  runMilestoneAction(
    projectId: string,
    milestoneId: string,
    action: MilestoneAction,
  ): Observable<void> {
    return this.http.post<void>(
      `${environment.apiUrl}/projects/${projectId}/milestones/${milestoneId}/${action}`,
      {},
    );
  }
}
