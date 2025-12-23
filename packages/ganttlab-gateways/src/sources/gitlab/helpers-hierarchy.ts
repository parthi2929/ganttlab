import { Task } from 'ganttlab-entities';
import { GitLabGateway } from './GitLabGateway';
import { gitLabHierarchyService } from './GitLabHierarchyService';

/**
 * Issue link types that indicate parent-child relationships
 * - 'is_blocked_by' typically means this issue is a child/subtask
 * - 'blocks' typically means this issue is a parent
 */
interface IssueLink {
  iid: number;
  title: string;
  web_url: string;
  link_type: 'relates_to' | 'blocks' | 'is_blocked_by';
}

/**
 * Build parent-child hierarchy using GitLab's issue_type field
 *
 * In GitLab:
 * - issue_type='issue' = PARENT (root level)
 * - issue_type='task' = CHILD (belongs under an issue)
 *
 * Tasks are children of Issues. We match them by finding Issues that have
 * tasks (has_tasks=true) and linking Tasks to their parent Issues.
 *
 * @param tasks - Array of tasks to analyze and update
 */
function internalBuildHierarchyFromIssueType(tasks: Task[]): void {
  console.log('=== buildHierarchyFromIssueType START ===');
  console.log('Total tasks:', tasks.length);

  // Separate Issues and Tasks based on issue_type
  const issues: Task[] = [];
  const gitlabTasks: Task[] = [];

  for (const task of tasks) {
    if (task.isGitLabTask) {
      gitlabTasks.push(task);
      console.log(`  Task (iid:${task.iid}): "${task.title}"`);
    } else {
      issues.push(task);
      if (task.hasChildren) {
        console.log(`  Issue with children (iid:${task.iid}): "${task.title}"`);
      }
    }
  }

  console.log(`Found ${issues.length} Issues, ${gitlabTasks.length} Tasks`);

  // For each Task, find its parent Issue
  // GitLab Tasks belong to Issues - we need to match them
  // Since the API doesn't directly give us parent_id, we use naming pattern as a hint
  // BUT the issue_type is the source of truth for what IS a task vs issue

  for (const gitlabTask of gitlabTasks) {
    if (!gitlabTask.iid) continue;

    const taskTitle = gitlabTask.title.trim().toLowerCase();

    // Find the Issue that this Task belongs to
    // Strategy: Find an Issue whose title is a prefix of this Task's title
    // OR find an Issue that has_tasks=true and matches by some criteria

    let bestMatch: Task | null = null;
    let bestMatchLength = 0;

    for (const issue of issues) {
      if (!issue.iid) continue;

      const issueTitle = issue.title.trim().toLowerCase();

      // Check if task title starts with issue title (task is a subtask of this issue)
      if (
        taskTitle.startsWith(issueTitle) &&
        issueTitle.length > bestMatchLength
      ) {
        // Make sure there's a separator after the issue title
        if (taskTitle.length > issueTitle.length) {
          const suffix = taskTitle.slice(issueTitle.length);
          if (/^[\s\-_:&]+/.test(suffix)) {
            bestMatch = issue;
            bestMatchLength = issueTitle.length;
          }
        }
      }
    }

    if (bestMatch) {
      // Link Task to its parent Issue
      gitlabTask.parentIid = bestMatch.iid;
      bestMatch.hasChildren = true;

      console.log(
        `✓ Linked Task "${gitlabTask.title}" (iid:${gitlabTask.iid}) → Issue "${bestMatch.title}" (iid:${bestMatch.iid})`,
      );
    } else {
      console.log(
        `⚠ No parent found for Task "${gitlabTask.title}" (iid:${gitlabTask.iid})`,
      );
    }
  }

  console.log('=== buildHierarchyFromIssueType END ===');

  // Final summary
  const childTasks = tasks.filter((t) => t.parentIid);
  const rootTasks = tasks.filter((t) => !t.parentIid);
  console.log(
    `Root tasks (${rootTasks.length}):`,
    rootTasks
      .map((t) => `${t.isGitLabTask ? 'Task' : 'Issue'}: ${t.title}`)
      .slice(0, 5),
  );
  console.log(
    `Child tasks (${childTasks.length}):`,
    childTasks.map((t) => t.title),
  );
}

