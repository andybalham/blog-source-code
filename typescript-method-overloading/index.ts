import { handleTimingEvent } from './example';
import QueryBuilder, {
  NumericSortKeyOperator,
  SortKeyOperator,
} from './QueryBuilder';

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

// queryBuilder.buildWith

queryBuilder.build_ArgObjectArray({
  partitionKeyValue: 'pk',
  sortKeyFromValue: 'sortKeyValue1',
  sortKeyToValue: 'sortKeyValue2',
});

queryBuilder.build_ArgObjectArray({
  partitionKeyValue: 'pk',
  // sortKeyOperator: SortKeyOperator.BEGINS_WITH,
  sortKeyValue: 'sortKeyValue',
});





// queryBuilder.build();

queryBuilder.build('pk');

queryBuilder.build('pk', 'sortKeyValue1', 'sortKeyValue2');

queryBuilder.build('pk', NumericSortKeyOperator.BEGINS_WITH, 'sortKeyValue');

queryBuilder.build_DiscriminatedTypes({
  partitionKeyValue,
  sortKeyCriteria: {
    type: 'comparison',
    operator: SortKeyOperator.BEGINS_WITH,
    value: 'sortKeyValue',
  },
});

queryBuilder.build_DiscriminatedTypes({
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
