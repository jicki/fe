import React, { useState, useEffect } from 'react';
import { Form, AutoComplete } from 'antd';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { getIndices } from '@/services/warning';

interface IProps {
  prefixField?: any;
  prefixName?: string[] | number[];
  cate: string;
  datasourceValue?: number;
  name?: string | string[]; // 可自定义 name 或者 [...prefixName, 'query', 'index']
}

export default function IndexSelect({ prefixField = {}, prefixName = [], cate, datasourceValue, name }: IProps) {
  const [options, setOptions] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const { t } = useTranslation('datasource');

  useEffect(() => {
    if (cate === 'elasticsearch' && datasourceValue) {
      getIndices(datasourceValue).then((res) => {
        setOptions(
          _.map(res, (item) => {
            return {
              value: item,
            };
          }),
        );
      });
    }
  }, [cate, datasourceValue]);

  return (
    <Form.Item
      label={t('es.index')}
      tooltip={<div>{t('es.index_tip')}</div>}
      {...prefixField}
      name={name || [...prefixName, 'query', 'index']}
      rules={[
        {
          required: true,
          message: t('es.index_msg'),
        },
      ]}
      validateTrigger='onBlur'
    >
      <AutoComplete
        options={_.filter(options, (item) => {
          if (search) {
            return item.value.includes(search);
          }
          return true;
        })}
        onSearch={(val) => {
          setSearch(val);
        }}
      />
    </Form.Item>
  );
}
