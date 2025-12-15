import { useAuth } from '../contexts/AuthContext'

export function useSession() {
  const { session, user, loading } = useAuth()
  return { session, user, loading }
}
