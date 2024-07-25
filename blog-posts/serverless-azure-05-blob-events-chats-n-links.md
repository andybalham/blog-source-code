# Chats and Links

- [Chats and Links](#chats-and-links)
  - [Links](#links)
    - [Reacting to Blob storage events](#reacting-to-blob-storage-events)
    - [Azure Blob storage trigger for Azure Functions](#azure-blob-storage-trigger-for-azure-functions)
    - [**Tutorial: Trigger Azure Functions on blob containers using an event subscription**](#tutorial-trigger-azure-functions-on-blob-containers-using-an-event-subscription)
  - [Does Azurite generate events when blobs are added to containers within it?](#does-azurite-generate-events-when-blobs-are-added-to-containers-within-it)
  - [How can I use the Azure Portal to hook Event Grid to Blob Storage events?](#how-can-i-use-the-azure-portal-to-hook-event-grid-to-blob-storage-events)
  - [I want to test an Azure Function locally that consumes 'Blob Created' events. How can I easily instantiate a suitable instance for testing?](#i-want-to-test-an-azure-function-locally-that-consumes-blob-created-events-how-can-i-easily-instantiate-a-suitable-instance-for-testing)
  - [How can I have an Azure Function that is triggered by Azure Blob Storage using Event Grid?](#how-can-i-have-an-azure-function-that-is-triggered-by-azure-blob-storage-using-event-grid)
  - [How can I parse the eventGridEvent.Data payload into a strongly-typed Blob Storage event?](#how-can-i-parse-the-eventgrideventdata-payload-into-a-strongly-typed-blob-storage-event)
  - [Does Azure Event Grid have dead letter queue functionality if it is unable to successfully deliver an event?](#does-azure-event-grid-have-dead-letter-queue-functionality-if-it-is-unable-to-successfully-deliver-an-event)

## Links

### [Reacting to Blob storage events](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-event-overview)

- Blob storage events are pushed using Azure Event Grid to subscribers such as Azure Functions, Azure Logic Apps, or even to your own http listener. Event Grid provides reliable event delivery to your applications through rich retry policies and dead-lettering.
- Event Grid Basic tier is priced as pay-per-use based on operations performed. Operations include published events, advanced filtering and delivery attempts to customised topics, system topics, partner topics and domains. Free usage per month: 100,000 operations.

### [Azure Blob storage trigger for Azure Functions](https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-blob-trigger?tabs=python-v2%2Cisolated-process%2Cnodejs-v4%2Cextensionv5&pivots=programming-language-csharp)

- There are several ways to execute your function code based on changes to blobs in a storage container. If you choose to use the Blob storage trigger, note that there are two implementations offered: a polling-based one (referenced in this article) and an event-based one. It is recommended that you use the event-based implementation as it has lower latency than the other. Also, the Flex Consumption plan supports only the event-based Blob storage trigger.

### **[Tutorial: Trigger Azure Functions on blob containers using an event subscription](https://learn.microsoft.com/en-us/azure/azure-functions/functions-event-grid-blob-trigger?pivots=programming-language-csharp)**

- Previous versions of the Azure Functions Blob Storage trigger poll your storage container for changes. More recent version of the Blob Storage extension (5.x+) instead use an Event Grid event subscription on the container. This event subscription reduces latency by triggering your function instantly as changes occur in the subscribed container.
- This article shows how you can test locally before deploying.

## Does Azurite generate events when blobs are added to containers within it?

> **I'm not sure that this is accurate, as the Microsoft documentation seems to infer you can test locally with Azurite.**

Azurite does simulate some Azure Storage functionality locally, but it has limitations compared to the full Azure service. Regarding blob events and Azure Functions:

1. Event generation: Azurite does not generate events for blob operations like the real Azure Blob Storage does. It's primarily focused on emulating the basic storage operations.

2. Azure Functions triggers: Due to the lack of event generation, you cannot directly trigger Azure Functions using blob triggers when working with Azurite locally.

However, there are some workarounds you can consider for local development:

1. Manual function invocation: You can manually invoke your Azure Functions for testing purposes.

2. Use the Azure Storage Emulator: While not exactly the same as Azurite, the Azure Storage Emulator provides more features for local development, including some event simulation capabilities.

3. Mock the trigger: You could create a mock trigger system that simulates the event generation for local testing.

4. Use actual Azure services: For full fidelity testing, you might need to use the actual Azure Blob Storage and Azure Functions in the cloud.

If you need more detailed information on working with Azure Functions locally or alternatives for event-driven development with Azurite, let me know and I can elaborate.

## How can I use the Azure Portal to hook Event Grid to Blob Storage events?

To connect Azure Event Grid to Blob Storage events using Azure Portal, you can follow these steps:

1. Open the Azure Portal and navigate to your Blob Storage account.

2. In the left menu, scroll down to the "Events" section and click on "Events."

3. Click the "+ Event Subscription" button at the top.

4. In the "Create Event Subscription" page:

- Enter a name for your subscription
- Select "Event Grid Schema" for the event schema
- Choose the topic type (it should default to "Storage account")

1. Under "Event Types," select the specific Blob Storage events you want to subscribe to (e.g., "Blob Created," "Blob Deleted").

2. For the endpoint type, choose where you want the events to be sent (e.g., WebHook, Azure Function, Logic App).

3. Configure the selected endpoint with the necessary details.

4. Optionally, configure advanced features like filters if needed.

5. Click "Create" to set up the event subscription.

This process will connect Event Grid to your Blob Storage events, allowing you to react to specified Blob operations in near-real-time.

Would you like me to elaborate on any part of this process or explain any specific concepts in more detail?

## I want to test an Azure Function locally that consumes 'Blob Created' events. How can I easily instantiate a suitable instance for testing?

To test an Azure Function locally that consumes 'Blob Created' events, you can use the Azure Storage Emulator and create a test event. Here's a step-by-step approach:

1. Set up your local environment:

   - Install Azure Functions Core Tools
   - Install Azure Storage Emulator (or Azurite, which is the cross-platform alternative)

2. Create a local Azure Function project if you haven't already.

3. In your function code, use the BlobTrigger binding. Your function signature might look like this:

```csharp
[FunctionName("BlobTriggerCSharp")]
public static void Run([BlobTrigger("samples-workitems/{name}", Connection = "AzureWebJobsStorage")]Stream myBlob, string name, ILogger log)
{
    log.LogInformation($"C# Blob trigger function Processed blob\n Name:{name} \n Size: {myBlob.Length} Bytes");
}
```

4. In your local.settings.json file, set up the connection string:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet"
  }
}
```

5. Start the Azure Storage Emulator or Azurite.

1. Run your function locally using the Azure Functions Core Tools:

```text
func start
```

6. To test, you can use Azure Storage Explorer (which supports connecting to the local emulator) to manually upload a blob to the specified container.

7. Alternatively, you can write a simple console application or script to create a blob in the emulated storage:

```csharp
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

string connectionString = "UseDevelopmentStorage=true";
string containerName = "samples-workitems";
string blobName = "test-blob.txt";
string blobContents = "This is a test blob.";

BlobServiceClient blobServiceClient = new BlobServiceClient(connectionString);
BlobContainerClient containerClient = blobServiceClient.GetBlobContainerClient(containerName);
await containerClient.CreateIfNotExistsAsync();

BlobClient blobClient = containerClient.GetBlobClient(blobName);
using (MemoryStream ms = new MemoryStream(Encoding.UTF8.GetBytes(blobContents)))
{
    await blobClient.UploadAsync(ms);
}
```

This approach allows you to test your Azure Function locally, simulating the 'Blob Created' event without needing to deploy to Azure or set up Event Grid.

Would you like me to explain any part of this process in more detail?

## How can I have an Azure Function that is triggered by Azure Blob Storage using Event Grid?

To create an Azure Function triggered by Azure Blob Storage using Event Grid, you'll need to set up a few components. Here's a step-by-step guide:

1. Create an Azure Function App:

   - In the Azure Portal, create a new Function App.
   - Choose your runtime stack (e.g., .NET, Node.js, Python).

2. Create a new function in your Function App:

   - Choose "Event Grid trigger" as the template.

3. Set up Event Grid subscription:

   - Go to your Azure Storage account.
   - Navigate to "Events" in the left menu.
   - Click "+ Event Subscription".
   - Name your subscription.
   - For "Event Schema", select "Event Grid Schema".
   - Under "Filter to Event Types", select the Blob events you're interested in (e.g., "Blob Created").
   - For "Endpoint Type", choose "Azure Function".
   - Select your function app and the specific function you created.

4. Code your function:
   Here's an example in C# for a function that responds to Blob Created events:

```csharp
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.EventGrid;
using Microsoft.Extensions.Logging;
using Azure.Messaging.EventGrid;

public static class BlobCreatedFunction
{
    [FunctionName("BlobCreatedFunction")]
    public static void Run([EventGridTrigger]EventGridEvent eventGridEvent, ILogger log)
    {
        log.LogInformation(eventGridEvent.Data.ToString());

        // Your logic here to handle the blob created event
    }
}
```

5. Configure your function:
   - In your function's `function.json` file, ensure you have the correct binding:

```json
{
  "bindings": [
    {
      "type": "eventGridTrigger",
      "name": "eventGridEvent",
      "direction": "in"
    }
  ]
}
```

6. Deploy your function:

   - You can deploy directly from Visual Studio, VS Code, or using Azure CLI.

7. Test your function:
   - Upload a blob to your storage account.
   - Check your function's logs to see if it was triggered and processed the event.

This setup allows your Azure Function to react to Blob Storage events in near-real-time using Event Grid, which is more scalable and flexible than the traditional Blob trigger.

## How can I parse the eventGridEvent.Data payload into a strongly-typed Blob Storage event?

To parse the EventGridEvent.Data payload into a strongly-typed Blob Storage event, you can use the Azure.Messaging.EventGrid library, which provides dedicated classes for Blob Storage events. Here's how you can do it:

1. First, ensure you have the necessary NuGet package:

   - Azure.Messaging.EventGrid

2. Then, you can modify your function to parse the event data:

```csharp
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.EventGrid;
using Microsoft.Extensions.Logging;
using Azure.Messaging.EventGrid;
using System.Text.Json;

public static class BlobCreatedFunction
{
    [FunctionName("BlobCreatedFunction")]
    public static void Run([EventGridTrigger]EventGridEvent eventGridEvent, ILogger log)
    {
        if (eventGridEvent.TryGetSystemEventData(out object eventData))
        {
            if (eventData is StorageBlobCreatedEventData blobCreatedData)
            {
                // Now you have strongly-typed access to the event data
                log.LogInformation($"Blob Created: {blobCreatedData.Url}");
                log.LogInformation($"Content Type: {blobCreatedData.ContentType}");
                log.LogInformation($"Content Length: {blobCreatedData.ContentLength}");

                // Your logic to handle the blob created event
            }
        }
        else
        {
            // If it's not a system event, you might need to parse it manually
            var jsonData = JsonSerializer.Deserialize<BlobCreatedEventData>(eventGridEvent.Data.ToString());
            // Process jsonData...
        }
    }
}

// Custom class for manual parsing if needed
public class BlobCreatedEventData
{
    public string Api { get; set; }
    public string ClientRequestId { get; set; }
    public string RequestId { get; set; }
    public string ETag { get; set; }
    public string ContentType { get; set; }
    public long ContentLength { get; set; }
    public string BlobType { get; set; }
    public string Url { get; set; }
    public string Sequencer { get; set; }
    public StorageDiagnostics StorageDiagnostics { get; set; }
}

public class StorageDiagnostics
{
    public string BatchId { get; set; }
}
```

This approach gives you several benefits:

1. It uses the `TryGetSystemEventData` method to attempt to parse the event into a system event type.

2. If successful, it checks if the event is specifically a `StorageBlobCreatedEventData`, which gives you strongly-typed access to all the properties of the event.

3. If for some reason the system event parsing fails, it falls back to manual JSON deserialization using a custom class.

4. The strongly-typed `StorageBlobCreatedEventData` class provides intellisense and compile-time type checking, reducing the chance of errors.

When working with other types of Blob Storage events, you can check for different event types:

- `StorageBlobDeletedEventData` for blob deletion events
- `StorageBlobRenamedEventData` for blob rename events

This approach gives you type-safe access to the event data, making your code more robust and easier to work with.

## Does Azure Event Grid have dead letter queue functionality if it is unable to successfully deliver an event?

Yes, Azure Event Grid does have dead-letter queue functionality. This feature is designed to handle events that couldn't be delivered to their intended endpoint after a certain number of retry attempts. Here's an overview of how it works:

1. Dead-Letter Queue Purpose:

   - It stores events that couldn't be delivered to the subscriber endpoint.
   - This prevents data loss for events that fail to be delivered.

2. How it works:

   - When an event can't be delivered, Event Grid retries delivery based on a backoff policy.
   - If all retries fail, the event can be sent to a dead-letter queue.

3. Configuration:

   - Dead-letter functionality is not enabled by default. You need to explicitly configure it.
   - You can set it up when creating or updating an event subscription.

4. Storage:

   - Dead-lettered events are stored in an Azure Blob Storage container.
   - You need to provide a Storage account and container when configuring dead-lettering.

5. Setting it up:

   - In the Azure Portal, when creating or editing an event subscription, you'll find the dead-letter settings under the "Additional Features" section.
   - You can also configure it using Azure CLI, PowerShell, or ARM templates.

6. Retry Policy:

   - You can customize the retry policy, including the number of attempts and the retry interval.

7. Monitoring and Processing:

   - You can monitor the dead-letter queue and process the events manually or automatically as needed.

8. Expiration:
   - Dead-lettered events have a default expiration time of 7 days, after which they are automatically deleted.

Here's a basic example of how you might configure dead-lettering using Azure CLI:

```bash
az eventgrid event-subscription create \
  --source-resource-id <resource_id> \
  --name <subscription_name> \
  --endpoint <endpoint_url> \
  --dead-letter-endpoint /subscriptions/<subscription_id>/resourceGroups/<resource_group>/providers/Microsoft.Storage/storageAccounts/<storage_account_name>/blobServices/default/containers/<container_name>
```

This feature is particularly useful for ensuring that no events are lost due to temporary network issues, endpoint downtime, or other transient failures. It allows you to investigate delivery failures and potentially reprocess events that couldn't be delivered initially.
