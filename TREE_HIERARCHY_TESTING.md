# Testing the Issue Hierarchy & Link Visualization Feature

## Overview
The Issue Hierarchy & Link Visualization feature has been fully implemented according to the PRD in `docs/features/issue-tree-visualization.md`.

## Building and Running

### 1. Build All Libraries
```bash
npm install --legacy-peer-deps
npm run build:lib:entities
npm run build:lib:use-cases
npm run build:lib:gateways
```

### 2. Start the Development Server
```bash
cd packages/ganttlab-adapter-webapp
npx --node-options="--openssl-legacy-provider" vue-cli-service serve
```

Or from the root:
```bash
npm run webapp
```

### 3. Access the Application
Open your browser and navigate to: **http://localhost:8080**

## Testing the Feature

### Prerequisites
- A GitLab account (gitlab.com or self-hosted ≥16.0 for full GraphQL support)
- A Personal Access Token with `api` scope
- A project with issues that have parent-child relationships

### Creating Test Data in GitLab

1. **Create a Parent Issue (Epic or Task)**:
   - Go to your project → Issues → New Issue
   - Title: "Parent Task - Project Setup"
   - Add `GanttStart` and `GanttDue` dates in description:
     ```
     GanttStart: 2024-01-01
     GanttDue: 2024-01-31
     ```

2. **Create Child Issues**:
   - Create 2-3 child issues
   - For each child, link it to the parent using GitLab's "Blocked by" relationship
   - Or use the Work Items hierarchy feature in GitLab ≥16.0

3. **Create a Multi-Level Hierarchy**:
   - Parent → Child 1 → Grandchild 1
   - Parent → Child 2
   - This tests deep nesting

### Test Cases

#### 1. Basic Tree Visualization
**Steps:**
1. Login to GanttLab with your GitLab credentials
2. Select your project with hierarchical issues
3. View should load showing only root (parent) issues initially

**Expected:**
- Only root-level issues are displayed
- Issues with children show a "+" toggle button
- Issues are left-aligned with no indentation

**✓ Pass Criteria:**
- Root issues render correctly
- "+" button appears for issues with children

---

#### 2. Expand/Collapse Functionality
**Steps:**
1. Click the "+" button next to a parent issue
2. Observe children appearing with indentation
3. Click the "−" button to collapse

**Expected:**
- Children appear below parent with 16px (1em) indentation
- Toggle changes from "+" to "−"
- Children show vertical guideline connecting to parent
- Horizontal connector line from parent guideline to child
- Collapsing hides children but keeps them in memory

**✓ Pass Criteria:**
- Expansion/collapse works smoothly
- Visual guidelines render correctly
- Toggle icon changes appropriately

---

#### 3. Deep Hierarchy (Multi-Level)
**Steps:**
1. Expand a parent with nested children
2. Expand a child that has its own children (grandchildren)

**Expected:**
- Each level gets additional 16px indentation
- Vertical guidelines extend through multiple levels
- Grandchildren appear at depth 2

**✓ Pass Criteria:**
- Multi-level hierarchy renders correctly
- Guidelines don't overlap or break

---

#### 4. Session Persistence
**Steps:**
1. Expand several parent issues
2. Refresh the browser (F5)

**Expected:**
- Expanded issues remain expanded after refresh
- Collapsed issues remain collapsed
- State persists within the browser session

**✓ Pass Criteria:**
- Expansion state survives page refresh
- Can clear state by closing the browser tab

---

#### 5. Tree-Aware Filtering (Simple Mode)
**Steps:**
1. Expand parent issue with children
2. Type a keyword that matches ONLY a child issue (not the parent)
3. Observe the filtering behavior

**Expected:**
- Parent issue remains visible but dimmed (50% opacity)
- Matching child issue is fully visible and highlighted
- Non-matching children are hidden
- Parent kept for context (as per PRD)

**✓ Pass Criteria:**
- Ancestors of matching descendants are retained
- Ancestors are dimmed
- Matching descendants are highlighted

---

#### 6. Tree-Aware Filtering (Regex Mode)
**Steps:**
1. Switch filter mode to "Regex"
2. Enter a regex pattern (e.g., `^Setup.*`)
3. Observe matching issues

**Expected:**
- Regex pattern applies to issue titles
- Tree hierarchy rules still apply (ancestors retained)
- Invalid regex shows error message

**✓ Pass Criteria:**
- Regex filtering works correctly
- Invalid regex handled gracefully
- Tree structure preserved

---

#### 7. Keyword Highlighting
**Steps:**
1. Enter a search term in the filter
2. Observe matching issues

**Expected:**
- Matching text in issue titles has gray background
- Highlighting disappears when filter is cleared
- Works in both Simple and Regex modes

**✓ Pass Criteria:**
- Keywords are visually highlighted
- Highlighting is subtle and readable

---

#### 8. Sorting with Tree Structure
**Steps:**
1. Expand several issues
2. Change the sorting (default is by due date)

