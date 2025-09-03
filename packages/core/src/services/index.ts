import type {TimeService, UserService} from '@core/types';

export const DefaultTimeService: TimeService = {
  now: () => Date.now(),
};

export const StubUserService: UserService = {
  getUserId: () => 'system',
  getUserRole: () => 'admin',
};
