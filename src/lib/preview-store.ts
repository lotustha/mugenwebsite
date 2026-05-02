// Client-side preview cache — persists across navigations within the same session.
// List pages save item data here when a card is clicked.
// Detail pages read from here for instant content before the API responds.

const store = new Map<string, any>();

export function setPreview(key: string, data: any): void {
  store.set(key, data);
}

export function getPreview(key: string): any | undefined {
  return store.get(key);
}
