import { issueDescriptionToTaskDetails } from '../abstracts/helpers';
import { Task, Milestone } from 'ganttlab-entities';
import { GitLabIssue } from './types/GitLabIssue';
import { AxiosHeaders } from '../abstracts/AxiosHeaders';
import { GitLabMilestone } from './types/GitLabMilestone';

export function getTaskFromGitLabIssue(gitlabIssue: GitLabIssue): Task {
  const { startDate, dueDate } = issueDescriptionToTaskDetails(
    gitlabIssue.description,
  );
  const task = new Task(
    gitlabIssue.title,
    gitlabIssue.web_url,
    startDate
      ? startDate
      : gitlabIssue.milestone && gitlabIssue.milestone.start_date
      ? new Date(gitlabIssue.milestone.start_date)
      : new Date(gitlabIssue.created_at),
    dueDate
      ? dueDate
      : gitlabIssue.due_date
      ? new Date(gitlabIssue.due_date)
      : gitlabIssue.milestone && gitlabIssue.milestone.due_date
      ? new Date(gitlabIssue.milestone.due_date)
      : undefined,
  );

  // Add hierarchy information
  if (gitlabIssue.iid) {
    task.iid = String(gitlabIssue.iid);
  }

  // Set issue type from GitLab API
  // issue_type can be: 'issue', 'incident', 'test_case', or 'task'
  const issueType = gitlabIssue.issue_type || gitlabIssue.type;
  if (issueType === 'task') {
    task.isGitLabTask = true;
    task.isGitLabIssue = false;
  } else {
    task.isGitLabIssue = true;
    task.isGitLabTask = false;
  }

  // If has_tasks is true, it has children (subtasks)
  if (gitlabIssue.has_tasks) {
    task.hasChildren = true;
  }

  return task;
}

export function getPaginationFromGitLabHeaders(
  headers: AxiosHeaders,
): {
  previousPage: number | undefined;
  nextPage: number | undefined;
  lastPage: number | undefined;
  total: number | undefined;
} {
  return {
    previousPage: headers['x-prev-page']
      ? parseInt(headers['x-prev-page'])
      : undefined,
    nextPage: headers['x-next-page']
      ? parseInt(headers['x-next-page'])
      : undefined,
    lastPage: headers['x-total-pages']
      ? parseInt(headers['x-total-pages'])
      : undefined,
    total: headers['x-total'] ? parseInt(headers['x-total']) : undefined,
  };
}

export function getMilestoneFromGitLabMilestone(
  gitlabMilestone: GitLabMilestone,
): Milestone {
  return new Milestone(
    gitlabMilestone.title,
    undefined,
    gitlabMilestone.description,
    gitlabMilestone.start_date
      ? new Date(gitlabMilestone.start_date)
      : undefined,
    gitlabMilestone.due_date ? new Date(gitlabMilestone.due_date) : undefined,
  );
}