/**
 * Enrich tasks with hierarchy information using GitLab Issue Links REST API
 * This function fetches parent/child relationships for all tasks
 *
 * @param gateway - GitLab gateway instance
 * @param projectPath - Full project path (e.g., "group/project")
 * @param tasks - Array of tasks to enrich
 * @returns Promise that resolves when enrichment is complete
 */
export async function enrichTasksWithHierarchy(
  gateway: GitLabGateway,
  projectPath: string,
  tasks: Task[],
): Promise<void> {
  console.log('=== enrichTasksWithHierarchy START ===');
  console.log('Project path:', projectPath);
  console.log('Number of tasks:', tasks.length);

  // Extract IIDs from tasks
  const iids = tasks
    .filter((task) => task.iid)
    .map((task) => task.iid as string);

  console.log('Task IIDs:', iids);

  if (iids.length === 0) {
    console.log('No tasks with IIDs found, skipping hierarchy enrichment');
    return;
  }

  // Create a set of IIDs for quick lookup (to check if linked issues are in our list)
  const iidSet = new Set(iids);

  // Track parent-child relationships
  const parentMap = new Map<string, string>(); // childIid -> parentIid
  const childrenMap = new Map<string, Set<string>>(); // parentIid -> Set of childIids

  try {
    // First, try the REST API Issue Links approach (more reliable)
    const encodedProject = encodeURIComponent(projectPath);

    // Fetch links for each issue
    await Promise.all(
      tasks.map(async (task) => {
        if (!task.iid) return;

        try {
          const { data } = await gateway.safeAxiosRequest<IssueLink[]>({
            method: 'GET',
            url: `/projects/${encodedProject}/issues/${task.iid}/links`,
          });

          for (const link of data) {
            const linkedIid = String(link.iid);

            // Only consider links to issues that are in our current list
            if (!iidSet.has(linkedIid)) continue;

            // 'blocks' means this issue blocks another -> this is a parent
            // 'is_blocked_by' means this issue is blocked by another -> this is a child
            if (link.link_type === 'blocks') {
              // Current task is the PARENT of the linked issue
              if (!childrenMap.has(task.iid)) {
                childrenMap.set(task.iid, new Set());
              }
              const children = childrenMap.get(task.iid);
              if (children) children.add(linkedIid);
              parentMap.set(linkedIid, task.iid);
            } else if (link.link_type === 'is_blocked_by') {
              // Current task is a CHILD of the linked issue
              parentMap.set(task.iid, linkedIid);
              if (!childrenMap.has(linkedIid)) {
                childrenMap.set(linkedIid, new Set());
              }
              const parentChildren = childrenMap.get(linkedIid);
              if (parentChildren) parentChildren.add(task.iid);
            }
          }
        } catch (error) {
          // Individual link fetch failed, continue with others
          console.warn(`Failed to fetch links for issue ${task.iid}:`, error);
        }
      }),
    );

    // Apply hierarchy information to tasks
    for (const task of tasks) {
      if (!task.iid) continue;

      // Set parent information
      const parentIid = parentMap.get(task.iid);
      if (parentIid) {
        task.parentIid = parentIid;
      }

      // Set children flag
      const children = childrenMap.get(task.iid);
      if (children && children.size > 0) {
        task.hasChildren = true;
      }
    }

    console.log('Hierarchy enrichment complete:', {
      totalTasks: tasks.length,
      tasksWithParent: Array.from(parentMap.keys()).length,
      tasksWithChildren: Array.from(childrenMap.keys()).filter(
        (k) => (childrenMap.get(k)?.size ?? 0) > 0,
      ).length,
      parentChildRelations: Array.from(parentMap.entries()).map(
        ([child, parent]) => `${child} -> ${parent}`,
      ),
    });

    // If no relationships found via links, build hierarchy using issue_type
    // Issues (issue_type='issue') are parents, Tasks (issue_type='task') are children
    if (parentMap.size === 0) {
      console.log(
        'No issue links found, building hierarchy from issue_type...',
      );
      internalBuildHierarchyFromIssueType(tasks);
    }
  } catch (error) {
    console.warn('Failed to enrich tasks with hierarchy via REST API:', error);

    // Fallback to GraphQL approach
    try {
      const hierarchyMap = await gitLabHierarchyService.batchFetchHierarchy(
        gateway,
        projectPath,
        iids,
      );

      for (const task of tasks) {
        if (!task.iid) continue;

        const hierarchyInfo = hierarchyMap.get(task.iid);
        if (hierarchyInfo) {
          if (hierarchyInfo.hasParent && hierarchyInfo.parent) {
            task.parentIid = hierarchyInfo.parent.iid;
          }
          if (hierarchyInfo.hasChildren) {
            task.hasChildren = true;
          }
        }
      }
    } catch (graphqlError) {
      console.warn('GraphQL fallback also failed:', graphqlError);
    }
  }
}

