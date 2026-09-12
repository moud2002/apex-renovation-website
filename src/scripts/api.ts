const previewPort = '__PORT_5300__';
export const API = previewPort.startsWith('__') ? '' : previewPort;
export async function apiRequest(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await response.json().catch(() => ({message:'The server could not be reached. Please try again.'}));
  if (!response.ok) throw new Error(data.message || 'Something went wrong. Please try again.');
  return data;
}
