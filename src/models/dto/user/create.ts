interface ICreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  citizenId?: string;
  phone?: string;
  address?: string;
  healthNote?: string;
  // เวอร์ชันเอกสาร PDPA ที่เจ้าของข้อมูลยอมรับตอนสร้าง
  consentVersion?: number;
}

export type { ICreateUserDto };
