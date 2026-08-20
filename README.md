# danjam Custom Cards

Custom Home Assistant Lovelace cards for the homelab dashboard.

## Cards

### system-panel-card

System control panel with status indicators, collapsible stats, and power controls.

```yaml
type: custom:system-panel-card
name: orac
icon: mdi:server
status_entity: sensor.orac_status
badge_entity: sensor.orac_uptime_kuma_status
uptime_entity: sensor.orac_uptime
temp_entity: sensor.orac_temperature_coretemp_package_id_0
stats:
  - entity: sensor.orac_cpu_usage
    name: CPU
    icon: mdi:chip
  - entity: sensor.orac_memory_usage
    name: Memory
    icon: mdi:memory
  - entity: sensor.orac_disk_usage
    name: Disk
    icon: mdi:harddisk
actions:
  - entity: button.orac_reboot
    name: Reboot
    icon: mdi:restart
    color: orange
    confirmation: "Reboot orac?"
```

### ai-describe-card

On-demand AI description for any media source. Tap to analyse, hover to re-trigger.

```yaml
type: custom:ai-describe-card
source: camera.living_room
source_type: camera
summary_entity: input_text.living_room_camera_summary
prompt: "What's happening in this camera shot? A couple of casual sentences."
```

Requires a `script.ai_describe` script and an `ai_task` entity (e.g. Google AI Task).

## Installation

1. Add this repository as a custom HACS repository (category: Lovelace)
2. Install "danjam Custom Cards" from HACS
3. Hard refresh your browser
