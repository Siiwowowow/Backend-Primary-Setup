export interface ICreateAdmin {
  userId: string;
  permissions?: string[];
}

export interface IUpdateAdmin {
  permissions?: string[];
}