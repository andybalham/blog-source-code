# Using Blob Storage

## Notes (to be deleted)

### Steps

- Store the requests in local storage and explore that storage

### Design

Have two containers:

- ValidWebhookPayloads: `/{tenantId}/{senderId}/{contractId}/{yyyy-mm-dd}/{messageId}.json`
- InvalidWebhookPayloads: `/{tenantId}/{senderId}/{contractId}/{yyyy-mm-dd}/{messageId}.json`

We will return `messageId` as a custom header `10piac-message-id`.

We will log out a message to link the `messageId` to the location of the payload.

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

TODO: Storage Explorer showing emulated storage

If I didn't do this, the storage explorer would tell me to install Azurite.

TODO
