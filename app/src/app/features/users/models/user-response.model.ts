import { User } from './user.model';

export interface UserListResponse {
  success: boolean;
  message: string;
  data: User[];
}

export interface UserSingleResponse {
  success: boolean;
  message: string;
  data: User;
}
