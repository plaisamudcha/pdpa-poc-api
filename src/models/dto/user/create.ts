interface ICreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  citizenId?: string;
  phone?: string;
  address?: string;
  healthNote?: string;
}

export type { ICreateUserDto };
