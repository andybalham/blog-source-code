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
        /// <summary>
        /// Builds a query based on a partition key value alone.
        /// </summary>
        /// <param name="partitionKeyValue">The partition key value</param>
        public void _Build(string partitionKeyValue)
        {
        }

        /// <summary>
        /// Builds a query based on a combination of a partition key and sort key values.
        /// </summary>
        /// <param name="partitionKeyValue">The partition key value</param>
        /// <param name="sortKeyValue">The sort key value</param>
        public void _Build(string partitionKeyValue, string sortKeyValue)
        {
        }

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
