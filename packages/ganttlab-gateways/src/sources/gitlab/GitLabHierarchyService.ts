import { GitLabGateway } from './GitLabGateway';

/**
 * WorkItem hierarchy widget response from GitLab GraphQL
 */
interface WorkItemHierarchyWidget {
  hasParent?: boolean;
  parent?: {
    iid: string;
    title: string;
    webUrl: string;
  };
  hasChildren?: boolean;
  children?: {
    nodes: Array<{
      iid: string;
      title: string;
      webUrl: string;
    }>;
    pageInfo: {
      endCursor: string;
      hasNextPage: boolean;
    };
  };
}

interface WorkItemResponse {
  project: {
    workItem: {
      iid: string;
      title: string;
      widgets: WorkItemHierarchyWidget[];
    };
  };
}

/**
 * Service for fetching issue hierarchy from GitLab GraphQL API
 */
export class GitLabHierarchyService {
  /**
   * Fetch hierarchy information for a work item
   */
  async fetchHierarchy(
    gateway: GitLabGateway,
    projectPath: string,
    iid: string,
  ): Promise<WorkItemHierarchyWidget | null> {
    try {
      const query = `
        query getWorkItemHierarchy($fullPath: ID!, $iid: String!) {
          project(fullPath: $fullPath) {
            workItem(iid: $iid) {
              iid
              title
              widgets {
                ... on WorkItemWidgetHierarchy {
                  hasParent
                  parent { iid title webUrl }
                  hasChildren
                }
              }
            }
          }
        }
      `;

      const { data } = await gateway.safeAxiosRequest<{
        data: WorkItemResponse;
      }>({
        method: 'POST',
        url: '/graphql',
        data: {
          query,
          variables: {
            fullPath: projectPath,
            iid,
          },
        },
      });

      if (data.data?.project?.workItem?.widgets) {
        // Find the hierarchy widget
        for (const widget of data.data.project.workItem.widgets) {
          if (
            widget.hasParent !== undefined ||
            widget.hasChildren !== undefined
          ) {
            return widget;
          }
        }
      }

      return null;
    } catch (error) {
      console.warn(`Failed to fetch hierarchy for issue ${iid}:`, error);
      return null;
    }
  }

  /**
   * Fetch children for a work item
   */
  async fetchChildren(
    gateway: GitLabGateway,
    projectPath: string,
    iid: string,
    first = 100,
    after?: string,
  ): Promise<{
    children: Array<{ iid: string; title: string; webUrl: string }>;
    hasMore: boolean;
    endCursor?: string;
  }> {
    try {
      const query = `
        query getWorkItemChildren($fullPath: ID!, $iid: String!, $first: Int!, $after: String) {
          project(fullPath: $fullPath) {
            workItem(iid: $iid) {
              iid
              title
              widgets {
                ... on WorkItemWidgetHierarchy {
                  children(first: $first, after: $after) {
                    nodes { iid title webUrl }
                    pageInfo { endCursor hasNextPage }
                  }
                }
              }
            }
          }
        }
      `;

      const { data } = await gateway.safeAxiosRequest<{
        data: WorkItemResponse;
      }>({
        method: 'POST',
        url: '/graphql',
        data: {
          query,
          variables: {
            fullPath: projectPath,
            iid,
            first,
            after,
          },
        },
      });

      if (data.data?.project?.workItem?.widgets) {
        for (const widget of data.data.project.workItem.widgets) {
          if (widget.children) {
            return {
              children: widget.children.nodes,
              hasMore: widget.children.pageInfo.hasNextPage,
              endCursor: widget.children.pageInfo.endCursor,
            };
          }
        }
      }

      return { children: [], hasMore: false };
    } catch (error) {
      console.warn(`Failed to fetch children for issue ${iid}:`, error);
      return { children: [], hasMore: false };
    }
  }

  /**
   * Batch fetch hierarchy information for multiple issues
   * Uses GraphQL aliases to fetch up to 50 issues in one request
   */
  async batchFetchHierarchy(
    gateway: GitLabGateway,
    projectPath: string,
    iids: string[],
  ): Promise<Map<string, WorkItemHierarchyWidget>> {
    const result = new Map<string, WorkItemHierarchyWidget>();
    const batchSize = 50;

    // Process in batches of 50
    for (let i = 0; i < iids.length; i += batchSize) {
      const batch = iids.slice(i, i + batchSize);
      const batchResult = await this.fetchHierarchyBatch(
        gateway,
        projectPath,
        batch,
      );
      batchResult.forEach((value, key) => result.set(key, value));
    }

    return result;
  }

  /**
   * Fetch hierarchy for a batch of issues using GraphQL aliases
   */
  private async fetchHierarchyBatch(
    gateway: GitLabGateway,
    projectPath: string,
    iids: string[],
  ): Promise<Map<string, WorkItemHierarchyWidget>> {
    const result = new Map<string, WorkItemHierarchyWidget>();

    try {
      // Build query with aliases
      const aliases = iids.map(
        (iid) => `
        issue_${iid}: workItem(iid: "${iid}") {
          iid
          title
          widgets {
            ... on WorkItemWidgetHierarchy {
              hasParent
              parent { iid title webUrl }
              hasChildren
            }
          }
        }
      `,
      );

      const query = `
        query batchGetWorkItemHierarchy($fullPath: ID!) {
          project(fullPath: $fullPath) {
            ${aliases.join('\n')}
          }
        }
      `;

      const { data } = await gateway.safeAxiosRequest<{
        data: {
          project?: Record<string, { widgets?: WorkItemHierarchyWidget[] }>;
        };
      }>({
        method: 'POST',
        url: '/graphql',
        data: {
          query,
          variables: {
            fullPath: projectPath,
          },
        },
      });

      if (data.data?.project) {
        // Process each aliased response
        for (const iid of iids) {
          const workItem = data.data.project[`issue_${iid}`];
          if (workItem?.widgets) {
            for (const widget of workItem.widgets) {
              if (
                widget.hasParent !== undefined ||
                widget.hasChildren !== undefined
              ) {
                result.set(iid, widget);
                break;
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to batch fetch hierarchy:', error);
    }

    return result;
  }
}

export const gitLabHierarchyService = new GitLabHierarchyService();
