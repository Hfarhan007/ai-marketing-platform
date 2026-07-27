export interface SafeUserContext {
  id: string;
  role?: string;
}

let currentUser: SafeUserContext | undefined;

export const userContext = {
  clear: () => {
    currentUser = undefined;
  },
  get: () => currentUser,
  set: (value: SafeUserContext) => {
    currentUser = value;
  },
};
