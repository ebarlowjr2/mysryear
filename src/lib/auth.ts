export type Session = { user: { id: string; name?: string | null; email?: string | null; image?: string | null } };
export async function getSession(): Promise<Session | null> { 
  return { user: { id: "demo", name: "Test User", email: "test@example.com" } }; // temporary for testing
}
