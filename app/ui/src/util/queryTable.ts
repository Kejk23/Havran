import {ParameterizedQuery, QueryApi} from '@influxdata/influxdb-client'
import {queryToTable, TableOptions} from '@influxdata/influxdb-client-giraffe'
import {Table, newTable} from '@influxdata/giraffe'

/**
 * Executes a flux query and iterrativelly collects results into a giraffe's Table.
 *
 * @param queryApi InfluxDB client's QueryApi instance
 * @param query query to execute
 * @param tableOptions tableOptions allows to filter or even stop the processing of rows, or restrict the columns to collect
 * @return Promise  with query results
 */
export function queryTable(
  queryApi: QueryApi,
  query: string | ParameterizedQuery,
  tableOptions?: TableOptions
): Promise<Table> {
  return queryToTable(queryApi, query, newTable, tableOptions)
}
