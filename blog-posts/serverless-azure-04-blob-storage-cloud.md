# Connecting to cloud Azure Blob Storage

- [Connecting to cloud Azure Blob Storage](#connecting-to-cloud-azure-blob-storage)
  - [Overview](#overview)
  - [Connection strings and account keys are evil](#connection-strings-and-account-keys-are-evil)
  - [Creating the storage account](#creating-the-storage-account)
  - [Creating and configuring the containers](#creating-and-configuring-the-containers)
  - [Managed identities](#managed-identities)
  - [Using `DefaultAzureCredential`](#using-defaultazurecredential)
  - [Using Log Stream for quick feedback](#using-log-stream-for-quick-feedback)
  - [Summary](#summary)
  - [Links](#links)
  - [Notes (to be deleted)](#notes-to-be-deleted)
    - [Links](#links-1)
      - [Authorize access and connect to Blob Storage](#authorize-access-and-connect-to-blob-storage)
      - [Manage storage account access keys](#manage-storage-account-access-keys)
      - [Authorize access to data in Azure Storage](#authorize-access-to-data-in-azure-storage)
      - [How to authenticate .NET apps to Azure services using the .NET Azure SDK](#how-to-authenticate-net-apps-to-azure-services-using-the-net-azure-sdk)
      - [Use the Azurite emulator for local Azure Storage development](#use-the-azurite-emulator-for-local-azure-storage-development)
      - [Quickstart: Azure Blob Storage client library for .NET](#quickstart-azure-blob-storage-client-library-for-net)
      - [Step-by-Step Guide to Setting a Time to Live (TTL)](#step-by-step-guide-to-setting-a-time-to-live-ttl)
        - [Step-by-Step **Guide**](#step-by-step-guide)
      - [Chats](#chats)
        - [Example Configuration](#example-configuration)

## Overview

In the previous [post](TODO) in this [series](TODO) on creating a serverless webhook proxy, I used [Azurite](TODO) (local Blob Storage emulator) to develop the code that stores the requests received. This was very convenient, but avoided a number of concerns that we encounter when we want to use cloud-based resources. These concerns relate to access, security, and debugging amongst others.

## Connection strings and account keys are evil

'Evil' is perhaps a strong word, but both are risky as they can easily be leaked. I have seen too many credentials shared in plain text in emails or chats. There have also been too many stories of credentials being accidentally checked into source control. So, what is the best way to handle them? The answer is, not to have them in the first place.

I am familiar with the AWS serverless offerings, Lambda functions, DynamoDB, SQS, and so forth. In all these cases, I have never had to use a connection string or an account key. In AWS, every component needs to be granted access to the resources that it needs interact with. This is done through the AWS IAM (Identity and Access Management). This avoids the use of explicit credentials and the risk associated with them. It turns out that Azure is going the same way, but first we need to create our containers.

## Creating the storage account

In future, I want to deploy all the cloud resources via infrastructure as code (IaC) using [Bicep](TODO). However, for the first pass I used click-ops and the Azure portal. From within my project resource group, I clicked to add a service and selected the 'Storage account' service from Microsoft.

![Selecting storage account in Azure Portal](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-04-blob-storage/070-select-storage-account.png?raw=true)

Next, I specified the basic properties of the account. I provided the account name and changed the 'Redundancy' level to the cheapest option, but otherwise left the properties at their default values.

![Configuring storage account basics in Azure Portal](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-04-blob-storage/080-storage-account-basics.png?raw=true)

For the networking options, I left the access level at 'Enable public access from all networks'. I experimented with a more restrictive access level, as I wasn't comfortable with the public access. However, I was not able to access the account unless this level was selected. At this point in my journey, I did not want to start creating private networks. However, for a production system, this is the route I would go.

Here was a significant difference to my experience with AWS, where the default for S3 buckets is to prevent public access. You can then use AWS IAM to grant bucket access to the appropriate resources, such as Lambda functions, without having to create any private networking.

![Configuring storage account network in Azure Portal](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-04-blob-storage/090-storage-account-network.png?raw=true)

Although I had no intention of using them, I took a look at the 'Access keys' blade. Here, as you would expect, you can find the access keys and connection strings to access the account. You can also manually rotate the keys from this blade, which highlights another good reason to avoid using them.

![Viewing storage account access keys in Azure Portal](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-04-blob-storage/100-storage-account-access-keys.png?raw=true)

## Creating and configuring the containers

With the storage account in place, I clicked the option to add a container.

![Adding a Blob container in Azure Portal](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-04-blob-storage/110-storage-account-container-add.png?raw=true)

Then specified the name of the container and accepted the other defaults.

![Setting a Blob container details in Azure Portal](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-04-blob-storage/120-storage-account-container-details.png?raw=true)

I then repeated this for the other container that I needed. The resulting list showed the two containers that I had created and one that seemed to have been created by Azure (`$logs`).

![Blob container list in Azure Portal](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-04-blob-storage/130-storage-account-container-list.png?raw=true)

As these container are going to container personally identifiable information (PII), it is important not to hold on to the data for longer than is strictly necessary. This is where time-to-live (TTL) functionality comes in very handy. This functionality allows us to defer the responsibility of deleting old data to the cloud provider.

For Blob Storage, this is done by selecting 'Lifecycle management' blade, under 'Data management' in the Azure portal.

![Lifecycle management in Azure Portal](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-04-blob-storage/140-storage-account-lifecycle-management.png?raw=true)

The first step was to give the rule a name and specify the blobs to which the rule applies. In my case, I wanted to delete all request blobs after 30 days. So I selected the rule scope to filter the blobs to which the rule applies.

![Adding lifecycle rules in Azure Portal](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-04-blob-storage/150-storage-account-rule-add.png?raw=true)

The next section allowed me to specify an action to take and the condition under which to take it. In my case, I wanted to delete all blobs 30 days after creation.

![Specifying lifecycle conditions in Azure Portal](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-04-blob-storage/160-storage-account-rule-condition.png?raw=true)

The final step was to specify the filter set. In my case, I specified `webhook-payload-` to filter the rule to the request containers.

![Specifying lifecycle filters in Azure Portal](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-04-blob-storage/170-storage-account-rule-filter.png?raw=true)

Now I had my containers in place, with rules to keep them managed and, although there was public access via keys, I had no intention of using them. This is because I intended to use managed identities.

## Managed identities

The Microsoft Learn article [What are managed identities for Azure resources?](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview) give a good overview of what managed identities are.

> A common challenge for developers is the management of secrets, credentials, certificates, and keys used to secure communication between services. Managed identities eliminate the need for developers to manage these credentials.
>
> While developers can securely store the secrets in Azure Key Vault, services need a way to access Azure Key Vault. Managed identities provide an automatically managed identity in Microsoft Entra ID for applications to use when connecting to resources that support Microsoft Entra authentication. Applications can use managed identities to obtain Microsoft Entra tokens without having to manage any credentials.

It goes on to list some of echo some the benefits of using managed identities that I mentioned earlier.

> - You don't need to manage credentials. Credentials aren’t even accessible to you.
> - You can use managed identities to authenticate to any resource that supports Microsoft Entra authentication, including your own applications.
> - Managed identities can be used at no extra cost.

As I also mentioned, in AWS this is the default. In fact, it is the only option in order to access some services. It is good to see Azure following down this path.

The article goes on to mention that there are two types of managed identity, system-assigned and user-assigned. In my case, I want a system-managed identity for my Azure Function.

## Using `DefaultAzureCredential`

## Using Log Stream for quick feedback

## Summary

## Links

## Notes (to be deleted)

There is a common thread through all the Microsoft articles, and that is don't use connection strings.

> Microsoft recommends using Microsoft Entra ID to authorize requests against blob, queue, and table data if possible, rather than using the account keys (Shared Key authorization).

Talk about:

- Using Log Stream as quick feedback from cloud-based testing
- Assigning managed identity and granting access
- Using default credential and issues with local emulator

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

#### Chats

##### Example Configuration

Here’s an example configuration for setting a TTL of 30 days for all blobs within a specific container:

1. **Rule Name**: `DeleteBlobsAfter30Days`
2. **Scope**: Applies to a specific container, e.g., `my-container`.
3. **Filter**: No filters (applies to all blobs within the container).
4. **Actions**: Delete blobs that are older than 30 days since their last modification.

---
