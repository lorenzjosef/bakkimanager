import { IsIn } from 'class-validator';
import type { BakkiWorkflowState, UpdateTaskWorkflowRequest } from '@bakki/domain';

export class UpdateTaskWorkflowDto implements UpdateTaskWorkflowRequest {
  @IsIn(['pending', 'in_progress', 'done', 'cancelled'])
  workflowState!: BakkiWorkflowState;
}
