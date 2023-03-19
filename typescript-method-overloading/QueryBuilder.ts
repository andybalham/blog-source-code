export enum SortKeyOperator {
  EQUALS = "=",
  LESS_THAN = "<",
  LESS_THAN_OR_EQUAL = "<=",
  GREATER_THAN_OR_EQUAL = ">=",
  GREATER_THAN = ">",
  BEGINS_WITH = "BEGINS_WITH",
}

type KeyValue = string | number;

type KeyStringRange = {
  fromValue: string;
  toValue: string;
};

type KeyNumberRange = {
  fromValue: number;
  toValue: number;
};

type KeyRange = KeyStringRange | KeyNumberRange;

export interface QueryInput {
  partitionKeyValue: KeyValue;
  sortKeyCriteria?:
    | {
        value: KeyValue;
      }
    | {
        comparison: {
          operator: SortKeyOperator;
          value: KeyValue;
        };
      }
    | { range: KeyRange };
}

export default class QueryBuilder {
  buildWithPrimaryKeyOnly(partitionKeyValue: any) {}

  buildWithComparison(
    partitionKeyValue: any,
    sortKeyOperator?: SortKeyOperator,
    sortKeyValue?: any
  ) {}

  buildWithRange(
    partitionKeyValue: any,
    sortKeyFromValue: any,
    sortKeyToValue: any
  ) {}

  buildWithOptionals({
    partitionKeyValue,
    sortKeyOperator,
    sortKeyValue,
    sortKeyRange,
  }: {
    partitionKeyValue: any;
    sortKeyOperator?: SortKeyOperator;
    sortKeyValue?: any;
    sortKeyRange?: {
      fromValue: any;
      toValue: any;
    };
  }) {}

  build(queryInput: QueryInput) {}
}
