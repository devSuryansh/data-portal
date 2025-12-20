/**
 * Centralized selector definitions.
 *
 * WHY THIS FILE EXISTS:
 * - Keeps selectors out of test logic
 * - Makes UI changes easier to update in one place
 * - Encourages stable selectors (data-testid)
 *
 * RULE:
 * Tests should NOT use raw CSS/XPath unless absolutely necessary.
 */

module.exports = {
  /**
   * Top navigation selectors.
   * These correspond to primary portal navigation items.
   */
  nav: {
    dictionary: '[data-testid="nav-dictionary"]',
    exploration: '[data-testid="nav-exploration"]',
    survival: '[data-testid="nav-survival"]',
    dataRequests: '[data-testid="nav-data-requests"]',
  },

  /**
   * Data Dictionary page selectors.
   */
  dictionary: {
    tableView: '[data-testid="dict-table-view"]',
    graphView: '[data-testid="dict-graph-view"]',
    openProps: '[data-testid="dict-open-properties"]',
    downloadTemplates: '[data-testid="dict-download-templates"]',
    modelLeftPanel: '[data-testid="dict-model-structure-panel"]',
    propsPanelClose: '[data-testid="dict-props-close"]',

    /**
     * XPath selector for dictionary nodes by visible name.
     *
     * Used when nodes are dynamic and cannot be reliably indexed.
     * Example:
     *   nodeByName("Cytology")
     */
    nodeByName: (name) =>
      `//*[self::button or self::div][@data-testid="dict-node" and normalize-space()="${name}"]`,
  },

  /**
   * Filter Workspace controls on the Exploration page.
   */
  workspace: {
    load: '[data-testid="ws-load"]',
    save: '[data-testid="ws-save"]',
    update: '[data-testid="ws-update"]',
    duplicate: '[data-testid="ws-duplicate"]',
    compose: '[data-testid="ws-compose"]',
    share: '[data-testid="ws-share"]',
    reset: '[data-testid="ws-reset"]',
  },
};
