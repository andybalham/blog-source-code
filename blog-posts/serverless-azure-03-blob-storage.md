# Adding Blob Storage

## Steps

- Store the requests in local storage and explore that storage

## Design

Have two containers:

- ValidWebhookPayloads: `/{tenantId}/{senderId}/{contractId}/{yyyy-mm-dd}/{messageId}.json`
- InvalidWebhookPayloads: `/{tenantId}/{senderId}/{contractId}/{yyyy-mm-dd}/{messageId}.json`

We will return `messageId` as a custom header `10piac-message-id`.

We will log out a message to link the `messageId` to the location of the payload.

## Questions

- Should we assign a unique id and return that as a custom header?
  - Yes

- Does the choice of 'folder' structure affect the event in any way?
  - Yes, see `BlobTrigger("samples-work-items/{name}", Connection = "AzureWebJobsStorage")]`
