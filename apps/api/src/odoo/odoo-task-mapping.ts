import type { BakkiTaskType, BakkiWorkflowState } from '@bakki/domain';

export interface OdooTaskStageCandidate {
  fold?: boolean | false;
  id: number;
  name?: string | false;
  project_ids?: number[] | false;
  sequence?: number | false;
}

const TASK_TYPE_PATTERNS: Record<BakkiTaskType, RegExp[]> = {
  planting: [/\bplant/i, /\bsapling/i, /\breforest/i, /\bseedling/i],
  monitoring: [/\bmonitor/i, /\binspect/i, /\bsurvey/i, /\bdensity/i, /\baudit/i],
  fertilizing: [/\bfertili[sz]/i, /\bnutrient/i, /\bfeed/i],
};

const WORKFLOW_PATTERNS: Record<BakkiWorkflowState, RegExp[]> = {
  pending: [/\bto do\b/i, /\btodo\b/i, /\bnew\b/i, /\bbacklog\b/i, /\bready\b/i, /\bplanned\b/i, /\bassigned\b/i],
  in_progress: [/\bin progress\b/i, /\bprogress\b/i, /\bdoing\b/i, /\bactive\b/i, /\bongoing\b/i, /\bworking\b/i],
  done: [/\bdone\b/i, /\bcomplete/i, /\bfinished\b/i, /\bclosed\b/i, /\bresolved\b/i],
  cancelled: [/\bcancel/i, /\babort/i, /\breject/i, /\bdrop/i],
};

export function inferTaskTypeFromTitle(title: string | null | undefined): BakkiTaskType | null {
  if (!title?.trim()) {
    return null;
  }

  for (const [taskType, patterns] of Object.entries(TASK_TYPE_PATTERNS) as Array<
    [BakkiTaskType, RegExp[]]
  >) {
    if (patterns.some((pattern) => pattern.test(title))) {
      return taskType;
    }
  }

  return null;
}

export function inferWorkflowStateFromStageLabel(label: string | null | undefined): BakkiWorkflowState {
  const normalized = label?.trim();
  if (!normalized) {
    return 'pending';
  }

  for (const state of ['cancelled', 'done', 'in_progress', 'pending'] as const) {
    if (WORKFLOW_PATTERNS[state].some((pattern) => pattern.test(normalized))) {
      return state;
    }
  }

  return 'pending';
}

export function chooseStageIdForWorkflowState(
  stages: OdooTaskStageCandidate[],
  workflowState: BakkiWorkflowState,
  projectId?: number | null,
) {
  const projectScoped = projectId
    ? stages.filter((stage) => stageMatchesProject(stage, projectId))
    : stages;
  const candidates = projectScoped.length > 0 ? projectScoped : stages;

  if (candidates.length === 0) {
    return null;
  }

  const exactStateMatches = candidates.filter(
    (stage) => inferWorkflowStateFromStageLabel(readStageName(stage.name)) === workflowState,
  );

  if (exactStateMatches.length > 0) {
    return pickBestStageMatch(exactStateMatches, workflowState)?.id ?? null;
  }

  if (workflowState === 'done') {
    const folded = candidates
      .filter((stage) => stage.fold)
      .sort(compareBySequenceThenId);
    return folded.at(-1)?.id ?? null;
  }

  if (workflowState === 'pending') {
    return [...candidates].sort(compareBySequenceThenId)[0]?.id ?? null;
  }

  if (workflowState === 'in_progress') {
    const nonFolded = candidates.filter((stage) => !stage.fold).sort(compareBySequenceThenId);
    return nonFolded[1]?.id ?? nonFolded[0]?.id ?? null;
  }

  return null;
}

function stageMatchesProject(stage: OdooTaskStageCandidate, projectId: number) {
  if (!Array.isArray(stage.project_ids) || stage.project_ids.length === 0) {
    return true;
  }

  return stage.project_ids.includes(projectId);
}

function pickBestStageMatch(
  candidates: OdooTaskStageCandidate[],
  workflowState: BakkiWorkflowState,
) {
  const sorted = [...candidates].sort((left, right) => {
    const leftScore = scoreStage(left, workflowState);
    const rightScore = scoreStage(right, workflowState);
    if (leftScore !== rightScore) {
      return rightScore - leftScore;
    }

    return compareBySequenceThenId(left, right);
  });

  return sorted[0] ?? null;
}

function scoreStage(stage: OdooTaskStageCandidate, workflowState: BakkiWorkflowState) {
  let score = 0;
  const name = readStageName(stage.name);

  for (const pattern of WORKFLOW_PATTERNS[workflowState]) {
    if (pattern.test(name)) {
      score += 10;
    }
  }

  if (workflowState === 'done' && stage.fold) {
    score += 3;
  }

  if (workflowState === 'in_progress' && !stage.fold) {
    score += 1;
  }

  return score;
}

function compareBySequenceThenId(left: OdooTaskStageCandidate, right: OdooTaskStageCandidate) {
  const leftSequence = typeof left.sequence === 'number' ? left.sequence : 9999;
  const rightSequence = typeof right.sequence === 'number' ? right.sequence : 9999;
  if (leftSequence !== rightSequence) {
    return leftSequence - rightSequence;
  }

  return left.id - right.id;
}

function readStageName(name: OdooTaskStageCandidate['name']) {
  return typeof name === 'string' ? name : '';
}
