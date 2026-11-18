export interface GetProjectsRequest {
  filters?: ProjectFilters;
  pagination?: PaginationParams;
}

export interface GetProjectsResponse extends PaginatedResponse<Project> {}

export interface GetProjectRequest {
  projectId: string;
}

export interface GetProjectResponse {
  project: Project;
}

export interface CreateProjectResponse {
  project: Project;
}

export interface UpdateProjectResponse {
  project: Project;
}

export interface DeleteProjectRequest {
  projectId: string;
}

export interface UploadAssetRequest {
  projectId: string;
  file: File;
  metadata?: {
    description?: string;
    tags?: string[];
  };
}

export interface UploadAssetResponse {
  asset: MediaAsset;
  uploadUrl?: string; // For direct S3 upload
}

export interface DeleteAssetRequest {
  projectId: string;
  assetId: string;
}

export interface ShareProjectRequest {
  projectId: string;
  settings: ShareSettings;
}

export interface ShareProjectResponse {
  shareUrl: string;
  settings: ShareSettings;
}