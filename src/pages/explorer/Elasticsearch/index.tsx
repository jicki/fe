import React, { useState, useEffect, useRef } from 'react';
import _ from 'lodash';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import { Space, Form, Input, AutoComplete, Tooltip, Button, Table, Empty, Spin, InputNumber, Select } from 'antd';
import { FormInstance } from 'antd/lib/form/Form';
import { QuestionCircleOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { json } from '@codemirror/lang-json';
import { defaultHighlightStyle } from '@codemirror/highlight';
import { useDebounceFn } from 'ahooks';
import { useLocation } from 'react-router-dom';
import { getIndices, getLogsQuery, getFields } from './services';
import TimeRangePicker, { parseRange } from '@/components/TimeRangePicker';
import Timeseries from '@/pages/dashboard/Renderer/Renderer/Timeseries';
import metricQuery from './metricQuery';
import { getColumnsFromFields } from './utils';
import FieldsSidebar from '../components/FieldsSidebar';
import { normalizeLogsQueryRequestBody } from './utils';
import './style.less';

interface IProps {
  datasourceValue?: number;
  form: FormInstance;
}

const LOGS_LIMIT = 50;
const TIME_FORMAT = 'YYYY.MM.DD HH:mm:ss';

export default function index(props: IProps) {
  const { t } = useTranslation('explorer');
  const { datasourceValue, form } = props;
  const params = new URLSearchParams(useLocation().search);
  const filtersArr: string[] = [];
  for (const [key, value] of params) {
    if (!['data_source_id', 'index_name', 'timestamp'].includes(key)) {
      filtersArr.push(`${key}:"${value}"`);
    }
  }

  const [indexOptions, setIndexOptions] = useState<any[]>([]);
  const [indexSearch, setIndexSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [displayTimes, setDisplayTimes] = useState('');
  const [fields, setFields] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [isMore, setIsMore] = useState(true);
  const [interval, setInterval] = useState(1);
  const [intervalUnit, setIntervalUnit] = useState<'second' | 'min' | 'hour'>('min');
  const totalRef = useRef(0);
  const pageRef = useRef(1);
  const timesRef =
    useRef<{
      start: number;
      end: number;
    }>();

  const fetchSeries = (values) => {
    if (timesRef.current) {
      const { start, end } = timesRef.current;
      metricQuery({
        ...timesRef.current,
        datasourceCate: 'elasticsearch',
        datasourceValue: values.datasourceValue,
        query: values.query,
        interval,
        intervalUnit,
      }).then((res) => {
        setDisplayTimes(`${moment(start).format(TIME_FORMAT)} - ${moment(end).format(TIME_FORMAT)}`);
        setSeries(res || []);
      });
    }
  };
  const fetchData = (page) => {
    form.validateFields().then((values) => {
      const { start, end } = parseRange(values.query.range);
      timesRef.current = {
        start: moment(start).valueOf(),
        end: moment(end).valueOf(),
      };
      if (page === 1) {
        setLoading(true);
      }
      getLogsQuery(
        values.datasourceValue,
        normalizeLogsQueryRequestBody({
          ...timesRef.current,
          index: values.query.index,
          filter: values.query.filter,
          date_field: values.query.date_field,
          limit: LOGS_LIMIT,
          page,
        }),
      )
        .then((res) => {
          const newData = _.map(res.list, (item) => {
            return {
              id: _.uniqueId(),
              fields: item.fields,
              json: item._source,
            };
          });
          totalRef.current = res.total;
          setData(page === 1 ? newData : [...data, ...newData]);
          if (page === 1) {
            const tableEleNodes = document.querySelectorAll(`.event-logs-table .ant-table-body`)[0];
            tableEleNodes?.scrollTo(0, 0);
          }
        })
        .finally(() => {
          setLoading(false);
        });
      if (page === 1) {
        fetchSeries(values);
      }
    });
  };

  useEffect(() => {
    if (datasourceValue) {
      getIndices(datasourceValue).then((res) => {
        const index = form.getFieldValue(['query', 'index']);
        const indexOptions = _.map(res, (item) => {
          return {
            value: item,
          };
        });

        if (!_.includes(_.map(indexOptions, 'value'), index) && !params.has('data_source_id')) {
          form.setFieldsValue({
            query: {
              index: '',
            },
          });
        }
        setIndexOptions(indexOptions);
      });
    }
  }, [datasourceValue, params.get('data_source_id')]);

  useEffect(() => {
    if (params.get('data_source_id')) {
      const id = params.get('data_source_id');
      form.setFieldsValue({
        datasourceValue: Number(id),
        query: {
          index: params.get('index_name'),
          filter: filtersArr?.join(' and '),
          date_field: params.get('timestamp'),
        },
      });

      onIndexChange(params.get('index_name'));
      fetchData(1);
    }
  }, [params.get('data_source_id')]);

  useEffect(() => {
    fetchSeries(form.getFieldsValue());
  }, [interval, intervalUnit]);

  const { run: onIndexChange } = useDebounceFn(
    (val) => {
      if (datasourceValue && val) {
        getFields(datasourceValue, val).then((res) => {
          const dateFiled = form.getFieldValue(['query', 'date_field']);
          if (!_.includes(res, dateFiled)) {
            if (_.includes(res, '@timestamp')) {
              form.setFieldsValue({
                query: {
                  date_field: '@timestamp',
                },
              });
            } else {
              form.setFieldsValue({
                query: {
                  date_field: '',
                },
              });
            }
          }
          setFields(res);
        });
      }
    },
    {
      wait: 500,
    },
  );

  return (
    <div className='es-discover-container'>
      <Space>
        <Input.Group compact>
          <span
            className='ant-input-group-addon'
            style={{
              width: 70,
              height: 32,
              lineHeight: '32px',
            }}
          >
            {t('datasource:es.index')}{' '}
            <Tooltip title={t('datasource:es.index_tip')}>
              <QuestionCircleOutlined />
            </Tooltip>
          </span>
          <Form.Item
            name={['query', 'index']}
            rules={[
              {
                required: true,
                message: t('datasource:es.index_msg'),
              },
            ]}
            validateTrigger='onBlur'
            style={{ width: 190 }}
          >
            <AutoComplete
              dropdownMatchSelectWidth={false}
              style={{ minWidth: 100 }}
              options={_.filter(indexOptions, (item) => {
                if (indexSearch) {
                  return _.includes(item.value, indexSearch);
                }
                return true;
              })}
              onSearch={(val) => {
                setIndexSearch(val);
              }}
              onChange={(val) => {
                onIndexChange(val);
              }}
            />
          </Form.Item>
        </Input.Group>
        <Input.Group compact>
          <span
            className='ant-input-group-addon'
            style={{
              width: 90,
              height: 32,
              lineHeight: '32px',
            }}
          >
            {t('datasource:es.filter')}{' '}
            <a href='https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html#query-string-syntax ' target='_blank'>
              <QuestionCircleOutlined />
            </a>
          </span>
          <Form.Item name={['query', 'filter']} style={{ minWidth: 300 }}>
            <Input />
          </Form.Item>
        </Input.Group>
        <div style={{ display: 'flex' }}>
          <Space>
            <Input.Group compact>
              <span
                className='ant-input-group-addon'
                style={{
                  width: 90,
                  height: 32,
                  lineHeight: '32px',
                }}
              >
                {t('datasource:es.date_field')}{' '}
              </span>
              <Form.Item
                name={['query', 'date_field']}
                initialValue='@timestamp'
                style={{ width: 'calc(100% - 90px)' }}
                rules={[
                  {
                    required: true,
                    message: t('datasource:es.date_field_msg'),
                  },
                ]}
              >
                <Select dropdownMatchSelectWidth={false} style={{ width: 150 }} showSearch>
                  {_.map(_.sortBy(_.concat(fields, selectedFields)), (item) => {
                    return (
                      <Select.Option key={item} value={item}>
                        {item}
                      </Select.Option>
                    );
                  })}
                </Select>
              </Form.Item>
            </Input.Group>
            <Form.Item name={['query', 'range']} initialValue={{ start: 'now-1h', end: 'now' }}>
              <TimeRangePicker />
            </Form.Item>
            <Form.Item>
              <Button
                type='primary'
                onClick={() => {
                  fetchData(1);
                }}
              >
                {t('query_btn')}
              </Button>
            </Form.Item>
          </Space>
        </div>
      </Space>
      <Spin spinning={loading}>
        {!_.isEmpty(data) ? (
          <div className='es-discover-content'>
            <FieldsSidebar fields={fields} setFields={setFields} value={selectedFields} onChange={setSelectedFields} />
            <div className='es-discover-main'>
              <div className='es-discover-chart'>
                <div className='es-discover-chart-title'>
                  <span>{displayTimes}</span>
                  <span style={{ marginLeft: 10 }}>
                    {t('log.interval')}:{' '}
                    <InputNumber
                      size='small'
                      value={interval}
                      min={1}
                      onBlur={(e) => {
                        const val = _.toNumber(e.target.value);
                        if (val > 0) setInterval(val);
                      }}
                      onPressEnter={(e: any) => {
                        const val = _.toNumber(e.target.value);
                        if (val > 0) setInterval(val);
                      }}
                    />{' '}
                    <Select size='small' style={{ width: 80 }} value={intervalUnit} onChange={(val) => setIntervalUnit(val)}>
                      <Select.Option value='second'>{t('common:time.second')}</Select.Option>
                      <Select.Option value='min'>{t('common:time.minute')}</Select.Option>
                      <Select.Option value='hour'>{t('common:time.hour')}</Select.Option>
                    </Select>
                  </span>
                </div>
                <div className='es-discover-chart-content'>
                  <Timeseries
                    series={series}
                    values={
                      {
                        custom: {
                          drawStyle: 'bar',
                          lineInterpolation: 'smooth',
                        },
                        options: {
                          legend: {
                            displayMode: 'hidden',
                          },
                          tooltip: {
                            mode: 'all',
                          },
                        },
                      } as any
                    }
                  />
                </div>
              </div>
              <div
                onScrollCapture={() => {
                  const tableEleNodes = document.querySelectorAll(`.event-logs-table .ant-table-body`)[0];
                  if (Math.round(tableEleNodes?.scrollTop) + tableEleNodes?.clientHeight === tableEleNodes?.scrollHeight) {
                    if (data.length > 500) {
                      setIsMore(false);
                      return false;
                    }
                    fetchData(pageRef.current + 1);
                    pageRef.current = pageRef.current + 1;
                  }
                }}
              >
                <Table
                  size='small'
                  className='event-logs-table'
                  tableLayout='fixed'
                  rowKey='id'
                  columns={getColumnsFromFields(selectedFields, form.getFieldValue(['query', 'date_field']))}
                  dataSource={data}
                  expandable={{
                    expandedRowRender: (record) => {
                      let value = '';
                      try {
                        value = JSON.stringify(record.json, null, 4);
                      } catch (e) {
                        console.error(e);
                        value = '无法解析';
                      }
                      return (
                        <CodeMirror
                          value={value}
                          height='auto'
                          theme='light'
                          basicSetup={false}
                          editable={false}
                          extensions={[
                            defaultHighlightStyle.fallback,
                            json(),
                            EditorView.lineWrapping,
                            EditorView.theme({
                              '&': {
                                backgroundColor: '#F6F6F6 !important',
                              },
                              '&.cm-editor.cm-focused': {
                                outline: 'unset',
                              },
                            }),
                          ]}
                        />
                      );
                    },
                    expandIcon: ({ expanded, onExpand, record }) =>
                      expanded ? <DownOutlined onClick={(e) => onExpand(record, e)} /> : <RightOutlined onClick={(e) => onExpand(record, e)} />,
                  }}
                  scroll={{ x: _.isEmpty(selectedFields) ? undefined : 'max-content', y: !isMore ? 312 - 35 : 312 }}
                  pagination={false}
                  footer={
                    !isMore
                      ? () => {
                          return '只能查询您搜索匹配的前 500 个日志，请细化您的过滤条件。';
                        }
                      : undefined
                  }
                />
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        )}
      </Spin>
    </div>
  );
}
