export function formatLocalDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function applyTemplate(template: string, title: string, date = new Date()): string {
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  return template.replace(/{{\s*(date|time|title)\s*}}/gi, (_match, token: string) => {
    if (token.toLowerCase() === "date") return formatLocalDate(date);
    if (token.toLowerCase() === "time") return time;
    return title;
  });
}
