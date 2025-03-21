import moment from 'moment';

export const defaultRuleConfig = {
  host: {
    queries: [
      {
        key: 'all_hosts',
        op: '==',
        values: [],
      },
    ],
    triggers: [
      {
        type: 'target_miss',
        severity: 3,
        duration: 30,
      },
    ],
  },
  metric: {
    queries: [
      {
        prom_ql: '',
        severity: 3,
      },
    ],
  },
  logging: {
    queries: [
      {
        interval_unit: 'min',
        interval: 1,
        date_field: '@timestamp',
        value: {
          func: 'count',
        },
      },
    ],
    triggers: [
      {
        mode: 0,
        expressions: [
          {
            ref: 'A',
            comparisonOperator: '==',
            logicalOperator: '&&',
          },
        ],
        severity: 1,
      },
    ],
  },
  anomaly: {
    algorithm: 'holtwinters',
    severity: 3,
  },
};

export const defaultValues = {
  disabled: 0,
  effective_time: [
    {
      enable_days_of_week: ['0', '1', '2', '3', '4', '5', '6'],
      enable_stime: moment('00:00', 'HH:mm'),
      enable_etime: moment('23:59', 'HH:mm'),
    },
  ],
  notify_recovered: true,
  recover_duration: 0,
  notify_repeat_step: 60,
  notify_max_number: 0,
  rule_config: defaultRuleConfig.host,
  datasource_ids: [],
  prom_eval_interval: 30,
  prom_for_duration: 60,
  prod: 'host',
  cate: 'host',
  enable_status: true,
};

export const ruleTypeOptions = [
  {
    label: 'Host',
    value: 'host',
  },
  {
    label: 'Metric',
    value: 'metric',
  },
];
