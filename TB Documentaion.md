---
title: Quick start guide
meta:
    description: Follow this step-by-step tutorial to get started with Tinybird.
---

# Get started with Tinybird

Follow these steps to install Tinybird Local and Tinybird CLI on your machine, build your first data project, and deploy it to Tinybird Cloud.

See [Core concepts](/forward/get-started/concepts) for a complete overview of Tinybird.

## Before you begin

To get started, you need the following:

- A container runtime, like Docker or Orbstack
- Linux or macOS

## Deploy a new project in five minutes

{% steps %}

### Create a Tinybird account

If you don't already have a Tinybird account, you can create one at [cloud.tinybird.co](https://cloud.tinybird.co) -- it's free!

### Install and authenticate

Run the following command to install the Tinybird CLI:

{% snippet title="install-tinybird-forward" /%}

Then, authenticate with your Tinybird account using `tb login`:

```shell§
tb login
```

In the browser, create a new workspace or select an existing one.

### Run Tinybird Local

After you've authenticated, run `tb local start` to start a Tinybird Local instance in a Docker container, allowing you to develop and test your project locally.

```shell
tb local start
```

### Create a project

Start with the project structure `tb create`:

```shell
tb create 

# » Creating new project structure...
# Learn more about data files https://www.tinybird.co/docs/forward/datafiles
# ./datasources       → Where your data lives. Define the schema and settings for your tables.
# ./endpoints         → Expose real-time HTTP APIs of your transformed data.
# ./materializations  → Stream continuous updates of the result of a pipe into a new data source.
# ./copies            → Capture the result of a pipe at a moment in time and write it into a target data source.
# ./sinks             → Export your data to external systems on a scheduled or on-demand basis.
# ./pipes             → Transform your data and reuse the logic in endpoints, materializations and copies.
# ./fixtures          → Files with sample data for your project.
# ./tests             → Test your pipe files with data validation tests.
# ./connections       → Connect to and ingest data from popular sources: Kafka, S3 or GCS.
# ✓ Scaffolding completed!


# » Creating .env.local file...
# ✓ Done!


# » Creating CI/CD files for GitHub and GitLab...
# ./.gitignore
# ./.github/workflows/tinybird-ci.yml
# ./.github/workflows/tinybird-cd.yml
# ./.gitlab-ci.yml
# ./.gitlab/tinybird/tinybird-ci.yml
# ./.gitlab/tinybird/tinybird-cd.yml
# ✓ Done!


# » Creating rules...
# ./.cursorrules
# ✓ Done!


# » Creating Claude Code rules...
# ./CLAUDE.md
# ✓ Done!
```

First things first, you need a data source. Use NYC yellow taxis [dataset](https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page) if you don't have sample data.

```shell
tb datasource create --url https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2025-05.parquet --name trips
# Running against Tinybird Local

# » Creating .datasource file...
# /datasources/trips.datasource
# ✓ .datasource created!
```

Data sources are the definition of the database tables where you will store the data. More information about data sources [here](/forward/dev-reference/datafiles/datasource-files).

#### Content of /datasources/trips.datasource

