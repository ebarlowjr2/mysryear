import { auth0 } from '../../../../../lib/auth0';

export async function GET() {
  return auth0.startInteractiveLogin({
    returnTo: '/dashboard'
  });
}
