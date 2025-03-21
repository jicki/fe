export interface ElasticsearchQuery {
  index: string;
  filter: string;
  date_field: string;
  interval?: number; // TODO: 是否可以为空？
  values: {
    func: string;
    field: string;
  }[];
  group_by: {
    cate: string;
    field?: string;
    min_value?: number;
    size?: number;
  }[];
  start: number;
  end: number;
  limit?: number;
}
