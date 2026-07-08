// Netlify Identity JWT helper for API calls.
// Lives in its own module to avoid an import cycle (auth -> analytics -> db).
export const getAuthToken = async (): Promise<string | null> => {
  try {
    const identity = (window as any).netlifyIdentity;
    const user = identity?.currentUser?.();
    if (!user || typeof user.jwt !== 'function') return null;
    // jwt() refreshes the access token when it is close to expiry
    return await user.jwt();
  } catch {
    return null;
  }
};

export const buildAuthHeaders = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = await getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};
