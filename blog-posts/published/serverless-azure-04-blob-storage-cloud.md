# Connecting to cloud Azure Blob Storage

- [Connecting to cloud Azure Blob Storage](#connecting-to-cloud-azure-blob-storage)
  - [Overview](#overview)
  - [Connection strings and account keys are evil](#connection-strings-and-account-keys-are-evil)
  - [Creating the storage account](#creating-the-storage-account)
  - [Creating and configuring the containers](#creating-and-configuring-the-containers)
  - [Managed identities](#managed-identities)
  - [Using token credentials to connect](#using-token-credentials-to-connect)
  - [A special mention for DefaultAzureCredential](#a-special-mention-for-defaultazurecredential)
  - [Using Log Stream for quick feedback](#using-log-stream-for-quick-feedback)
  - [Summary](#summary)
  - [Links](#links)

## Overview

In the previous [post](https://www.10printiamcool.com/using-local-blob-storage) in this [series](https://www.10printiamcool.com/series/azure-serverless) on creating a serverless webhook proxy, I used [Azurite](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azurite?tabs=visual-studio%2Cblob-storage) (local Blob Storage emulator) to develop the code that stores the requests received. This was very convenient, but avoided a number of concerns that we encounter when we want to use cloud-based resources. These concerns relate to access, security, and debugging amongst others.

## Connection strings and account keys are evil

'Evil' is perhaps a strong word, but both are risky as they can easily be leaked. I have seen too many credentials shared in plain text in emails or chats. There have also been too many stories of credentials being accidentally checked into source control. So, what is the best way to handle them? The answer is, not to have them in the first place.

I am familiar with the AWS serverless offerings, Lambda functions, DynamoDB, SQS, and so forth. In all these cases, I have never had to use a connection string or an account key. In AWS, every component needs to be granted access to the resources that it needs interact with. This is done through the AWS IAM (Identity and Access Management). This avoids the use of explicit credentials and the risk associated with them. It turns out that Azure is going the same way, but first we need to create our containers.

## Creating the storage account

In future, I want to deploy all the cloud resources via infrastructure as code (IaC) using [Bicep](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/). However, for the first pass I used click-ops and the Azure portal. From within my project resource group, I clicked to add a service and selected the 'Storage account' service from Microsoft.

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

Assigning a managed identity to a function app using the Azure portal was a simple task. I selected the function app and the 'Identity' blade. Then all that was required was to switch the status to 'On'.
![Assigning a managed identity to a function app in Azure portal](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-04-blob-storage/180-function-app-managed-identity.png?raw=true)

To grant access to the storage account, I needed to open the storage account and select the 'Access Control' blade. I then selected 'Add role assignment' from the 'Add' menu.

![Storage account access control in Azure portal](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-04-blob-storage/190-storage-account-access-control.png?raw=true)

The next step was to select the role that I wished to give my function app. I filtered the list to those with 'blob' in them and was given the list shown below. As the function app needs to write to the storage account, I chose 'Storage Blob Data Contributor' and to assign it to a managed identity.

![Adding a contributor to a storage account in Azure portal](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-04-blob-storage/195-storage-account-add-contributor.png?raw=true)

![Selecting members for storage account access in Azure portal](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-04-blob-storage/200-storage-account-select-members.png?raw=true)

The next step was to select my function app as a member of this role. The portal gives a dropdown list of managed identity types, so I selected 'Function App' and my function app from the resulting list.

![Selecting a function app as a member in Azure portal](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-04-blob-storage/210-storage-account-select-function-app.png?raw=true)

I then took the defaults and completed the wizard. The resulting list of role assignment confirmed that the function app identity now had access to the storage account.

![Storage account access control list in Azure portal](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-04-blob-storage/220-storage-account-access-control-list.png?raw=true)

Now all that was left was to update the code to use the managed identity to connect to the storage account.

## Using token credentials to connect

The current code was connecting to the local Azurite storage emulator using a hardcoded connection string. I wanted to keep this behaviour for local testing, but also wanted to be able to connect to cloud storage when running in the cloud.

I tried in vain to use the [`DefaultAzureCredential`](https://learn.microsoft.com/en-us/dotnet/api/azure.identity.defaultazurecredential?view=azure-dotnet) class to seamlessly change the access mechanism depending on environment. However, despite my best efforts, I was not able to get it to work. Instead, I decided to hide the logic behind a new `IBlobServiceClientFactory` interface implementation.

This simple interface had a single method for creating a `BlobServiceClient`.

```csharp
public interface IBlobServiceClientFactory
{
    BlobServiceClient CreateClient();
}
```

The implementation is also quite simple. It checks an environment variable to see if the code is being run in an environment with a storage emulator. If so, the hardcoded connection string is used. If not, then a storage URI and `ManagedIdentityCredential` instance are used.

```csharp
public class BlobServiceClientFactory : IBlobServiceClientFactory
{
    private readonly TokenCredential _tokenCredential;

    public BlobServiceClientFactory()
    {
        _tokenCredential = new ManagedIdentityCredential();
    }

    public BlobServiceClient CreateClient()
    {
        BlobServiceClient blobServiceClient;

        if (Environment.GetEnvironmentVariable(
            "AZURE_STORAGE_EMULATOR_RUNNING") == "true")
        {
            // Use connection string for Azurite
            string connectionString = "UseDevelopmentStorage=true";
            blobServiceClient = new BlobServiceClient(connectionString);
        }
        else
        {
            // Use TokenCredential for Azure Storage
            var webhookStorageAccount =
                Environment.GetEnvironmentVariable("WEBHOOK_STORAGE_ACCOUNT");
            var blobServiceUri =
                new Uri($"https://{webhookStorageAccount}.blob.core.windows.net");
            blobServiceClient =
                new BlobServiceClient(blobServiceUri, _tokenCredential);
        }

        return blobServiceClient;
    }
}
```

I then added this to the dependency injection configuration.

```csharp
.ConfigureServices(services =>
{
   // <snip>
   services.AddSingleton<IBlobServiceClientFactory, BlobServiceClientFactory>();
})
```

Finally, I updated the `BlobPayloadStore` to have an instance injected and to use this instance to create an appropriate client.

```csharp
private readonly BlobServiceClient _blobServiceClient;

public BlobPayloadStore(IBlobServiceClientFactory blobServiceClientFactory)
{
   _blobServiceClient = blobServiceClientFactory.CreateClient();
}
```

## A special mention for DefaultAzureCredential

As mentioned in the previous section. I tried to use the [`DefaultAzureCredential`](https://learn.microsoft.com/en-us/dotnet/azure/sdk/authentication/?tabs=command-line#defaultazurecredential) class. This was because the documentation states:

> The `DefaultAzureCredential` class provided by the Azure SDK allows apps to use different authentication methods depending on the environment they're run in. This allows apps to be promoted from local development to test environments to production without code changes. You configure the appropriate authentication method for each environment and `DefaultAzureCredential` will automatically detect and use that authentication method. The use of `DefaultAzureCredential` should be preferred over manually coding conditional logic or feature flags to use different authentication methods in different environments.

This sounded exactly what I was after, but I could not find a way to get it to connect to the local emulator or the cloud storage. In the end, I had to resort to my own logic and using the `ManagedIdentityCredential` class explicitly. I am quite happy with this choice, as this means my function app can **only** use managed identities, which is the intention.

However, you may have different intentions and so it is definitely worth consideration. For more details, see the following excellent blog post: [DefaultAzureCredentials Under the Hood](https://nestenius.se/2024/04/18/default-azure-credentials-under-the-hood)

## Using Log Stream for quick feedback

When developing and debugging my function in Azure, I found the Log Stream functionality in Azure very useful. As mentioned in an [earlier post](https://www.10printiamcool.com/deploying-and-debugging-my-first-azure-function), you can attach to functions running in Azure and debug them that way. However, I find judicious log statements can be almost as good.

As shown below, the Log Stream blade allows an almost real-time view of the log from your function. You can filter by level, copy the output, and jump into the raw logs if you really need to.

![Log Stream blade in Azure portal](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-04-blob-storage/230-azure-function-log-stream.png?raw=true)

## Summary

In this post, I managed (no pun intended) to achieve my desired objective of updating my Azure Function, so that it could access cloud Blob Storage without the use of connection strings or API keys. The way this was done was by assigning my Azure Function a managed identity and ensuring that identity had the appropriate role.

Now that we have data going into the Blob Storage, the next step is to react to the resulting events and take action based on them.

## Links

- [Authorize access and connect to Blob Storage](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-dotnet-get-started?tabs=account-key#authorize-access-and-connect-to-blob-storage)
- [Manage storage account access keys](https://learn.microsoft.com/en-us/azure/storage/common/storage-account-keys-manage?tabs=azure-portal)
- [Authorize access to data in Azure Storage](https://learn.microsoft.com/en-us/azure/storage/common/authorize-data-access)
- [How to authenticate .NET apps to Azure services using the .NET Azure SDK](https://learn.microsoft.com/en-us/dotnet/azure/sdk/authentication/?tabs=command-line)
- [Use the Azurite emulator for local Azure Storage development](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azurite?tabs=visual-studio%2Cblob-storage)
- [`DefaultAzureCredentials` Under the Hood](https://nestenius.se/2024/04/18/default-azure-credentials-under-the-hood)
- [Quickstart: Azure Blob Storage client library for .NET](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-quickstart-blobs-dotnet?tabs=visual-studio%2Cmanaged-identity%2Croles-azure-portal%2Csign-in-azure-cli%2Cidentity-visual-studio&pivots=blob-storage-quickstart-scratch)
