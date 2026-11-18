export interface DateRange {
  start: Date;
  end: Date;
}

export interface ProjectFilters {
  status?: ProjectStatus[];
  dateRange?: DateRange;
  search?: string;
  tags?: string[];
  isPublic?: boolean;
  sortBy?: 'created' | 'updated' | 'title' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface UserFilters {
  role?: UserRole[];
  isActive?: boolean;
  dateRange?: DateRange;
  search?: string;
  sortBy?: 'created' | 'lastLogin' | 'email' | 'displayName';
  sortOrder?: 'asc' | 'desc';
}

export interface TransactionFilters {
  type?: TransactionType[];
  dateRange?: DateRange;
  amountRange?: {
    min: number;
    max: number;
  };
  sortBy?: 'created' | 'amount' | 'type';
  sortOrder?: 'asc' | 'desc';
}

export interface GenerationJobFilters {
  status?: JobStatus[];
  operationType?: OperationType[];
  dateRange?: DateRange;
  userId?: string;
  projectId?: string;
  sortBy?: 'created' | 'updated' | 'completed' | 'status';
  sortOrder?: 'asc' | 'desc';
}