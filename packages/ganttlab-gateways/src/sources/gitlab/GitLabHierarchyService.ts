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

interface WorkItemsResponse {
  project: {
    workItems: {
      nodes: Array<{
        iid: string;
        title: string;
        widgets: WorkItemHierarchyWidget[];
      }>;
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
        query getWorkItemHierarchy($fullPath: ID!, $iids: [String!]!) {
          project(fullPath: $fullPath) {
            workItems(iids: $iids) {
              nodes {
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
        }
      `;

      const baseUrl = gateway.getUrl();
      const { data } = await gateway.safeAxiosRequest<{
        data: WorkItemsResponse;
      }>({
        method: 'POST',
        url: `${baseUrl}/api/graphql`,
        data: {
          query,
          variables: {
            fullPath: projectPath,
            iids: [iid],
          },
        },
      });

      if (data.data?.project?.workItems?.nodes?.[0]?.widgets) {
        // Find the hierarchy widget from the first node
        for (const widget of data.data.project.workItems.nodes[0].widgets) {
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
        query getWorkItemChildren($fullPath: ID!, $iids: [String!]!, $first: Int!, $after: String) {
          project(fullPath: $fullPath) {
            workItems(iids: $iids) {
              nodes {
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
        }
      `;

      const baseUrl = gateway.getUrl();
      const { data } = await gateway.safeAxiosRequest<{
        data: WorkItemsResponse;
      }>({
        method: 'POST',
        url: `${baseUrl}/api/graphql`,
        data: {
          query,
          variables: {
            fullPath: projectPath,
            iids: [iid],
            first,
            after,
          },
        },
      });

      if (data.data?.project?.workItems?.nodes?.[0]?.widgets) {
        for (const widget of data.data.project.workItems.nodes[0].widgets) {
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
   * Fetches up to 50 issues per request using workItems query
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
   * Fetch hierarchy for a batch of issues using workItems query
   */
  private async fetchHierarchyBatch(
    gateway: GitLabGateway,
    projectPath: string,
    iids: string[],
  ): Promise<Map<string, WorkItemHierarchyWidget>> {
    const result = new Map<string, WorkItemHierarchyWidget>();

    try {
      const query = `
        query batchGetWorkItemHierarchy($fullPath: ID!, $iids: [String!]!) {
          project(fullPath: $fullPath) {
            workItems(iids: $iids) {
              nodes {
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
        }
      `;

      const baseUrl = gateway.getUrl();
      const { data } = await gateway.safeAxiosRequest<{
        data: WorkItemsResponse;
      }>({
        method: 'POST',
        url: `${baseUrl}/api/graphql`,
        data: {
          query,
          variables: {
            fullPath: projectPath,
            iids,
          },
        },
      });

      if (data.data?.project?.workItems?.nodes) {
        // Process each work item in the response
        for (const workItem of data.data.project.workItems.nodes) {
          if (workItem.widgets) {
            for (const widget of workItem.widgets) {
              if (
                widget.hasParent !== undefined ||
                widget.hasChildren !== undefined
              ) {
                result.set(workItem.iid, widget);
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
