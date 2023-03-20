using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MethodOverloading
{
    internal enum SortKeyOperator
    {
        EQUALS,
        LESS_THAN,
        LESS_THAN_OR_EQUAL,
        GREATER_THAN_OR_EQUAL,
        GREATER_THAN,
        BEGINS_WITH,
    }

    internal class QueryBuilder
    {
        public void Build(string partitionKeyValue)
        {
        }

        public void Build(string partitionKeyValue, string sortKeyValue)
        {
        }

        public void Build(string partitionKeyValue, SortKeyOperator sortKeyOperator, string sortKeyValue)
        {
        }

        public void Build(string partitionKeyValue, string sortKeyFromValue, string sortKeyToValue)
        {
        }
    }
}
