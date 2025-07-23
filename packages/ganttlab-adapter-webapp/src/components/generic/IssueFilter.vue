<template>
  <div class="h-full w-64 p-3 border-l border-lead-500">
    <p class="pb-2 text-xs tracking-wider text-lead-300">SEARCH</p>
    <div class="flex flex-col space-y-2">
      <!-- Search Input with Badge -->
      <div class="relative">
        <input
          id="issue-filter"
          v-model="localSearchTerm"
          type="text"
          placeholder="Filter issues…"
          class="w-full px-2 py-1 text-sm bg-lead-700 text-lead-100 rounded border border-lead-600 focus:border-lead-400 focus:outline-none"
          :class="{ 'border-red-500 bg-red-900': hasRegexError }"
          @input="onSearchInput"
        />
        <div
          v-if="showBadge"
          class="absolute right-1 top-1 px-2 py-0.5 text-xs bg-lead-500 text-lead-200 rounded"
        >
          {{ visibleCount }} / {{ totalCount }}
        </div>
      </div>

      <!-- Mode Toggle -->
      <div class="flex rounded border border-lead-600 overflow-hidden">
        <button
          type="button"
          class="flex-1 px-2 py-1 text-xs transition duration-125 ease-in"
          :class="
            searchMode === 'simple'
              ? 'bg-lead-400 text-lead-900'
              : 'bg-lead-700 text-lead-300 hover:bg-lead-600'
          "
          @click="setSearchMode('simple')"
        >
          Simple
        </button>
        <button
          type="button"
          class="flex-1 px-2 py-1 text-xs transition duration-125 ease-in"
          :class="
            searchMode === 'regex'
              ? 'bg-lead-400 text-lead-900'
              : 'bg-lead-700 text-lead-300 hover:bg-lead-600'
          "
          @click="setSearchMode('regex')"
        >
          Regex
        </button>
      </div>

      <!-- Error Message for Invalid Regex -->
      <div
        v-if="hasRegexError"
        class="text-xs text-red-400 bg-red-900 bg-opacity-50 px-2 py-1 rounded"
      >
        Invalid regex pattern: {{ regexError }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from 'vue-property-decorator';
import { getModule } from 'vuex-module-decorators';
import MainModule from '../../store/modules/MainModule';
import { trackInteractionEvent } from '../../helpers/GTM';

const mainState = getModule(MainModule);

@Component
export default class IssueFilter extends Vue {
  @Prop({ type: Number, default: 0 }) readonly totalCount!: number;
  @Prop({ type: Number, default: 0 }) readonly visibleCount!: number;

  private localSearchTerm = '';
  private debounceTimer: number | null = null;
  private regexError = '';

  get searchTerm(): string {
    return mainState.issueFilterTerm || '';
  }

  get searchMode(): 'simple' | 'regex' {
    return mainState.issueFilterMode || 'simple';
  }

  get showBadge(): boolean {
    return (
      this.totalCount > 0 &&
      (this.searchTerm.length > 0 || this.visibleCount !== this.totalCount)
    );
  }

  get hasRegexError(): boolean {
    return this.searchMode === 'regex' && this.regexError.length > 0;
  }

  mounted() {
    // Initialize local search term from store
    this.localSearchTerm = this.searchTerm;
  }

  @Watch('searchTerm')
  onSearchTermChange(newTerm: string) {
    if (this.localSearchTerm !== newTerm) {
      this.localSearchTerm = newTerm;
    }
  }

  onSearchInput() {
    // Clear any existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set new timer for debounced search (300ms as per PRD requirement FR-2)
    this.debounceTimer = window.setTimeout(() => {
      this.updateSearchTerm();
    }, 300);
  }

  updateSearchTerm() {
    const term = this.localSearchTerm.trim();

    // Validate regex if in regex mode
    if (this.searchMode === 'regex' && term.length > 0) {
      try {
        new RegExp(term, 'i');
        this.regexError = '';
      } catch (error) {
        this.regexError =
          error instanceof Error ? error.message : 'Invalid regex';
        // Don't update the filter if regex is invalid (FR-4)
        return;
      }
    } else {
      this.regexError = '';
    }

    // Update store with new search term
    mainState.setIssueFilterTerm(term);

    // Track analytics
    if (term.length > 0) {
      trackInteractionEvent('Filter', 'Search', this.searchMode);
    } else {
      trackInteractionEvent('Filter', 'Clear');
    }
  }

  setSearchMode(mode: 'simple' | 'regex') {
    if (mode !== this.searchMode) {
      mainState.setIssueFilterMode(mode);

      // Re-validate current term with new mode
      if (this.searchTerm.length > 0) {
        this.updateSearchTerm();
      }

      // Track analytics
      trackInteractionEvent('Filter', 'Mode Change', mode);
    }
  }

  beforeDestroy() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
}
</script>
