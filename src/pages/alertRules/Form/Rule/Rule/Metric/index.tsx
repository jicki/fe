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

import React, { useContext } from 'react';
import { Form, Row, Col, Select, Card, Space } from 'antd';
import { PlusCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import { CommonStateContext } from '@/App';
import { getAuthorizedDatasourceCates } from '@/components/AdvancedWrap';
import { PromQLInputWithBuilder } from '@/components/PromQLInput';
import DatasourceValueSelect from '@/pages/alertRules/Form/components/DatasourceValueSelect';
import Severity from '@/pages/alertRules/Form/components/Severity';
import Inhibit from '@/pages/alertRules/Form/components/Inhibit';
import IntervalAndDuration from '@/pages/alertRules/Form/components/IntervalAndDuration';
import { FormStateContext } from '@/pages/alertRules/Form';
import './style.less';

const DATASOURCE_ALL = 0;

function getFirstDatasourceId(datasourceIds = [], datasourceList: { id: number }[] = []) {
  return _.isEqual(datasourceIds, [DATASOURCE_ALL]) && datasourceList.length > 0 ? datasourceList[0]?.id : datasourceIds[0];
}

export default function index() {
  const { t } = useTranslation('alertRules');
  const { groupedDatasourceList } = useContext(CommonStateContext);
  const { disabled } = useContext(FormStateContext);
  const datasourceCates = _.filter(getAuthorizedDatasourceCates(), (item) => item.type === 'metric');

  return (
    <div>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={t('common:datasource.type')} name='cate'>
            <Select>
              {_.map(datasourceCates, (item) => {
                return (
                  <Select.Option value={item.value} key={item.value}>
                    {item.label}
                  </Select.Option>
                );
              })}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item shouldUpdate={(prevValues, curValues) => prevValues.cate !== curValues.cate} noStyle>
            {({ getFieldValue, setFieldsValue }) => {
              const cate = getFieldValue('cate');
              return <DatasourceValueSelect mode='multiple' setFieldsValue={setFieldsValue} cate={cate} datasourceList={groupedDatasourceList[cate] || []} />;
            }}
          </Form.Item>
        </Col>
      </Row>
      <div style={{ marginBottom: 10 }}>
        <Form.Item noStyle shouldUpdate={(prevValues, curValues) => !_.isEqual(prevValues.datasource_ids, curValues.datasource_ids)}>
          {({ getFieldValue }) => {
            const cate = getFieldValue('cate');
            const curDatasourceList = groupedDatasourceList[cate] || [];
            const datasourceIds = getFieldValue('datasource_ids') || [];
            const datasourceId = getFirstDatasourceId(datasourceIds, curDatasourceList);

            return (
              <Form.List
                name={['rule_config', 'queries']}
                initialValue={[
                  {
                    prom_ql: '',
                    severity: 3,
                  },
                ]}
              >
                {(fields, { add, remove }) => (
                  <Card
                    title={
                      <Space>
                        <span>{t('metric.query.title')}</span>
                        <PlusCircleOutlined
                          onClick={() =>
                            add({
                              prom_ql: '',
                              severity: 3,
                            })
                          }
                        />
                        <Inhibit triggersKey='queries' />
                      </Space>
                    }
                    size='small'
                  >
                    <div className='alert-rule-triggers-container'>
                      {fields.map((field) => (
                        <div key={field.key} className='alert-rule-trigger-container'>
                          <Row>
                            <Col flex='100px'>PromQL</Col>
                            <Col flex='auto'>
                              <Form.Item
                                {...field}
                                name={[field.name, 'prom_ql']}
                                validateTrigger={['onBlur']}
                                trigger='onChange'
                                rules={[{ required: true, message: t('请输入PromQL') }]}
                              >
                                <PromQLInputWithBuilder readonly={disabled} datasourceValue={datasourceId} />
                              </Form.Item>
                            </Col>
                          </Row>
                          <div>
                            <Severity field={field} />
                          </div>
                          <MinusCircleOutlined className='alert-rule-trigger-remove' onClick={() => remove(field.name)} />
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </Form.List>
            );
          }}
        </Form.Item>
      </div>

      <IntervalAndDuration
        intervalTip={(num) => {
          return t('metric.prom_eval_interval_tip', { num });
        }}
        durationTip={(num) => {
          return t('metric.prom_for_duration_tip', { num });
        }}
      />
    </div>
  );
}
