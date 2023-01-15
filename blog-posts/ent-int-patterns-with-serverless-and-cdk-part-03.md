# Enterprise Integration Patterns - Observability

## Overview

- Business events vs. system events
- How an EDA approach allows observability to be implemented in a decoupled way
- Simple logging approach, coupled with Application Insights
- Recording business metrics using EMF and power tools
- Add an alarm to alert 
- Adding an event log to enable durations to be calculated
- Adding a follow-up event to check that the quote was processed (maybe for a later post)
  - https://docs.aws.amazon.com/scheduler/latest/UserGuide/what-is-scheduler.html
  - https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html#one-time
  - https://dev.to/kumo/9-surprises-using-aws-eventbridge-scheduler-13b6
  - https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Scheduler.html#createSchedule-property
- Adding error events and alarms
- Add a dashboard (maybe for a another post)