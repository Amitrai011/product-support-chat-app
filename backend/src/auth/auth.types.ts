/** Shape of the JWT payload we sign and later attach to requests/sockets. */
export interface JwtPayload {
  sub: string; // user id
  email: string;
  name: string;
  role: 'customer' | 'agent';
}

/** The authenticated principal available on requests and sockets. */
export type AuthUser = JwtPayload;
