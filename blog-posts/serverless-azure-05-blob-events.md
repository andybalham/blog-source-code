# Reacting to Blob Storage events

Dilemma:

- Deprecated polling approach vs. Event Grid push approach
- React directly to events vs. writing to a queue
  - Need to test the failure scenario with dead letter queues and replaying
  - If writing to a queue, then Storage queues vs. Service Bus queues
    - [Storage queues and Service Bus queues - compared and contrasted](https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-azure-and-service-bus-queues-compared-contrasted)
    - [What is Azure Queue Storage?](https://learn.microsoft.com/en-us/azure/storage/queues/storage-queues-introduction)

Further thoughts:

- Should we implement idempotency at the Validate and Store stage?
  - Or should we always store and de-dupe at the forward stage? E.g. using a hash of the message content before we write to the next queue?
  - What should we use for the list of hashes? Cosmos DB?

Could have:

- DedupeAndQueueFunction
- InvokeEndpointFunction (This might want to dedupe as well, but can do it on message id and not hash)

