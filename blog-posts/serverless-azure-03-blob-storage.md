# Using Blob Storage

## Notes (to be deleted)

### Steps

- Store the requests in local storage and explore that storage

### Design

[Azure Blob Storage documentation](https://learn.microsoft.com/en-gb/azure/storage/blobs/)

[No Subscription Found after Successful Sign-In](https://github.com/microsoft/AzureStorageExplorer/issues/5777)
[Azure Storage Explorer not connecting to Free Account](https://learn.microsoft.com/en-us/answers/questions/1121467/azure-storage-explorer-not-connecting-to-free-acco#:~:text=Go%20to%20Accounts%20tab.%20Click%20on%20settings%20icon%20next%20to%20Default%20Directory.%20Click%20Un%2Dfilter)

### Questions

- Should we assign a unique id and return that as a custom header?

  - Yes

- Does the choice of 'folder' structure affect the event in any way?

  - Yes, see `BlobTrigger("samples-work-items/{name}", Connection = "AzureWebJobsStorage")]`

- How do I start Azurite?

  - <https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azurite?tabs=visual-studio%2Cblob-storage>

---

In the [previous post](TODO) in this [series on creating a webhook proxy](TODO), I added API Management in front of my Azure Function. In this post, I turn my attention to fleshing out the back-end functionality. In particular, storing data in Azure Blob Storage.

## A quick overview of Azure Blob Storage

[Blob Storage](TODO) is the Azure service that is equivalent to [AWS S3](TODO), in that it is used for storing large amounts of unstructured data, such as text or binary data.

Blob Storage is composed of the following resource hierarchy:

- **Storage Account**: The top-level resource, providing a globally-unique namespace in Azure for your storage data.
- **Container**: Provides a grouping of a set of blobs.
- **Blob**: The fundamental storage entity in Azure Blob Storage. There are three types of blobs:
  - **Block Blobs**: Used for storing text or binary files, like documents, media files, etc.
  - **Append Blobs**: Optimized for append operations, making them ideal for scenarios like logging.
  - **Page Blobs**: Designed for frequent read/write operations.

Access to blobs and containers is controlled through:

- **Access Keys**: Storage account keys that give full privileges to the storage account.
- **Shared Access Signatures (SAS)**: Provides restricted access rights to containers and blobs, with a defined start time, expiry time, and permissions.
- **Azure Active Directory (Azure AD)**: For RBAC (role-based access control) to manage and control access.

There are other aspects to Blob Storage, such as:

- **Access Tiers**: To store data based on the frequency of access, such as 'Hot', 'Cool', and 'Archive'.
- **Lifecycle Management**: Automating the process of moving blobs to cooler storage tiers or deleting old blobs that are no longer needed.
- **Security**: Options regarding encryption at rest and in transit.
- **Redundancy**: Options such as 'Locally Redundant Storage (LRS)', 'Zone-Redundant Storage (ZRS)', and 'Geo-Redundant Storage (GRS)'.

## Integrating with local Blob Storage (TODO: Rephrase)

Visual Studio 2022 ships with the [Azurite emulator](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azurite?tabs=visual-studio%2Cblob-storage) for local Azure Storage development, so I already had it installed. However, if you're running an earlier version of Visual Studio, you can install Azurite by using either Node Package Manager (npm), DockerHub, or by cloning the Azurite GitHub repository.

Another useful tool is the [Azure Storage Explorer](https://azure.microsoft.com/en-us/products/storage/storage-explorer/). This allows you to upload, download, and manage Azure Storage blobs, files, queues, and tables as well as configuring storage permissions and access controls, tiers, and rules.

One thing I did note was that to start the emulator, I needed to run the function app using F5. This started the Azurite background process, which then showed up in the storage explorer as follows:

![Storage Explorer showing emulated storage](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-04-blob-storage/010-storage-viewer-emulated.png?raw=true)

If I didn't do this, the storage explorer would tell me to install Azurite.

With the emulator up and running, the next step was to create some [containers](TODO) for the payloads. I had decided to split the payloads into two containers, one for payloads that had passed validation (`webhook-payloads-accepted`) and were accepted for further processing and another for payloads that were rejected (`webhook-payloads-rejected`).

![Storage Explorer showing containers in emulated storage](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-04-blob-storage/010-storage-viewer-emulated-containers.png?raw=true)

TODO

```csharp
private static string GetBlobName(
    string tenantId,
    string senderId,
    string contractId,
    string messageId)
{
    var blobName = $"{tenantId}/{senderId}/{contractId}/{DateTime.UtcNow:yyyy-MM-dd}/{messageId}.json";
    return blobName;
}
```

TODO: `BlobServiceClient` instantiation considerations.

```csharp
public BlobPayloadStore(ILoggerFactory loggerFactory)
{
    _logger = loggerFactory.CreateLogger<BlobPayloadStore>();
    _blobServiceClient = new BlobServiceClient("UseDevelopmentStorage=true");
}
```

In `Program.cs`:

```csharp
.ConfigureServices(services =>
{
    // <snip>
    services.AddSingleton<IPayloadStore, BlobPayloadStore>();
})
```

```csharp
private async Task UploadPayloadAsync<T>(
    string containerName,
    string tenantId,
    string senderId,
    string contractId,
    string messageId,
    T payload) where T : PayloadBase
{
    string payloadJsonString = JsonConvert.SerializeObject(payload, Formatting.Indented);

    var blobServiceClient = GetBlobServiceClient();
    var containerClient = blobServiceClient.GetBlobContainerClient(containerName);

    var blobName = GetBlobName(tenantId, senderId, contractId, messageId);

    var blobClient = containerClient.GetBlobClient(blobName);

    var byteArray = Encoding.UTF8.GetBytes(payloadJsonString);
    using var stream = new MemoryStream(byteArray);

    await blobClient.UploadAsync(stream, overwrite: true);
}
```
