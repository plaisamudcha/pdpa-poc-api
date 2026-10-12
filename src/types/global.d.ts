/* ========= available for query  ============= */
declare interface IQueryList<T> {
  filter?: T | null;
  search?: string;
  sorting?: string;
  desc?: string;
  page?: number;
  pageSize?: number;
}

/** response */
declare interface ISuccess<V> {
  code: 200;
  status: number;
  errors: null;
  payload: V;
}

declare interface IReturnResponse<V> {
  code: number;
  status: number;
  errors: string | null | object | number | boolean;
  payload: V;
}

declare interface IPagination<T> {
  datas: T[] | null;
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
}
