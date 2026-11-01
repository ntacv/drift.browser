export const LIVE_TAB_LIMIT = 3;

export const selectLiveTabs = (
  previous: string[],
  activeTabId: string | null,
  existingIds: ReadonlySet<string>,
): string[] => {
  const next = previous.filter((id) => existingIds.has(id) && id !== activeTabId);
  if (activeTabId && existingIds.has(activeTabId)) next.push(activeTabId);
  const limited = next.slice(-LIVE_TAB_LIMIT);
  return limited.length === previous.length && limited.every((id, index) => id === previous[index])
    ? previous
    : limited;
};
