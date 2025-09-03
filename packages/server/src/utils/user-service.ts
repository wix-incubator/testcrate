import type { UserId, UserRole, UserService } from '@testcrate/core';

interface AuthConfig {
  adminApiKey?: string;
  agentApiKey?: string;
  userApiKey?: string;
}

export class SimpleUserService implements UserService {
  private readonly userId: UserId | null = null;
  private readonly userRole: UserRole | null = null;

  constructor(
    private readonly request: Request,
    private readonly authConfig: AuthConfig,
  ) {
    const authHeader = this.request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('no auth header');
      return;
    }


    const token = authHeader.slice(7); // Remove 'Bearer ' prefix
    if (this.authConfig.userApiKey && token === this.authConfig.userApiKey) {
      this.userRole = 'user';
      this.userId = 'user';
    } else if (this.authConfig.agentApiKey && token === this.authConfig.agentApiKey) {
      this.userRole = 'agent';
      this.userId = 'agent';
    } else if (this.authConfig.adminApiKey && token === this.authConfig.adminApiKey) {
      this.userRole = 'admin';
      this.userId = 'admin';
    } else if (!this.authConfig.userApiKey) {
      this.userRole = 'user';
      this.userId = 'anonymous';
    }
  }

  getUserId(): UserId | null {
    return this.userId;
  }

  getUserRole(): UserRole | null {
    return this.userRole;
  }
}
