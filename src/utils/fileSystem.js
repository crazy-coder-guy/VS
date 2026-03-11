export const readDirectory = async (dirHandle) => {
  const children = [];
  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file') {
      children.push({
        name: entry.name,
        kind: 'file',
        handle: entry
      });
    } else if (entry.kind === 'directory') {
      children.push({
        name: entry.name,
        kind: 'directory',
        handle: entry,
        children: await readDirectory(entry)
      });
    }
  }
  return children.sort((a, b) => {
    if (a.kind === b.kind) return a.name.localeCompare(b.name);
    return a.kind === 'directory' ? -1 : 1;
  });
};
