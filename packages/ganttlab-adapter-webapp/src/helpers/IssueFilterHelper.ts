import { Task } from 'ganttlab-entities';

export interface FilterResult {
  filteredTasks: Task[];
  totalCount: number;
  visibleCount: number;
}

export function filterTasks(
  tasks: Task[],
  searchTerm: string,
  mode: 'simple' | 'regex',
): FilterResult {
  const totalCount = tasks.length;

  // If no search term, return all tasks
  if (!searchTerm.trim()) {
    return {
      filteredTasks: tasks,
      totalCount,
      visibleCount: totalCount,
    };
  }

  let filteredTasks: Task[] = [];

  if (mode === 'simple') {
    // FR-3: Simple mode performs case-insensitive includes match on issue titles
    const lowerSearchTerm = searchTerm.toLowerCase();
    filteredTasks = tasks.filter((task) =>
      task.title.toLowerCase().includes(lowerSearchTerm),
    );
  } else if (mode === 'regex') {
    // FR-4: Regex mode compiles the pattern using the 'i' flag
    try {
      const regex = new RegExp(searchTerm, 'i');
      filteredTasks = tasks.filter((task) => regex.test(task.title));
    } catch (error) {
      // Invalid regex - return empty results as per FR-4
      filteredTasks = [];
    }
  }

  return {
    filteredTasks,
    totalCount,
    visibleCount: filteredTasks.length,
  };
}

export function isValidRegex(
  pattern: string,
): { valid: boolean; error?: string } {
  try {
    new RegExp(pattern, 'i');
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid regex pattern',
    };
  }
}
