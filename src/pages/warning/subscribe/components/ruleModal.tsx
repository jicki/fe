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
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { Input, Table, Switch, Tag, Select, Modal } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { ColumnType } from 'antd/lib/table';
import dayjs from 'dayjs';
import { debounce } from 'lodash';
import { strategyItem, strategyStatus } from '@/store/warningInterface';
import { getStrategyGroupSubList, updateAlertRules } from '@/services/warning';
import { priorityColor } from '@/utils/constant';
import { pageSizeOptionsDefault } from '@/pages/warning/const';
import { getBusinessTeamList } from '@/services/manage';
import { CommonStateContext } from '@/App';

const { Option } = Select;
interface props {
  visible: boolean;
  ruleModalClose: Function;
  subscribe: Function;
}

const ruleModal: React.FC<props> = ({ visible, ruleModalClose, subscribe }) => {
  const { t } = useTranslation();
  const { curBusiId } = useContext(CommonStateContext);
  const [busiGroups, setBusiGroups] = useState<{ id: number; name: string }[]>([]);
  const [currentStrategyDataAll, setCurrentStrategyDataAll] = useState([]);
  const [currentStrategyData, setCurrentStrategyData] = useState([]);
  const [bgid, setBgid] = useState(curBusiId);
  const [query, setQuery] = useState<string>('');

  useEffect(() => {
    setBgid(curBusiId);
  }, [curBusiId]);

  useEffect(() => {
    getAlertRules();
  }, [bgid]);

  useEffect(() => {
    getTeamList('');
  }, []);

  useEffect(() => {
    filterData();
  }, [query, currentStrategyDataAll]);

  // 获取业务组列表
  const getTeamList = (query: string) => {
    let params = {
      all: 1,
      query,
      limit: 200,
    };
    getBusinessTeamList(params).then((data) => {
      setBusiGroups(data.dat || []);
    });
  };

  const debounceFetcher = useCallback(debounce(getTeamList, 400), []);

  const getAlertRules = async () => {
    const { success, dat } = await getStrategyGroupSubList({ id: bgid });
    if (success) {
      setCurrentStrategyDataAll(dat || []);
    }
  };

  const bgidChange = (val) => {
    setBgid(val);
  };

  const filterData = () => {
    const data = JSON.parse(JSON.stringify(currentStrategyDataAll));
    const res = data.filter((item) => {
      return item.name.indexOf(query) > -1 || item.append_tags.join(' ').indexOf(query) > -1;
    });
    setCurrentStrategyData(res || []);
  };

  const onSearchQuery = (e) => {
    let val = e.target.value;
    setQuery(val);
  };

  const columns: ColumnType<strategyItem>[] = [
    {
      title: t('数据源'),
      dataIndex: 'datasource_ids',
      render: (data) => {
        return <div>{data}</div>;
      },
    },
    {
      title: t('级别'),
      dataIndex: 'severity',
      render: (data) => {
        return <Tag color={priorityColor[data - 1]}>S{data}</Tag>;
      },
    },
    {
      title: t('名称'),
      dataIndex: 'name',
      render: (data, record) => {
        return (
          <div
            className='table-active-text'
            onClick={() => {
              // handleClickEdit(record.id);
            }}
          >
            {data}
          </div>
        );
      },
    },
    {
      title: t('告警接收者'),
      dataIndex: 'notify_groups_obj',
      render: (data, record) => {
        return (
          (data.length &&
            data.map(
              (
                user: {
                  nickname: string;
                  username: string;
                } & { name: string },
                index: number,
              ) => {
                return (
                  <Tag color='purple' key={index}>
                    {user.nickname || user.username || user.name}
                  </Tag>
                );
              },
            )) || <div></div>
        );
      },
    },
    {
      title: t('附加标签'),
      dataIndex: 'append_tags',
      render: (data) => {
        const array = data || [];
        return (
          (array.length &&
            array.map((tag: string, index: number) => {
              return (
                <Tag color='purple' key={index}>
                  {tag}
                </Tag>
              );
            })) || <div></div>
        );
      },
    },
    {
      title: t('更新时间'),
      dataIndex: 'update_at',
      render: (text: string) => dayjs(Number(text) * 1000).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: t('启用'),
      dataIndex: 'disabled',
      render: (disabled, record) => (
        <Switch
          checked={disabled === strategyStatus.Enable}
          disabled
          size='small'
          onChange={() => {
            const { id, disabled } = record;
            updateAlertRules(
              {
                ids: [id],
                fields: {
                  disabled: !disabled ? 1 : 0,
                },
              },
              curBusiId,
            ).then(() => {
              getAlertRules();
            });
          }}
        />
      ),
    },
    {
      title: t('操作'),
      dataIndex: 'operator',
      fixed: 'right',
      width: 100,
      render: (data, record) => {
        return (
          <div className='table-operator-area'>
            <div
              className='table-operator-area-normal'
              onClick={() => {
                handleSubscribe(record);
              }}
            >
              {t('订阅')}
            </div>
          </div>
        );
      },
    },
  ];

  const handleSubscribe = (record) => {
    subscribe(record);
  };

  const modalClose = () => {
    ruleModalClose();
  };

  return (
    <>
      <Modal
        title={t('订阅告警规则')}
        footer=''
        forceRender
        visible={visible}
        onCancel={() => {
          modalClose();
        }}
        width={'80%'}
      >
        <div>
          <Select
            style={{ width: '280px' }}
            value={bgid}
            onChange={bgidChange}
            showSearch
            optionFilterProp='children'
            filterOption={false}
            onSearch={(e) => debounceFetcher(e)}
            onBlur={() => getTeamList('')}
          >
            {busiGroups.map((item) => (
              <Option value={item.id} key={item.id}>
                {item.name}
              </Option>
            ))}
          </Select>
          <Input style={{ marginLeft: 10, width: '280px' }} onPressEnter={onSearchQuery} prefix={<SearchOutlined />} placeholder={t('规则名称、附加标签')} />
        </div>
        <div className='rule_modal_table'>
          <Table
            size='small'
            rowKey='id'
            pagination={{
              total: currentStrategyData.length,
              showQuickJumper: true,
              showSizeChanger: true,
              showTotal: (total) => {
                return `共 ${total} 条数据`;
              },
              pageSizeOptions: pageSizeOptionsDefault,
              defaultPageSize: 30,
            }}
            dataSource={currentStrategyData}
            columns={columns}
          />
        </div>
      </Modal>
    </>
  );
};

export default ruleModal;
