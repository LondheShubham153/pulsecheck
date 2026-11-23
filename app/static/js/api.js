export async function api(path, options) {
  const res = await fetch(path, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(body.detail || res.statusText);
    error.status = res.status;
    throw error;
  }
  return body;
}
