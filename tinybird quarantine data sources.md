---
title: Quarantine
meta:
    description: Quarantine data sources store data that doesn't fit the schema.
---

# Quarantine data sources

Every data source in your workspace has an associated quarantine data source that stores data that doesn't fit the schema. If you send rows that don't match the data source schema, they're automatically sent to the quarantine table so that the ingest process doesn't fail.

By convention, quarantine data sources follow the naming pattern `{datasource_name}_quarantine`. You can review quarantined rows at any time or perform operations on them using Pipes. This is a useful source of information when fixing issues in the origin source or applying changes during ingest.

## Review quarantined data

To check your quarantine data sources, run the `tb sql` command. For example:

```shell
tb sql "select * from <datasource_name>_quarantine limit 10"
```

A sample output of the `tb sql` command is the following:

```text
──────────────────────────────────────────────────────────────────
c__error_column: ['abslevel']
c__error: ["value '' on column 'abslevel' is not Float32"]
c__import_id: 01JKQPWT8GVXAN5GJ1VBD4XM27
day: 2014-07-30
station: Embassament de Siurana (Cornudella de Montsant)
volume: 11.57
insertion_date: 2025-02-10 10:36:20
──────────────────────────────────────────────────────────────────
```

The quarantine data source schema contains the columns of the original row and the following columns with information about the issues that caused the quarantine:

- `c__error_column` Array(String) contains an array of all the columns that contain an invalid value.
- `c__error` Array(String) contains an array of all the errors that caused the ingestion to fail and led to the row being stored in quarantine. This column, along with `c__error_column`, allows you to easily identify which columns have problems and what the specific errors are
- `c__import_id` Nullable(String) contains the job's identifier in case the column was imported through a job.
- `insertion_date` (DateTime) contains the timestamp in which the ingestion was done.

## Fixing quarantined data example

Using the Electric Vehicle Population Data example:

```shell
tb create \
    --data "https://data.wa.gov/api/views/f6w7-q2d2/rows.csv?accessType=DOWNLOAD" \
    --prompt "Create an endpoint that ranks EV models. It should return all types by default, with optional type and limit parameters"
```

You build the project and get the following quarantine error:
`Error appending fixtures for 'rows': There was an error with file contents: 564 rows in quarantine.`

```shell
tb dev

» Building project...
✓ datasources/rows.datasource created
✓ endpoints/rows_endpoint.pipe created
✓ endpoints/model_ranking.pipe created
Error appending fixtures for 'rows': There was an error with file contents: 564 rows in quarantine.

✓ Build completed in 9.1s

Watching for changes...

tb »
```

Inspecting the `rows_quarantine` data source:

```shell
tb » select distinct c__error from rows_quarantine

» Running QUERY

────────────────────────────────────────────────────────────────────────────────────────────
c__error: ["value '' on column 'postal_code' is not Int64", "value '' on column 'legislative_district' is not Int16", "value '' on column 'c_2020_census_tract' is not Int64"]
────────────────────────────────────────────────────────────────────────────────────────────
c__error: ["value '' on column 'electric_range' is not Int32", "value '' on column 'base_msrp' is not Int64"]
────────────────────────────────────────────────────────────────────────────────────────────
c__error: ["value '' on column 'legislative_district' is not Int16"]
────────────────────────────────────────────────────────────────────────────────────────────
```

The problem is that some columns should be Nullable or have a DEFAULT value. Let's proceed with adding a DEFAULT value of 0 for them.

Edit the `datasources/rows.datasource` file.

``` {% title="datasources/rows.datasource" %}
DESCRIPTION >
    Generated from https://data.wa.gov/api/views/f6w7-q2d2/rows.csv?accessType=DOWNLOAD

SCHEMA >
    `vin__1_10_` String,
    `county` String,
    `city` String,
    `state` String,
    `postal_code` Int64 DEFAULT 0,
    `model_year` Int32,
    `make` String,
    `model` String,
    `electric_vehicle_type` String,
    `clean_alternative_fuel_vehicle__cafv__eligibility` String,
    `electric_range` Int32 DEFAULT 0,
    `base_msrp` Int64 DEFAULT 0,
    `legislative_district` Int16 DEFAULT 0,
    `dol_vehicle_id` Int64,
    `vehicle_location` String,
    `electric_utility` String,
    `c_2020_census_tract` Int64 DEFAULT 0
```

The dev server will rebuild the edited resources.

```shell
tb »

⟲ Changes detected in rows.datasource

» Rebuilding project...
✓ datasources/rows.datasource changed

✓ Rebuild completed in 1.1s
```

No errors now, you're good to continue developing.