Inspecting the file you see a description and the schema, with the column names, their types, and the [JSONPath](/forward/dev-reference/datafiles/datasource-files#jsonpath-expressions) to access the parquet fields.

```tb {% title="datasources/trips.datasource" %}
DESCRIPTION >
    Generated from https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2025-05.parquet

SCHEMA >
    VendorID Int32 `json:$.VendorID`,
    tpep_pickup_datetime DateTime64(6) `json:$.tpep_pickup_datetime`,
    tpep_dropoff_datetime DateTime64(6) `json:$.tpep_dropoff_datetime`,
    passenger_count Int64 `json:$.passenger_count`,
    trip_distance Float64 `json:$.trip_distance`,
    RatecodeID Int64 `json:$.RatecodeID`,
    store_and_fwd_flag String `json:$.store_and_fwd_flag`,
    PULocationID Int32 `json:$.PULocationID`,
    DOLocationID Int32 `json:$.DOLocationID`,
    payment_type Int64 `json:$.payment_type`,
    fare_amount Float64 `json:$.fare_amount`,
    extra Float64 `json:$.extra`,
    mta_tax Float64 `json:$.mta_tax`,
    tip_amount Float64 `json:$.tip_amount`,
    tolls_amount Float64 `json:$.tolls_amount`,
    improvement_surcharge Float64 `json:$.improvement_surcharge`,
    total_amount Float64 `json:$.total_amount`,
    congestion_surcharge Float64 `json:$.congestion_surcharge`,
    Airport_fee Float64 `json:$.Airport_fee`,
    cbd_congestion_fee Float64 `json:$.cbd_congestion_fee`
```

{% callout type="info" %}
**Agent mode**: Note that if you run simply `tb`, the CLI will run in "agent mode", enabling you to work purely with natural language commands. Read more about [Tinybird code](/forward/tinybird-code).
{% /callout %}

### Add fixtures data for testing

It is important to test locally, and if you're going to add this file to your repo, it is better not to have real production data in case it contains PII. `tb mock` will create synthetic data for that, and with `--prompt` and `--rows` flags you can customize it.

```shell
tb mock trips --prompt "data looks like this {'VendorID':1,'tpep_pickup_datetime':1746058026000,'tpep_dropoff_datetime':1746059055000,'passenger_count':1,'trip_distance':3.7,'RatecodeID':1,'store_and_fwd_flag':'N','PULocationID':140,'DOLocationID':202,'payment_type':1,'fare_amount':18.4,'extra':4.25,'mta_tax':0.5,'tip_amount':4.85,'tolls_amount':0,'improvement_surcharge':1,'total_amount':29,'congestion_surcharge':2.5,'Airport_fee':0,'cbd_congestion_fee':0.75} and location ids range go from 1 to 265" --rows 10000
# Running against Tinybird Local

# » Creating fixture for trips...
# ✓ /fixtures/trips.ndjson created
# ✓ Sample data for trips created with 10000 rows
```

### Add the lookup table and create an endpoint

Projects in Tinybird usually consist of data sources and API Endpoints to expose the query results. Create one to check in which zone passengers give bigger tips.
Also, trips data source has two columns, `PULocationID` and `DOLocationID` that need a reference table to be understood. Add that table as well.

Use `tb create` command. It is not just for scaffolding, it allows you to create resources passing the `--prompt` and `--data` options.

```shell
tb create \
    --prompt "Create the lookup table (data attached) and add an endpoint that finds which Zone is more likely to have better tips for a given pickup location (default to JFK Airport but make it dynamic so users enter the pickup zone in text).
    Note: Trips parquet file rows look like this: {'VendorID':1,'tpep_pickup_datetime':1746058026000,'tpep_dropoff_datetime':1746059055000,'passenger_count':1,'trip_distance':3.7,'RatecodeID':1,'store_and_fwd_flag':'N','PULocationID':140,'DOLocationID':202,'payment_type':1,'fare_amount':18.4,'extra':4.25,'mta_tax':0.5,'tip_amount':4.85,'tolls_amount':0,'improvement_surcharge':1,'total_amount':29,'congestion_surcharge':2.5,'Airport_fee':0,'cbd_congestion_fee':0.75}
    Note 2: for the lookup, prioritize subqueries over joins" \
    --data "https://d37ci6vzurychx.cloudfront.net/misc/taxi_zone_lookup.csv"

# » Creating resources...
# ./datasources/taxi_zone_lookup.datasource
# ./endpoints/taxi_zone_lookup_endpoint.pipe
# ./endpoints/best_tip_zones.pipe

# » Creating project description...
# ./README.md
# ✓ Resources created!


# » Generating fixtures...
# ./fixtures/taxi_zone_lookup.csv
# ✓ Done!
```

#### /datasources/taxi_zone_lookup.datasource

In this case, as it is a CSV data source there are no JSONPaths and column names are taken from CSV headers.

```tb {% title="datasources/taxi_zone_lookup.datasource" %}
DESCRIPTION >
    Generated from https://d37ci6vzurychx.cloudfront.net/misc/taxi_zone_lookup.csv

SCHEMA >
    `locationid` Int32,
    `borough` String,
    `zone` String,
    `service_zone` String
```

#### /fixtures/taxi_zone_lookup.csv

A sample of the CSV data so you can test locally.

```csv {% title="fixtures/rows.csv" %}
"LocationID","Borough","Zone","service_zone"
1,"EWR","Newark Airport","EWR"
2,"Queens","Jamaica Bay","Boro Zone"
3,"Bronx","Allerton/Pelham Gardens","Boro Zone"
4,"Manhattan","Alphabet City","Yellow Zone"
5,"Staten Island","Arden Heights","Boro Zone"
```

#### endpoints/best_tip_zones.pipe

Endpoints are a kind of [pipe](/forward/work-with-data/pipes) that you can call from other applications. You have data in a data source, use a pipe to build SQL logic, and then publish the result of your query as a REST API endpoint. Pipes contain just SQL and a [templating language](/forward/work-with-data/query-parameters) that lets you add query parameters to the API. More details about Endpoints [here](/forward/work-with-data/publish-data/endpoints).

```sql {% title="endpoints/best_tip_zones.pipe" %}
DESCRIPTION >
    Finds which Zone is more likely to have better tips for a given pickup location

NODE best_tip_zones_query
SQL >
    %
    WITH pickup_zone AS (
        SELECT locationid
        FROM taxi_zone_lookup
        WHERE zone = {{String(pickup_zone, 'JFK Airport')}}
        LIMIT 1
    )
    SELECT
        tz.zone AS dropoff_zone,
        tz.borough AS dropoff_borough,
        AVG(tip_amount / fare_amount) AS avg_tip_ratio,
        COUNT(*) AS trip_count
    FROM trips t
    JOIN taxi_zone_lookup tz ON t.DOLocationID = tz.locationid
    WHERE
        t.PULocationID = (SELECT locationid FROM pickup_zone)
        AND t.fare_amount > 0
        AND t.payment_type = 1 -- Credit card payments only
    GROUP BY dropoff_zone, dropoff_borough
    ORDER BY avg_tip_ratio DESC
    LIMIT 20

TYPE ENDPOINT
```

### Run the development server

To start developing, run the `tb dev` command and start editing the data files within the created project directory. This command starts the development server and also provides a console to interact with the database. The project will automatically rebuild and reload upon saving changes to any file.

```shell
tb dev

# » Building project...
# ✓ datasources/taxi_zone_lookup.datasource created
# ✓ datasources/trips.datasource created
# ✓ endpoints/taxi_zone_lookup_endpoint.pipe created
# ✓ endpoints/best_tip_zones.pipe created

# ✓ Build completed in 1.5s

# Watching for changes...

# tb »
```

### Test the API Endpoint

The goal is to have a working endpoint that you can call from other applications.

#### About tokens

All Tinybird API calls require authentication using a **token**. Tokens control who can access your data and what they can do with it. Think of them like API keys that protect your endpoints.

For local development, Tinybird automatically creates an admin token for you: `admin local_testing@tinybird.co`. This token has full permissions in your local environment, making it perfect for testing.

#### Making your first API call

Default local url is `http://localhost:7181` and your local admin token is `admin local_testing@tinybird.co`.  

Outside the dev server, copy the token value with `tb token copy` and use it to call the endpoint. Send the `pickup_zone` parameter with a value of `Newark Airport` and check the response.

```shell
tb token copy "admin local_testing@tinybird.co" && TB_LOCAL_TOKEN=$(pbpaste)

curl -X GET "http://localhost:7181/v0/pipes/best_tip_zones.json?token=$TB_LOCAL_TOKEN&pickup_zone=Newark+Airport"
# {
#         "meta":
#         [
#                 {
#                         "name": "dropoff_zone",
#                         "type": "String"
#                 },
#                 {
#                         "name": "dropoff_borough",
#                         "type": "String"
#                 },
#                 {
#                         "name": "avg_tip_ratio",
#                         "type": "Float64"
#                 },
#                 {
#                         "name": "trip_count",
#                         "type": "UInt64"
#                 }
#         ],
#
#         "data":
#         [
#                 {
#                         "dropoff_zone": "Newark Airport",
#                         "dropoff_borough": "EWR",
#                         "avg_tip_ratio": 0.22222222219635465,
#                         "trip_count": 8
#                 }
#         ],
#
#         "rows": 1,
#
#         "rows_before_limit_at_least": 1,
#
#         "statistics":
#         {
#                 "elapsed": 0.018887949,
#                 "rows_read": 10530,
#                 "bytes_read": 339680
#         }
# }
```

### Deploy to Tinybird Cloud

To deploy to Tinybird Cloud, create a deployment using the `--cloud` flag. This prepares all the resources in the cloud environment.

```shell
tb --cloud deploy
```

### Append data to Tinybird Cloud

Use `tb datasource append` with the `--cloud` flag to ingest the data from the URL into Tinybird Cloud.

```shell
tb --cloud datasource append trips --url "https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2025-05.parquet"
tb --cloud datasource append taxi_zone_lookup --url "https://d37ci6vzurychx.cloudfront.net/misc/taxi_zone_lookup.csv"

# Running against Tinybird Cloud: Workspace quickstart

# » Appending data to trips
# ✓ Rows appended!
# Running against Tinybird Cloud: Workspace quickstart

# » Appending data to taxi_zone_lookup
# ✓ Rows appended!
```

### Open the project in Tinybird Cloud

To open the project in Tinybird Cloud, run the following command:

```shell
tb --cloud open
```

Go to **Endpoints** and select an endpoint to see stats and snippets.

{% callout type="note" %}
**Tokens in production**: Your local admin token (`admin local_testing@tinybird.co`) won't work with Tinybird Cloud. The cloud environment has its own tokens for security. When you need to call your cloud endpoints from applications, create specific tokens with limited permissions. See [Tokens](/forward/administration/tokens) for details.
{% /callout %}

{% /steps %}

## Next steps

- Familiarize yourself with Tinybird concepts. See [Core concepts](/forward/get-started/concepts).
- Learn about datafiles, like .datasource and .pipe files. See [Datafiles](/forward/dev-reference/datafiles).
- Get data into Tinybird from a variety of sources. See [Get data in](/forward/get-data-in).
- Learn about authentication and securing your endpoints. See [Tokens](/forward/administration/tokens).
- Browse the Tinybird CLI commands reference. See [Commands reference](/forward/dev-reference/commands).
- Learn with a more detailed example. See [Learn](/forward/get-started/learn).
- Detect and fix Quarantine errors. See [Quarantine](/forward/get-data-in/quarantine).
