import { handleTimingEvent } from './example';
import QueryBuilder, { SortKeyOperator } from './QueryBuilder';

const queryBuilder = new QueryBuilder();

const partitionKeyValue = 'PK';
const sortKeyValue = 'SK';
const sortKeyValue1 = 'SK1';
const sortKeyValue2 = 'SK2';





queryBuilder.buildWithNoSortKey(partitionKeyValue);

queryBuilder.buildWithComparison(
  partitionKeyValue,
  SortKeyOperator.GREATER_THAN,
  sortKeyValue
);

queryBuilder.buildWithOptionals({
  partitionKeyValue,
  sortKeyComparison: {
    operator: SortKeyOperator.GREATER_THAN,
    value: sortKeyValue,
  },
});

queryBuilder.buildNaively({
  partitionKeyValue: 'pk',
  sortKeyCriteria: {
    value: 'sortKeyValue',
    range: {
      fromValue: 'sortKeyValue1',
      toValue: 'sortKeyValue2',
    },
    comparison: {
      operator: SortKeyOperator.GREATER_THAN,
      value: 'sortKeyValue',
    },
  },
});










queryBuilder.build({
  partitionKeyValue,
  sortKeyCriteria: {
    type: 'range',
    fromValue: sortKeyValue1,
    toValue: sortKeyValue2,
  },
});





handleTimingEvent({
  name: 'start',
  userStarted: true,
});
