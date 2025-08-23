---
title: Data Sources API
meta:
    description: Use the Data Sources API to create and manage your Data Sources as well as importing data into them.
---

# Data Sources API

Use Tinybird's Data Sources API to import files into your Tinybird Data Sources. With the Data Sources API you can use files to create new Data Sources, and append data to, or replace data from, an existing Data Source. See [Data Sources](/classic/get-data-in/data-sources).

You can ingest data from files to Tinybird using the Data Sources API or the `tb datasource` CLI command. [Ingestion limits](/classic/pricing/limits#ingestion-limits) apply.

The following examples show how to use the Data Sources API to perform various tasks. See the [Data Sources API Reference](/api-reference/datasource-api) for more information.

## Import a file into a new Data Source

Tinybird can create a Data Source from a file. This operation supports CSV, NDJSON, and Parquet files. You can create a Data Source from local or remote files.

{% callout type="info" %}
Automatic schema inference is supported for CSV files, but isn't supported for NDJSON or Parquet files.
{% /callout %}

### CSV files

CSV files must follow these requirements:

- One line per row
- Comma-separated

Tinybird supports Gzip compressed CSV files with .csv.gz extension.

The Data Sources API automatically detects and optimizes your column types, so you don't need to manually define a schema. You can use the `type_guessing=false` parameter to force Tinybird to use `String` for every column.

CSV headers are optional. When creating a Data Source from a CSV file, if your file contains a header row, Tinybird uses the header to name your columns. If no header is present, your columns receive default names with an incrementing number. 

When appending a CSV file to an existing Data Source, if your file has a header, Tinybird uses the headers to identify the columns. If no header is present, Tinybird uses the order of columns. If the order of columns in the CSV file is always the same, you can omit the header line.

For example, to create a new Data Source from a local file using cURL:

```shell {% title="Creating a Data Source from a local CSV file" %}
curl \
-H "Authorization: Bearer <DATASOURCES:CREATE token>" \
-X POST "{% user("apiHost") %}/v0/datasources?name=my_datasource_name" \
-F csv=@local_file.csv
```

From a remote file:

```shell {% title="Creating a Data Source from a remote CSV file" %}
curl \
-H "Authorization: Bearer <DATASOURCES:CREATE token>" \
-X POST "{% user("apiHost") %}/v0/datasources?name=my_datasource_name" \
-d url='https://s3.amazonaws.com/nyc-tlc/trip+data/fhv_tripdata_2018-12.csv'
```

{% callout %}
When importing a remote file from a URL, the response contains the details of an import Job. To see the status of the import, use the [Jobs API](/api-reference/jobs-api).
{% /callout %}

### NDJSON and Parquet files

The Data Sources API doesn't support automatic schema inference for NDJSON and Parquet files. You must specify the `schema` parameter with a valid schema to parse the files.

The schema for both NDJSON and Parquet files uses [JSONPath](/classic/cli/datafiles/datasource-files#jsonpath-expressions) syntax to identify columns in the data. You can add default values to the schema.

Tinybird supports compressed NDJSON and Parquet files with .ndjson.gz and .parquet.gz extensions.

{% callout type="tip" %}
You can use the [Analyze API](#generate-schemas-with-the-analyze-api) to automatically generate a schema definition from a file.
{% /callout %}

For example, assume your NDJSON or Parquet data looks like this:

```json {% title="Simple NDJSON data example" %}
{ "id": 123, "name": "Al Brown"}
```

Your schema definition must provide the JSONPath expressions to identify the columns `id` and `name`:

```shell {% title="Simple NDJSON schema definition" %}
id Int32 `json:$.id`,
name String `json:$.name`
```

To create a new Data Source from a local file using cURL, you must URL encode the Schema as a query parameter. The following examples use NDJSON. To use Parquet, adjust the `format` parameter to `format=parquet`:

```shell {% title="Creating a Data Source from a local NDJSON file" %}
curl \
-H "Authorization: Bearer <DATASOURCES:CREATE token>" \
-X POST "{% user("apiHost") %}/v0/datasources?name=events&mode=create&format=ndjson&schema=id%20Int32%20%60json%3A%24.id%60%2C%20name%20String%20%60json%3A%24.name%60" \
-F ndjson=@local_file.ndjson
```

From a remote file:

```shell {% title="Creating a Data Source from a remote NDJSON file" %}
curl \
-H "Authorization: Bearer <DATASOURCES:CREATE token>" \
-X POST "{% user("apiHost") %}/v0/datasources?name=events&mode=create&format=ndjson" \
--data-urlencode "schema=id Int32 \`json:$.id\`, name String \`json:$.name\`" \
-d url='http://example.com/file.json'
```

Note the escape characters in this example are only required due to backticks in cURL.

{% callout %}
When importing a remote file from a URL, the response contains the details of an import Job. To see the status of the import, you must the [Jobs API](/api-reference/jobs-api).
{% /callout %}

To add default values to the schema, use the ``DEFAULT`` parameter after the JSONPath expressions. For example:

```shell {% title="Simple NDJSON schema definition with default values" %}
id Int32 `json:$.id` DEFAULT 1,
name String `json:$.name` DEFAULT 'Unknown'
```

## Create an NDJSON Data Source from a schema using JSON type

You can create an NDJSON Data Source using the JSON column type through the `schema` parameter. For example:

```shell
curl \\
            -H "Authorization: Bearer <DATASOURCES:CREATE token>" \\
            -X POST "https://api.tinybird.co/v0/datasources" \\
            -d "name=example" \\
            -d "format=ndjson" \\
            -d "schema=data JSON `json:$`"
```

## Append a file into an existing Data Source

If you already have a Data Source, you can append the contents of a file to the existing data.

This operation supports CSV, NDJSON, and Parquet files.

You can append data from local or remote files.

{% callout type="tip" %}
When appending CSV files, you can improve performance by excluding the CSV Header line. However, in this case, you must ensure the CSV columns are ordered. If you can't guarantee the order of column in your CSV, include the CSV Header.
{% /callout %}

For example, to append data into an existing Data Source from a local file using cURL:

```shell {% title="Appending data to a Data Source from a local CSV file" %}
curl \
-H "Authorization: Bearer <DATASOURCES:APPEND token>" \
-X POST "{% user("apiHost") %}/v0/datasources?mode=append&name=my_datasource_name" \
-F csv=@local_file.csv
```

From a remote file:

```shell {% title="Appending data to a Data Source from a remote CSV file" %}
curl \
-H "Authorization: Bearer <DATASOURCES:APPEND token>" \
-X POST "{% user("apiHost") %}/v0/datasources?mode=append&name=my_datasource_name" \
-d url='https://s3.amazonaws.com/nyc-tlc/trip+data/fhv_tripdata_2018-12.csv'
```

{% callout %}
If the Data Source has dependent Materialized Views, data is appended in cascade.
{% /callout %}

## Replace data in an existing Data Source with a file

If you already have a Data Source, you can replace existing data with the contents of a file. You can replace all data or a selection of data.

This operation supports CSV, NDJSON, and Parquet files.

You can replace with data from local or remote files.

For example, to replace all the data in a Data Source with data from a local file using cURL:

```shell {% title="Replacing a Data Source from a URL" %}
curl \
-H "Authorization: Bearer <DATASOURCES:CREATE token>" \
-X POST "{% user("apiHost") %}/v0/datasources?mode=replace&name=data_source_name&format=csv" \
-F csv=@local_file.csv
```

From a remote file:

```shell {% title="Replacing a Data Source from a URL" %}
curl \
-H "Authorization: Bearer <DATASOURCES:CREATE token>" \
-X POST "{% user("apiHost") %}/v0/datasources?mode=replace&name=data_source_name&format=csv" \
--data-urlencode "url=http://example.com/file.csv"
```

Rather than replacing all data, you can also replace specific partitions of data. This operation is atomic.

To do this, use the `replace_condition` parameter. This parameter defines the filter that's applied, where all matching rows are deleted before finally ingesting the new file. Only the rows matching the condition are ingested.

{% callout type="caution" %}
If the source file contains rows that don't match the filter, the rows are ignored.
{% /callout %}

Replacements are made by partition, so make sure that the `replace_condition` filters on the partition key of the Data Source.

To replace filtered data in a Data Source with data from a local file using cURL, you must URL encode the `replace_condition` as a query parameter. For example:

```shell {% title="Replace filtered data in a Data Source with data from a local file" %}
curl \
-H "Authorization: Bearer <DATASOURCES:CREATE token>" \
-X POST "{% user("apiHost") %}/v0/datasources?mode=replace&name=data_source_name&format=csv&replace_condition=my_partition_key%20%3E%20123" \
-F csv=@local_file.csv
```

From a remote file:

```shell {% title="Replace filtered data in a Data Source with data from a remote file" %}
curl \
-H "Authorization: Bearer <DATASOURCES:CREATE token>" \
-X POST "{% user("apiHost") %}/v0/datasources?mode=replace&name=data_source_name&format=csv" \
-d replace_condition='my_partition_key > 123' \
--data-urlencode "url=http://example.com/file.csv"
```

All the dependencies of the Data Source, for example Materialized Views, are recalculated so that your data is consistent after the replacement. If you have n-level dependencies, they're also updated by this operation. 

Taking the example `A --> B --> C`, if you replace data in A, Data Sources B and C are automatically updated. The Partition Key of Data Source C must also be compatible with Data Source A.

You can find more examples in the [Replace and delete data](/classic/get-data-in/data-operations/replace-and-delete-data#replace-data-selectively) guide.

{% callout type="caution" %}
Although replacements are atomic, Tinybird can't assure data consistency if you continue appending data to any related Data Source at the same time the replacement takes place. The new incoming data is discarded.
{% /callout %}

## Creating an empty Data Source from a schema

When you want to have more granular control about the Data Source schema, you can manually create the Data Source with a specified schema.

For example, to create an empty Data Source with a set schema using cURL:

```shell {% title="Create an empty Data Source with a set schema" %}
curl \
-H "Authorization: Bearer <DATASOURCES:CREATE token>" \
-X POST "{% user("apiHost") %}/v0/datasources?name=stocks" \
-d "schema=symbol String, date Date, close Float32"
```

{% callout %}
To create an empty Data Source, you must pass a `schema` with your desired column names and types and leave the `url` parameter empty.
{% /callout %}

## Generate schemas with the Analyze API

The Analyze API can analyze a given NDJSON or Parquet file to produce a valid schema. The column names, types, and JSONPaths are inferred from the file.

For example, to analyze a local NDJSON file using cURL:

```shell {% title="analyze an NDJSON file to get a valid schema" %}
curl \
-H "Authorization: Bearer <DATASOURCES:CREATE token>" \
-X POST "{% user("apiHost") %}/v0/analyze" \
-F "ndjson=@local_file_path"
```

The response contains a `schema` field that can be used to create your Data Source. For example:

```json {% title="Successful analyze response" %}
{
    "analysis": {
        "columns": [{
                "path": "$.a_nested_array.nested_array[:]",
                "recommended_type": "Array(Int16)",
                "present_pct": 3,
                "name": "a_nested_array_nested_array"
            },
            {
                "path": "$.an_array[:]",
                "recommended_type": "Array(Int16)",
                "present_pct": 3,
                "name": "an_array"
            },
            {
                "path": "$.field",
                "recommended_type": "String",
                "present_pct": 1,
                "name": "field"
            },
            {
                "path": "$.nested.nested_field",
                "recommended_type": "String",
                "present_pct": 1,
                "name": "nested_nested_field"
            }
        ],
        "schema": "a_nested_array_nested_array Array(Int16) `json:$.a_nested_array.nested_array[:]`, an_array Array(Int16) `json:$.an_array[:]`, field String `json:$.field`, nested_nested_field String `json:$.nested.nested_field`"
    },
    "preview": {
        "meta": [{
                "name": "a_nested_array_nested_array",
                "type": "Array(Int16)"
            },
            {
                "name": "an_array",
                "type": "Array(Int16)"
            },
            {
                "name": "field",
                "type": "String"
            },
            {
                "name": "nested_nested_field",
                "type": "String"
            }
        ],
        "data": [{
            "a_nested_array_nested_array": [
                1,
                2,
                3
            ],
            "an_array": [
                1,
                2,
                3
            ],
            "field": "test",
            "nested_nested_field": "bla"
        }],
        "rows": 1,
        "statistics": {
            "elapsed": 0.00032175,
            "rows_read": 2,
            "bytes_read": 142
        }
    }
}
```

## Error handling

Most errors return an HTTP Error code, for example `HTTP 4xx` or `HTTP 5xx`.

However, if the imported file is valid, but some rows failed to ingest due to an incompatible schema, you might still receive an `HTTP 200`. In this case, the Response body contains two keys, `invalid_lines` and `quarantine_rows`, which tell you how many rows failed to ingest. 

Additionally, an `error` key is present with an error message.

```json {% title="Successful ingestion with errors" %}
{
"import_id": "e9ae235f-f139-43a6-7ad5-a1e17c0071c2",
"datasource": {
"id": "t_0ab7a11969fa4f67985cec481f71a5c2",
"name": "your_datasource_name",
"cluster": null,
"tags": {},
"created_at": "2019-03-12 17:45:04",
"updated_at": "2019-03-12 17:45:04",
"statistics": {
"bytes": 1397,
"row_count": 4
},
"replicated": false,
"version": 0,
"project": null,
"used_by": []
},
"error": "There was an error with file contents: 2 rows in quarantine and 2 invalid lines",
"quarantine_rows": 2,
"invalid_lines": 2
}
```
