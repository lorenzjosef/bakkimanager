/**
 * Tasks API for mobile client.
 */

import { apiRequest } from './client';
import type { CachedTask } from '@bakki/mobile-offline';

export interface TasksResponse {
  tasks: CachedTask[];
}

export interface TaskDetailResponse {
  task: CachedTask;
}

export const tasksApi = {
  /**
   * Get all tasks for the current user.
   */
  async getTasks(): Promise<TasksResponse> {
    const response = await apiRequest<TasksResponse>('/tasks');
    return response.data;
  },

  /**
   * Get a single task by ID.
   */
  async getTask(taskId: string): Promise<TaskDetailResponse> {
    const response = await apiRequest<TaskDetailResponse>(`/tasks/${taskId}`);
    return response.data;
  },
};
