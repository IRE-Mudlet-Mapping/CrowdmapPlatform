#!/usr/bin/env bash

set -uo pipefail

old_map="${1:-old/Map/map.json}"
current_map="${2:-current/Map/map.json}"
normalise='walk(if type == "array" then sort else . end)'

diff -u5 --speed-large-files \
  <(jq --sort-keys "$normalise" < "$old_map") \
  <(jq --sort-keys "$normalise" < "$current_map")
status=$?

if [ "$status" -eq 0 ]; then
  echo "No diff in JSON file"
elif [ "$status" -gt 1 ]; then
  echo "An error occurred while generating the JSON diff" >&2
fi

exit "$status"
