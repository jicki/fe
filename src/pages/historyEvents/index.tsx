/*
 * Copyright 2022 Nightingale Team
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import React, { useContext, useState } from 'react';
import { AlertOutlined, SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import _ from 'lodash';
import { useAntdTable } from 'ahooks';
import { Input, Tag, Button, Space, Table, Select, message } from 'antd';
import { Link } from 'react-router-dom';
import PageLayout from '@/components/pageLayout';
import AdvancedWrap from '@/components/AdvancedWrap';
import RefreshIcon from '@/components/RefreshIcon';
import { Pure as DatasourceSelect } from '@/components/DatasourceSelect';
import { hoursOptions } from '@/pages/event/constants';
import { CommonStateContext } from '@/App';
import exportEvents, { downloadFile } from './exportEvents';
import { getEvents } from './services';
import { SeverityColor } from '../event';
import '../event/index.less';
import './locale';

const Event: React.FC = () => {
  const { t } = useTranslation('AlertHisEvents');
  const { groupedDatasourceList } = useContext(CommonStateContext);
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_'));
  const [filter, setFilter] = useState<{
    hours: number;
    cate?: string;
    datasourceIds: number[];
    bgid?: number;
    severity?: number;
    eventType?: number;
    queryContent: string;
    rule_prods: string[];
  }>({
    hours: 6,
    datasourceIds: [],
    queryContent: '',
    rule_prods: [],
  });
  const columns = [
    {
      title: t('common:datasource.type'),
      dataIndex: 'cate',
      width: 100,
    },
    {
      title: t('common:datasource.id'),
      dataIndex: 'datasource_id',
      width: 100,
      render: (value, record) => {
        return _.find(groupedDatasourceList?.[record.cate], { id: value })?.name || '-';
      },
    },
    {
      title: t('rule_name'),
      dataIndex: 'rule_name',
      render(title, { id, tags }) {
        const content =
          tags &&
          tags.map((item) => (
            <Tag
              color='purple'
              key={item}
              onClick={(e) => {
                if (!filter.queryContent.includes(item)) {
                  setFilter({
                    ...filter,
                    queryContent: filter.queryContent ? `${filter.queryContent.trim()} ${item}` : item,
                  });
                }
              }}
            >
              {item}
            </Tag>
          ));
        return (
          <>
            <div>
              <Link
                to={{
                  pathname: `/alert-his-events/${id}`,
                }}
                target='_blank'
              >
                {title}
              </Link>
            </div>
            <div>
              <span className='event-tags'>{content}</span>
            </div>
          </>
        );
      },
    },

    {
      title: t('last_eval_time'),
      dataIndex: 'last_eval_time',
      width: 120,
      render(value) {
        return moment((value ? value : 0) * 1000).format('YYYY-MM-DD HH:mm:ss');
      },
    },
  ];
  const [exportBtnLoadding, setExportBtnLoadding] = useState(false);
  const filterObj = Object.assign(
    { hours: filter.hours },
    filter.datasourceIds.length ? { datasource_ids: _.join(filter.datasourceIds, ',') } : {},
    filter.severity !== undefined ? { severity: filter.severity } : {},
    filter.queryContent ? { query: filter.queryContent } : {},
    filter.eventType !== undefined ? { is_recovered: filter.eventType } : {},
    { bgid: filter.bgid },
    filter.rule_prods.length ? { rule_prods: _.join(filter.rule_prods, ',') } : {},
  );

  function renderLeftHeader() {
    return (
      <div className='table-operate-box'>
        <Space>
          <RefreshIcon
            onClick={() => {
              setRefreshFlag(_.uniqueId('refresh_'));
            }}
          />
          <Select
            style={{ minWidth: 80 }}
            value={filter.hours}
            onChange={(val) => {
              setFilter({
                ...filter,
                hours: val,
              });
            }}
          >
            {hoursOptions.map((item) => {
              return <Select.Option value={item.value}>{t(`hours.${item.value}`)}</Select.Option>;
            })}
          </Select>
          <Select
            allowClear
            placeholder={t('prod')}
            style={{ minWidth: 80 }}
            value={filter.rule_prods}
            mode='multiple'
            onChange={(val) => {
              setFilter({
                ...filter,
                rule_prods: val,
              });
            }}
            dropdownMatchSelectWidth={false}
          >
            <Select.Option value='host'>Host</Select.Option>
            <Select.Option value='metric'>Metric</Select.Option>
          </Select>
          <AdvancedWrap var='VITE_IS_ALERT_ES'>
            {(isShow) => {
              return (
                <DatasourceSelect
                  datasourceCate={filter.cate}
                  onDatasourceCateChange={(val) => {
                    setFilter({
                      ...filter,
                      cate: val,
                    });
                  }}
                  datasourceValue={filter.datasourceIds}
                  datasourceValueMode='multiple'
                  onDatasourceValueChange={(val: number[]) => {
                    setFilter({
                      ...filter,
                      datasourceIds: val,
                    });
                  }}
                  filterCates={(cates) => {
                    return _.filter(cates, (item) => {
                      if (item.value === 'elasticsearch') {
                        return isShow[0];
                      }
                      return true;
                    });
                  }}
                />
              );
            }}
          </AdvancedWrap>

          <Input
            className='search-input'
            prefix={<SearchOutlined />}
            placeholder={t('search_placeholder')}
            value={filter.queryContent}
            onChange={(e) => {
              setFilter({
                ...filter,
                queryContent: e.target.value,
              });
            }}
            onPressEnter={(e) => {
              setRefreshFlag(_.uniqueId('refresh_'));
            }}
          />
          <Button
            loading={exportBtnLoadding}
            onClick={() => {
              setExportBtnLoadding(true);
              exportEvents({ ...filterObj, limit: 1000000, p: 1 }, (err, csv) => {
                if (err) {
                  message.error(t('export_failed'));
                } else {
                  downloadFile(csv, `events_${moment().format('YYYY-MM-DD_HH-mm-ss')}.csv`);
                }
                setExportBtnLoadding(false);
              });
            }}
          >
            {t('export')}
          </Button>
        </Space>
      </div>
    );
  }

  const fetchData = ({ current, pageSize }) => {
    return getEvents({
      p: current,
      limit: pageSize,
      ...filterObj,
    }).then((res) => {
      return {
        total: res.dat.total,
        list: res.dat.list,
      };
    });
  };

  const { tableProps } = useAntdTable(fetchData, {
    refreshDeps: [refreshFlag, JSON.stringify(filterObj)],
  });

  return (
    <PageLayout icon={<AlertOutlined />} title={t('title')}>
      <div className='event-content'>
        <div className='table-area'>
          {renderLeftHeader()}
          <Table
            size='small'
            columns={columns}
            {...tableProps}
            rowClassName={(record: { severity: number; is_recovered: number }) => {
              return SeverityColor[record.is_recovered ? 3 : record.severity - 1] + '-left-border';
            }}
            pagination={{
              ...tableProps.pagination,
              pageSize: 30,
              pageSizeOptions: ['30', '100', '200', '500'],
            }}
          />
        </div>
      </div>
    </PageLayout>
  );
};

export default Event;
