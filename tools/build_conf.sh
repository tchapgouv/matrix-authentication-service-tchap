#!/bin/sh

# New template directory
MAS_TCHAP_DATA="$MAS_TCHAP_HOME/tmp"
# Create data directory
if [ ! -d "$MAS_TCHAP_DATA" ]; then
  mkdir -p "$MAS_TCHAP_HOME"
fi

MAS_TCHAP_TEMPLATES="$MAS_TCHAP_DATA/templates"

# Copy all MAS templates to a new template directory
cp -r "$MAS_HOME/templates" "$MAS_TCHAP_TEMPLATES"

# Override MAS template with custom tchap template
cp -r "$MAS_TCHAP_HOME/templates" "$MAS_TCHAP_TEMPLATES"

# Create MAS conf file
template_yaml_file="$MAS_TCHAP_HOME/conf/config.template.yaml"
yaml_file="$MAS_TCHAP_DATA/config.local.dev.yaml"

cp $template_yaml_file $yaml_file

sed -i '' -E "/^templates:/,/^[^[:space:]]/ s|^[[:space:]]*path:.*|  path: \"$MAS_TCHAP_TEMPLATES\"|" "$yaml_file"
