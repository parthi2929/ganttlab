import {
  SourceVisitor,
  PaginatedListOfTasks,
  Configuration,
  Group,
  Sort,
  Filter,
} from 'ganttlab-entities';
import { ViewGroupGitLabStrategy } from './strategies/ViewGroupGitLabStrategy';

export class ViewGroup extends SourceVisitor<PaginatedListOfTasks> {
  public slug = 'group';
  public name = 'By group';
  public shortDescription = 'Issues within a group';
  public slugStrategies = {
    gitlab: new ViewGroupGitLabStrategy(),
  };

  public configuration: Configuration = {
    group: null as Group | null,
    tasks: {
      page: 1,
      pageSize: 50,
    },
  };

  setSort(sort: Sort): void {
    throw new Error('Method not implemented.');
  }
  reverseSort(): void {
    throw new Error('Method not implemented.');
  }
  setFilter(filter: Filter): void {
    throw new Error('Method not implemented.');
  }
}
