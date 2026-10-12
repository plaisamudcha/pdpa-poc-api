/** context ที่ผูกกับ DEK ตอน wrap — กันการเอา DEK ของ user หนึ่งไปใช้แทนอีกคน */
export const dekContext = (userId: string) => `dek:${userId}`;
