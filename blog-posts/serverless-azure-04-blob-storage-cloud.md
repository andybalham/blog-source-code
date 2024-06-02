# Connecting to cloud Azure Blob Storage

- [Connecting to cloud Azure Blob Storage](#connecting-to-cloud-azure-blob-storage)
  - [Notes (to be deleted)](#notes-to-be-deleted)
    - [Links](#links)
      - [Authorize access and connect to Blob Storage](#authorize-access-and-connect-to-blob-storage)
      - [Manage storage account access keys](#manage-storage-account-access-keys)
      - [Authorize access to data in Azure Storage](#authorize-access-to-data-in-azure-storage)
      - [How to authenticate .NET apps to Azure services using the .NET Azure SDK](#how-to-authenticate-net-apps-to-azure-services-using-the-net-azure-sdk)
      - [Use the Azurite emulator for local Azure Storage development](#use-the-azurite-emulator-for-local-azure-storage-development)
      - [Quickstart: Azure Blob Storage client library for .NET](#quickstart-azure-blob-storage-client-library-for-net)
      - [Step-by-Step Guide to Setting a Time to Live (TTL)](#step-by-step-guide-to-setting-a-time-to-live-ttl)
        - [Step-by-Step **Guide**](#step-by-step-guide)
        - [Example Configuration](#example-configuration)

## Notes (to be deleted)

There is a common thread through all the Microsoft articles, and that is don't use connection strings.

> Microsoft recommends using Microsoft Entra ID to authorize requests against blob, queue, and table data if possible, rather than using the account keys (Shared Key authorization).

Talk about:

- Using Log Stream as quick feedback from cloud-based testing
- Assigning managed identity and granting access
- How I needed to add myself to use my Entra identity
- Using default credential and issues with local emulator
- Storage needed to be 'Enabled from all networks'
- Time-to-live? If we can work out how.

Can we do any remocal testing? Would we have to end up using connection strings?

### Links

#### [Authorize access and connect to Blob Storage](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-dotnet-get-started?tabs=account-key#authorize-access-and-connect-to-blob-storage)

```csharp
public static void GetBlobServiceClient(ref BlobServiceClient blobServiceClient,
    string accountName, string accountKey)
{
    Azure.Storage.StorageSharedKeyCredential sharedKeyCredential =
        new StorageSharedKeyCredential(accountName, accountKey);

    string blobUri = "https://" + accountName + ".blob.core.windows.net";

    blobServiceClient = new BlobServiceClient
        (new Uri(blobUri), sharedKeyCredential);
}
```

```csharp
BlobServiceClient blobServiceClient = new BlobServiceClient(connectionString);
```

> **Important**
>
> The account access key should be used with caution. If your account access key is lost or accidentally placed in an insecure location, your service may become vulnerable. Anyone who has the access key is able to authorize requests against the storage account, and effectively has access to all the data. `DefaultAzureCredential` provides enhanced security features and benefits and is the recommended approach for managing authorization to Azure services.

#### [Manage storage account access keys](https://learn.microsoft.com/en-us/azure/storage/common/storage-account-keys-manage?tabs=azure-portal)

> Microsoft recommends that you use Azure Key Vault to manage your access keys, and that you regularly rotate and regenerate your keys. Using Azure Key Vault makes it easy to rotate your keys without interruption to your applications. You can also manually rotate your keys.

#### [Authorize access to data in Azure Storage](https://learn.microsoft.com/en-us/azure/storage/common/authorize-data-access)

#### [How to authenticate .NET apps to Azure services using the .NET Azure SDK](https://learn.microsoft.com/en-us/dotnet/azure/sdk/authentication/?tabs=command-line)

> It is recommended that apps use token-based authentication rather than connection strings when authenticating to Azure resources. The Azure SDK for .NET provides classes that support token-based authentication and allow apps to seamlessly authenticate to Azure resources whether the app is in local development, deployed to Azure, or deployed to an on-premises server.

#### [Use the Azurite emulator for local Azure Storage development](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azurite?tabs=visual-studio%2Cblob-storage)

**_TODO: THIS IS THE ONE TO LOOK AT!!!_**

> **DefaultAzureCredential**
>
> The `DefaultAzureCredential` class provided by the Azure SDK allows apps to use different authentication methods depending on the environment they're run in. This allows apps to be promoted from local development to test environments to production without code changes. You configure the appropriate authentication method for each environment and `DefaultAzureCredential` will automatically detect and use that authentication method. The use of `DefaultAzureCredential` should be preferred over manually coding conditional logic or feature flags to use different authentication methods in different environments.
>
> Details about using the `DefaultAzureCredential` class are covered later in this article in the section [Use `DefaultAzureCredential` in an application](https://learn.microsoft.com/en-us/dotnet/azure/sdk/authentication/?tabs=command-line#use-defaultazurecredential-in-an-application).

From: [Advantages of token-based authentication](https://learn.microsoft.com/en-us/dotnet/azure/sdk/authentication/?tabs=command-line#advantages-of-token-based-authentication)

> **Use of connection strings should be limited to initial proof of concept apps or development prototypes that don't access production or sensitive data.** Otherwise, the token-based authentication classes available in the Azure SDK should always be preferred when authenticating to Azure resources.

By chance, I came across this article: [DefaultAzureCredentials Under the Hood](https://nestenius.se/2024/04/18/default-azure-credentials-under-the-hood)

#### [Quickstart: Azure Blob Storage client library for .NET](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-quickstart-blobs-dotnet?tabs=visual-studio%2Cmanaged-identity%2Croles-azure-portal%2Csign-in-azure-cli%2Cidentity-visual-studio&pivots=blob-storage-quickstart-scratch)

#### Step-by-Step Guide to Setting a Time to Live (TTL)

Setting a Time to Live (TTL) for blobs within an Azure Blob Storage container is a great way to manage the lifecycle of your data automatically. In Azure Blob Storage, this can be achieved using **Blob Lifecycle Management** policies. Here's how you can configure a TTL for blobs within a container using the Azure Portal:

##### Step-by-Step **Guide**

1. **Sign in to the Azure Portal**:

   - Go to [https://portal.azure.com](https://portal.azure.com) and sign in with your Azure credentials.

2. **Navigate to Your Storage Account**:

   - In the left-hand menu, click on "Storage accounts" and then select the storage account that contains the blob container you want to manage.

3. **Access Lifecycle Management**:

   - In the storage account menu, scroll down to the "Data management" section and click on "Lifecycle management".

4. **Add a Rule**:

   - Click on the "Add rule" button to create a new lifecycle management rule.

5. **Configure the Rule**:

   - **Name your rule**: Enter a name for your lifecycle rule.
   - **Scope the rule**: Decide if the rule applies to all blobs or specific containers or blobs. You can specify a prefix to target specific blobs.
   - **Add a filter (optional)**: Add any filters if you want the rule to apply only to certain blobs based on tags or blob types.

6. **Define Actions**:

   - **Add an action**: Click on "Add" under "Lifecycle rule actions".
   - **Set Blob Age**: In the actions pane, select "Delete blobs" and specify the number of days after which the blob should be deleted. This effectively sets the TTL for the blobs.
     - For example, if you want blobs to be deleted 30 days after they are last modified, set the "Base blob delete" action and choose "More than 30 days since last modification".

7. **Review and Add**:

   - Review your settings and click "Add" to create the lifecycle management rule.

8. **Save**:
   - Finally, click "Save" to apply the lifecycle management policy to your storage account.

##### Example Configuration

Here’s an example configuration for setting a TTL of 30 days for all blobs within a specific container:

1. **Rule Name**: `DeleteBlobsAfter30Days`
2. **Scope**: Applies to a specific container, e.g., `my-container`.
3. **Filter**: No filters (applies to all blobs within the container).
4. **Actions**: Delete blobs that are older than 30 days since their last modification.

---
