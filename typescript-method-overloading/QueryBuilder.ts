export enum SortKeyOperator {
  LESS_THAN = '<',
  LESS_THAN_OR_EQUAL = '<=',
  GREATER_THAN_OR_EQUAL = '>=',
  GREATER_THAN = '>',
  BEGINS_WITH = 'BEGINS_WITH',
}

/**
 * Query input
 */
export interface QueryInput {
  /**
   * Partition key value
   */
  partitionKeyValue: string;
  /**
   * sort Key Criteria
   */
  sortKeyCriteria?:
    | {
        value: string;
      }
    | {
        comparison: {
          operator: SortKeyOperator;
          value: string;
        };
      }
    | {
        range: {
          fromValue: string;
          toValue: string;
        };
      };
}

type KeyCriteria = {
  /**
   * partition Key Value
   */
  partitionKeyValue: string;
  /**
   * sort Key Value
   */
  sortKeyCriteria?:
    | {
        type: 'value';
        value: string;
      }
    | {
        type: 'comparison';
        operator: SortKeyOperator;
        value: string;
      }
    | {
        type: 'range';
        fromValue: string;
        toValue: string;
      };
};

export default class QueryBuilder {
  /**
   * Builds a query based on a partition key value alone.
   * @param partitionKeyValue The partition key value
   */
  buildWithNoSortKey(partitionKeyValue: string) {}

  /**
   * Builds a query based on a combination of a partition key and sort key values.
   * @param partitionKeyValue The partition key value
   * @param sortKeyValue The sort key value
   */
  buildWithSortKey(partitionKeyValue: string, sortKeyValue: string) {}

  buildWithComparison(
    partitionKeyValue: string,
    sortKeyOperator: SortKeyOperator,
    sortKeyValue: string
  ) {}

  buildWithRange(
    partitionKeyValue: string,
    sortKeyFromValue: string,
    sortKeyToValue: string
  ) {}

  buildWithOptionals({
    partitionKeyValue,
    sortKeyValue,
    sortKeyComparison,
    sortKeyRange,
  }: {
    partitionKeyValue: string;
    sortKeyValue?: string;
    sortKeyComparison?: {
      operator: SortKeyOperator;
      value: string;
    };
    sortKeyRange?: {
      fromValue: string;
      toValue: string;
    };
  }) {
    if (sortKeyValue) {
      // Handle case where we match by value equality
    } else if (sortKeyComparison) {
      // Handle case where we match by comparison
    } else if (sortKeyRange) {
      // Handle case where we match by range
    } else {
      // Handle case where we match just by primary key
    }
  }

  // https://www.typescriptlang.org/play#example/discriminate-types

  buildNaively({
    partitionKeyValue,
    sortKeyCriteria,
  }: {
    partitionKeyValue: string;
    sortKeyCriteria?:
      | {
          value: string;
        }
      | {
          comparison: {
            operator: SortKeyOperator;
            value: string;
          };
        }
      | {
          range: {
            fromValue: string;
            toValue: string;
          };
        };
  }) {
    if (sortKeyCriteria) {
      if ('value' in sortKeyCriteria) {
        // Handle case where we match by value equality
      } else if ('comparison' in sortKeyCriteria) {
        // Handle case where we match by comparison
      } else if ('range' in sortKeyCriteria) {
        // Handle case where we match by range
      } else {
      }
    } else {
      // Handle case where we match just by primary key
    }
  }

  /**
   * Builds a query based on the key criteria supplied.
   * @param param0 Key criteria
   */
  build({ partitionKeyValue, sortKeyCriteria }: KeyCriteria) {
    if (sortKeyCriteria?.type === 'value') {
      // Handle case where we match by value equality
    } else if (sortKeyCriteria?.type === 'comparison') {
      // Handle case where we match by comparison
    } else if (sortKeyCriteria?.type === 'range') {
      // Handle case where we match by range
    } else {
      // Handle case where we match just by primary key
    }
  }
}