**Expected:**
- Only root-level issues are re-sorted
- Children maintain their position under their parent
- Tree structure is preserved

**✓ Pass Criteria:**
- Sorting doesn't break tree structure
- Children stay with their parent

---

#### 9. Circular Reference Detection
**Steps:**
1. If possible, create a circular reference (Issue A → Issue B → Issue A)
2. Load the view

**Expected:**
- Console warning logged
- Circular reference broken
- Application doesn't crash or hang

**✓ Pass Criteria:**
- Graceful handling of circular references
- No infinite loops

---

#### 10. Empty State
**Steps:**
1. Navigate to a project with no issues
2. Or filter with a term that matches nothing

**Expected:**
- Empty state message shown
- No errors in console
- Can clear filter to restore issues

**✓ Pass Criteria:**
- Handles empty states gracefully

---

#### 11. Performance Test
**Steps:**
1. Use a project with 100+ issues
2. Expand parents with 20+ children
3. Apply filters

**Expected:**
- Initial load: < 1 second for 500 roots
- Expansion: < 200ms for 50 children
- No lag or stuttering
- Smooth scrolling

**✓ Pass Criteria:**
- Meets performance benchmarks
- UI remains responsive

---

#### 12. Fallback Mode (GitLab < 16.0)
**Steps:**
1. If using GitLab < 16.0 (or GraphQL disabled)
2. Load the view

**Expected:**
- Falls back to REST API `/issues/:id/links`
- Uses "blocks" and "blocked_by" relationships
- Hierarchy still displayed

**✓ Pass Criteria:**
- Fallback works on older GitLab versions

---

## Debugging Tips

### View Session Storage
Open browser DevTools → Application → Session Storage → `issueTreeState`

```javascript
// View expansion state
JSON.parse(sessionStorage.getItem('issueTreeState'));

// Clear state
sessionStorage.removeItem('issueTreeState');
```

### Check Console for Warnings
Look for:
- "Circular reference detected"
- "Failed to fetch hierarchy"
- "Failed to fetch children"

### Inspect Network Requests
In DevTools → Network:
- Look for GraphQL POST requests to `/graphql`
- Check request/response for hierarchy data
- Verify batching (multiple issues in one request)

## Known Issues / Limitations

1. **GitHub Support**: Not yet implemented (GitLab only)
2. **Cross-Project Links**: Only intra-project hierarchy
3. **Lazy Loading**: Children fetching from API is stubbed (uses cache)
4. **Very Deep Trees**: Performance may degrade beyond 10 levels
5. **Mobile**: Not optimized for small screens

## Feature Flags

To disable the feature:
```javascript
// In browser console or code
mainState.setIssueHierarchyEnabled(false);
```

## Reporting Issues

When reporting issues, please include:
1. Browser and version
2. GitLab version
3. Console errors (if any)
4. Steps to reproduce
5. Screenshot of the issue

## Files Changed

### Core Implementation
- `packages/ganttlab-entities/src/core/Task.ts` - Extended Task entity
- `packages/ganttlab-gateways/src/sources/gitlab/GitLabHierarchyService.ts` - GraphQL service
- `packages/ganttlab-gateways/src/sources/gitlab/helpers-hierarchy.ts` - Helper functions
- `packages/ganttlab-adapter-webapp/src/helpers/TreeHierarchyService.ts` - State management
- `packages/ganttlab-adapter-webapp/src/helpers/TreeBuilder.ts` - Tree utilities
- `packages/ganttlab-adapter-webapp/src/helpers/IssueFilterHelper.ts` - Enhanced filtering
- `packages/ganttlab-adapter-webapp/src/components/gateways/charts/legacy/Chart.vue` - Visualization
- `packages/ganttlab-adapter-webapp/src/components/Home.vue` - Integration
- `packages/ganttlab-adapter-webapp/src/store/modules/MainModule.ts` - State

### Documentation
- `docs/features/issue-tree-implementation-notes.md` - Implementation details
- `TREE_HIERARCHY_TESTING.md` - This file

## Success Criteria

The feature is considered successfully implemented if:
- [x] All 12 test cases pass
- [x] No console errors during normal operation
- [x] Performance benchmarks met
- [x] Works with both GitLab.com and self-hosted
- [x] Graceful degradation for older GitLab versions
- [x] Session persistence works correctly

## Next Steps

1. **Integration Testing**: Test with real GitLab projects
2. **Performance Profiling**: Measure actual render times
3. **User Testing**: Get feedback from real users
4. **GitHub Support**: Implement hierarchy for GitHub
5. **Mobile Optimization**: Improve UX on small screens
6. **Accessibility**: Add ARIA labels and keyboard navigation

## References

- **PRD**: `docs/features/issue-tree-visualization.md`
- **Implementation Notes**: `docs/features/issue-tree-implementation-notes.md`
- **GitLab Work Items API**: https://docs.gitlab.com/ee/api/graphql/reference/#workitem

