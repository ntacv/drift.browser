export const SOURCE_PAGE_SIZE = 16000;

export function sourcePage(html: string, index: number) {
  const pages = Math.max(1, Math.ceil(html.length / SOURCE_PAGE_SIZE));
  const page = Math.min(pages - 1, Math.max(0, Math.floor(index)));
  return { text: html.slice(page * SOURCE_PAGE_SIZE, (page + 1) * SOURCE_PAGE_SIZE), page, pages };
}
