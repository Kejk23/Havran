# Dynamic dashboard

All definitios for dynamic dashboards and svgs are stored in repository path data dir
```
{Dynamic Dir}
```
This file also contains `schema.json` which is json schema for dashboard definitions.

*Don't edit demo/schema/factory files, they will be overwritten when server starts*

To start adding definition, create in definitions dir new file with `.json` extension and paste there 
```
{
  "$schema": "./schema.json"
}
```
which will tell your IDE that it should start use schema for validation. By this time your IDE should start telling you that something is missing, if not, you need to install (or enable) json validator plugin or choose IDE with JSON validations.

*tip: each cell has unique type property, select type first and IDE will help you fill in rest of the cell properties*

## Properties

### Layout
layout properties (`x`, `y`, `w`, `h`) are used by react-grid-layout with **12** columns

examples:
 - [example-0](https://react-grid-layout.github.io/react-grid-layout/examples/0-showcase.html) 
 - [example-2](https://react-grid-layout.github.io/react-grid-layout/examples/2-no-dragging.html)


## Curently supported plot types

### line
### gauge
### svg

Adding svg to plot, copy svg file into defintion file
 - enshure it's svg element has attribute `xmlns="http://www.w3.org/2000/svg"`
 - don't use inkskape or other program svgs, export svg as plain svg file (save as... select plain svg)
 - create cell with svgs filename (no `.svg` extension)

# Troubleshooting

## svg not showing

svg element has to contain attribute `xmlns="http://www.w3.org/2000/svg"`

## svg is showing `{value}` instead of number

all svg values has to be defined in cell in definition of given dashboard

