export enum SortKeyOperator {
  LESS_THAN = '<',
  LESS_THAN_OR_EQUAL = '<=',
  GREATER_THAN_OR_EQUAL = '>=',
  GREATER_THAN = '>',
  BEGINS_WITH = 'BEGINS_WITH',
}

export enum NumericSortKeyOperator {
  LESS_THAN = 0, //'<',
  LESS_THAN_OR_EQUAL = 1, //'<=',
  GREATER_THAN_OR_EQUAL = 2, //'>=',
  GREATER_THAN = 3, //'>',
  BEGINS_WITH = 4, //'BEGINS_WITH',
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
   * Builds a query based on the criteria supplied.
   * @param args Query criteria
   */
  build_ArgObjectArray(
    ...args:
      | [partitionKeyOnly: { partitionKeyValue: string }]
      | [compoundKey: { partitionKeyValue: string; sortKeyValue: string }]
      | [
          sortKeyComparison: {
            partitionKeyValue: string;
            sortKeyOperator: SortKeyOperator;
            sortKeyValue: string;
          }
        ]
      | [
          sortKeyRange: {
            partitionKeyValue: string;
            sortKeyFromValue: string;
            sortKeyToValue: string;
          }
        ]
  ) {
    if ('sortKeyFromValue' in args[0]) {
      // Handle case where we match by range
    } else if ('sortKeyOperator' in args[0]) {
      // Handle case where we match by comparison
    } else if ('sortKeyValue' in args[0]) {
      // Handle case where we match by compound key
    } else {
      // Handle case where we match by partition key only
    }
  }

  
  /**
   * Builds a query based on the criteria supplied.
   * @param args Query criteria
   */
  build(
    ...args:
      | [partitionKeyValue: string]
      | [partitionKeyValue: string, sortKeyValue: string]
      | [
          partitionKeyValue: string,
          sortKeyOperator: NumericSortKeyOperator,
          sortKeyValue: string
        ]
      | [
          partitionKeyValue: string,
          sortKeyFromValue: string,
          sortKeyToValue: string
        ]
  ) {
    const signature = args
      .map((arg) => typeof arg)
      .reduce((accumulator, argType) => `${accumulator}${argType}|`, '|');

    switch (signature) {
      case '|string|':
        // Handle case where we match by partition key only
        {
          const [partitionKeyValue] = args;
          console.log(JSON.stringify({ partitionKeyValue }));
        }
        break;
      case '|string|string|':
        // Handle case where we match by compound key
        {
          const [partitionKeyValue, sortKeyValue] = args;
          console.log(JSON.stringify({ partitionKeyValue, sortKeyValue }));
        }
        break;
      case '|string|string|string|':
        // Handle case where we match by range
        {
          const [partitionKeyValue, sortKeyFromValue, sortKeyToValue] = args;
          console.log(
            JSON.stringify({
              partitionKeyValue,
              sortKeyFromValue,
              sortKeyToValue,
            })
          );
        }
        break;
      case '|string|number|string|':
        // Handle case where we match by comparison
        {
          const [partitionKeyValue, sortKeyOperator, sortKeyValue] = args;
          console.log(
            JSON.stringify({ partitionKeyValue, sortKeyOperator, sortKeyValue })
          );
        }
        break;
      default:
        throw new Error(`Unhandled signature`);
    }
  }

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

  // buildWithNoSortKey(partitionKeyValue: string) {}

  // buildWithSortKey(partitionKeyValue: string, sortKeyValue: string) {}

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
  build_DiscriminatedTypes({
    partitionKeyValue,
    sortKeyCriteria,
  }: {
    partitionKeyValue: string;
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
  }) {
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

  /**
   * Builds a query based on the key criteria supplied.
   * @param param0 Key criteria
   */
  buildWithKeyCriteria({ partitionKeyValue, sortKeyCriteria }: KeyCriteria) {
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