/**
 * Fetch children for a specific task
 * This is called lazily when a task is expanded
 *
 * @param gateway - GitLab gateway instance
 * @param projectPath - Full project path
 * @param parentTask - Parent task to fetch children for
 * @returns Array of child tasks
 */
export async function fetchChildrenForTask(
  gateway: GitLabGateway,
  projectPath: string,
  parentTask: Task,
): Promise<Task[]> {
  if (!parentTask.iid) return [];

  try {
    const result = await gitLabHierarchyService.fetchChildren(
      gateway,
      projectPath,
      parentTask.iid as string,
    );

    const children: Task[] = [];

    for (const childInfo of result.children) {
      // Create a basic task for the child
      // In a real scenario, we'd need to fetch full issue details
      const childTask = new Task(
        childInfo.title,
        childInfo.webUrl,
        parentTask.start, // Inherit parent's start for now
        parentTask.due, // Inherit parent's due for now
      );

      childTask.iid = childInfo.iid;
      childTask.parentIid = parentTask.iid;
      childTask.depth = (parentTask.depth || 0) + 1;

      children.push(childTask);
    }

    // Handle pagination if needed
    if (result.hasMore && result.endCursor) {
      let cursor = result.endCursor;
      while (cursor) {
        const nextResult = await gitLabHierarchyService.fetchChildren(
          gateway,
          projectPath,
          parentTask.iid as string,
          100,
          cursor,
        );

        for (const childInfo of nextResult.children) {
          const childTask = new Task(
            childInfo.title,
            childInfo.webUrl,
            parentTask.start,
            parentTask.due,
          );
          childTask.iid = childInfo.iid;
          childTask.parentIid = parentTask.iid;
          childTask.depth = (parentTask.depth || 0) + 1;
          children.push(childTask);
        }

        if (!nextResult.hasMore || !nextResult.endCursor) break;
        cursor = nextResult.endCursor;
      }
    }

    return children;
  } catch (error) {
    console.warn(`Failed to fetch children for task ${parentTask.iid}:`, error);
    return [];
  }
}

/**
 * Try to use fallback REST API to get hierarchy when GraphQL is unavailable
 *
 * @param gateway - GitLab gateway instance
 * @param projectPath - Full project path
 * @param tasks - Array of tasks to enrich
 */
export async function enrichTasksWithHierarchyFallback(
  gateway: GitLabGateway,
  projectPath: string,
  tasks: Task[],
): Promise<void> {
  for (const task of tasks) {
    if (!task.iid) continue;

    try {
      const linkInfo = await gitLabHierarchyService.fetchLinksAsFallback(
        gateway,
        projectPath,
        task.iid,
      );

      if (linkInfo.parent) {
        task.parentIid = linkInfo.parent.iid;
      }

      if (linkInfo.children.length > 0) {
        task.hasChildren = true;
      }
    } catch (error) {
      // Silently continue
    }
  }
}
