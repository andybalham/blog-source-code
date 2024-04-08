# Learning Azure - The Project

Main ChatGPT chat: [Azure Functions with Bicep](https://chat.openai.com/share/98be1e01-55f9-4b1a-8768-7287bb9c499a)

## What do we want to build?

### Feature definition

A multi-tenant system for hosting webhook endpoints that isolate downstream target systems that may not always be responsive.

Overview

- The input is validated against an agreed schema
- If invalid, the content is stored with the errors, and a Bad Request response is returned
- If valid, the content is stored along with the target, and an appropriate 'accept' response is returned
- The storing of the content raises an event, which is handled to queue a request to deliver the content to the appropriate target
- The queued request is then picked up and an attempt is made to deliver to the target
- The request is retried until success with any failures are recorded on a dead letter queue for manual retrying

We also want users of the existing webhooks to be able to switch to the new service just by changing a URL.

## Skeleton architecture

- API Management -> Function App (Validate and Store) -> Blob Storage x2
- Blob Storage -> Event -> Function App (Queue) -> Service Bus
- Service Bus -> Function App (Deliver) -> Target API

The system will need to access configuration for:

- How to give the appropriate initial response
  - Use a pipeline as follows:
    - Extract the following from the HTTP request: ContractId, WebhookId, TenantId (TODO: Do we need CallerId? API key would identify)
    - Then a middleware for each contract
      - If not the ContractId then go to next
      - Load the schema and validate, if invalid store with errors, and return Bad Request
      - Return the appropriate 'Accept' response and shortcut
- How to queue a request to deliver the content
- How to resolve the appropriate URL and authorisation for the target

## Build order (ClickOps)

- Function App (Validate and Store)
- API Management -> Function App (Validate and Store)
- API Management -> Function App (Validate and Store) -> Blob Storage
- Blob Storage -> Event -> Function App (Queue)
- Blob Storage -> Event -> Function App (Queue) -> Service Bus
- Service Bus -> Function App (Deliver)
- Service Bus -> Function App (Deliver) -> Target API

## Function App (Validate and Store)

[Azure Functions documentation](https://learn.microsoft.com/en-us/azure/azure-functions/)

[Code and test Azure Functions locally](https://learn.microsoft.com/en-us/azure/azure-functions/functions-develop-local)

[Develop Azure Functions using Visual Studio](https://learn.microsoft.com/en-us/azure/azure-functions/functions-develop-vs?tabs=isolated-process)

[Azure Functions HTTP trigger](https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook-trigger?tabs=python-v2%2Cisolated-process%2Cnodejs-v4%2Cfunctionsv2&pivots=programming-language-csharp)

[How to use middleware with Azure Functions](https://www.re-mark-able.net/blogs/2021/05/09/azure-functions-middleware.html):

> **The considerations of using middleware**
>
> When using multiple middlewares it can become very confusing when and in what order everything is executed. That’s why I would recommend, that in the program.cs where your HostBuilder is, you document why one middleware should execute before the other.
>
> **The other downside is that the middleware is executed on every incoming call for the entire function app.** Every middleware needs to decide on its own if it is applicable for this incoming request. So quick if this then that checks are great to do but if you are going to query a database for information keep an eye on the performance.
>
> **The last con is that middleware in combination with Azure Functions does not have the ability to change the outgoing response or terminate the pipeline.** yet… There is an open issue at the time of writing here. As stated in the issue it will come but it will probably take some time. For now, let’s create a middleware for Azure Functions in .NET 5 and see what we can do.

In response to "From an Azure function, how can I identify the caller from the API key they are using?"

> To identify the caller of an Azure Function using their API key, you typically need to implement a mapping between API keys and their corresponding users or clients. This isn't a built-in feature of Azure Functions, so you'll need to manually manage this. The process generally involves:
>
> 1. **Storing a Mapping**: Maintain a database or configuration file that maps API keys to user/client identities.
> 2. **Retrieving the API Key**: Extract the API key from the incoming request. This is usually passed in headers or as a query parameter.
> 3. **Lookup**: Use the retrieved API key to look up the corresponding user/client in your mapping.
> 4. **Identity Verification**: Optionally, you can add additional verification or logging to ensure the validity and track usage of the API key.
>
> This process will require custom code within your Azure Function to handle the extraction and lookup operations. Be sure to secure your API keys and the mapping data, as this is sensitive information.

So, in practise, I think we would issue API keys and client secrets and use the client secret to verify that they are who they say they are. You could then rotate the API keys.

## Chats

**[Validate JSON with C#](https://chat.openai.com/share/51ed243b-4dbf-41b8-a300-5268731db00b)**

**[Webhook Buffering with Azure](https://chat.openai.com/share/9eb22cd8-b01f-4eb8-8806-2ce9ebae4a39)**

---

**[Building Azure Functions with Bicep](https://chat.openai.com/share/98be1e01-55f9-4b1a-8768-7287bb9c499a)**

**_I am an experienced developer, please explain step-by-step how to build an Azure Function and deploy it using a Bicep file._**

Below is a basic example of a Bicep file to deploy an Azure Function App. This script will create an Azure Function App along with the necessary resources like an App Service Plan and a Storage Account.

Please note that this is a simplified example. Depending on your specific requirements (like networking, application settings, etc.), you might need to add more details.

```bicep
param location string = 'eastus' // You can change the location as per your requirement
param functionAppName string = 'myFunctionApp${uniqueString(resourceGroup().id)}' // Unique Function App name
param storageAccountName string = 'st${uniqueString(resourceGroup().id)}' // Unique Storage Account name
param appServicePlanName string = 'myAppServicePlan'

// Create an App Service plan
resource appServicePlan 'Microsoft.Web/serverfarms@2021-02-01' = {
  name: appServicePlanName
  location: location
  kind: 'functionapp'
  sku: {
    name: 'Y1' // This is the consumption plan. Change the SKU as needed.
  }
}

// Create a Storage Account
resource storageAccount 'Microsoft.Storage/storageAccounts@2019-06-01' = {
  name: storageAccountName
  location: location
  kind: 'StorageV2'
  sku: {
    name: 'Standard_LRS' // This is the standard locally redundant storage. Change the SKU as needed.
  }
}

// Create the Function App
resource functionApp 'Microsoft.Web/sites@2021-02-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp'
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      appSettings: [
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'dotnet' // Change this depending on the runtime you are using
        }
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${listKeys(storageAccount.id, '2019-06-01').keys[0].value};EndpointSuffix=core.windows.net'
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${listKeys(storageAccount.id, '2019-06-01').keys[0].value};EndpointSuffix=core.windows.net'
        }
        {
          name: 'WEBSITE_CONTENTSHARE'
          value: toLower(functionAppName)
        }
      ]
    }
  }
}
```

### Instructions to Deploy This Bicep File

1. **Save this script** as a `.bicep` file (for example, `deploy-functionapp.bicep`).

2. **Open your terminal** or command prompt and navigate to the directory where the Bicep file is saved.

3. **Compile the Bicep file** into an ARM template using the command:

   ```bash
   az bicep build --file deploy-functionapp.bicep
   ```

   This will generate an ARM template in JSON format.

4. **Deploy the template** to Azure using the Azure CLI:

   ```bash
   az deployment group create --resource-group <YourResourceGroupName> --template-file deploy-functionapp.json
   ```

After deployment, you should have a new Function App, an App Service Plan, and a Storage Account in your Azure subscription. Remember to replace the placeholder values in the Bicep file with your specific configuration details. For a more complex setup, you would likely need to add additional resources and configurations to the Bicep file.

**_How does the code for the function app get deployed when using Bicep?_**

Deploying the code for your Azure Function App using Bicep involves two main stages:

1. **Infrastructure Provisioning**: This is where you use Bicep to define and deploy the necessary Azure infrastructure (like Function App, App Service Plan, Storage Account). The Bicep file does not handle the deployment of your function code. It only sets up the environment where your code will run.

2. **Code Deployment**: After the infrastructure is set up, you deploy your code to the Azure Function App. This step is separate from the Bicep deployment process.

Here’s how you can deploy your function app code after setting up the infrastructure with Bicep:

### Azure CLI

1. **Navigate to Your Function App Code**: Open a command line and navigate to the directory containing your Azure Function code.

2. **Publish Your Function**: Use the Azure Functions Core Tools to publish your function to the newly created Function App. The command looks like this:

   ```bash
   func azure functionapp publish <YourFunctionAppName>
   ```

   Replace `<YourFunctionAppName>` with the name of your Function App. This command packages your function code and dependencies and deploys them to your Azure Function App.

### Continuous Integration/Continuous Deployment (CI/CD)

Alternatively, you can set up a CI/CD pipeline (for example, using Azure DevOps, GitHub Actions, etc.) to automate the deployment of your function code whenever you make changes to your codebase. This approach is more scalable and consistent for ongoing development.

1. **Set Up a CI/CD Pipeline**: Configure a pipeline in your preferred CI/CD tool.
2. **Configure the Build and Deployment Tasks**: Ensure your pipeline builds your function project and deploys the built artifacts to the Azure Function App created by your Bicep deployment.
3. **Trigger Deployment**: Committing or merging code to your main branch can automatically trigger the pipeline, deploying the latest version of your code to Azure.

### Additional Notes

- Ensure that the Azure Function App name used in the Bicep template matches the name you use when publishing your function.
- Your Azure Function code needs to be prepared and tested locally before deploying it to Azure.
- If you have specific configuration settings or connection strings, ensure they are properly set in the Azure Function App settings either manually via the Azure Portal or through your CI/CD pipeline.

Deploying the code is a crucial step that follows the infrastructure provisioning with Bicep, and it's important to ensure that both steps are aligned for your Azure Function App to work correctly.

---

## Overview of Blob Storage

Certainly! Azure Blob Storage is a service from Microsoft Azure for storing large amounts of unstructured data, such as text or binary data, that can be accessed from anywhere in the world via HTTP or HTTPS. Below are some of the basic concepts related to Azure Blob Storage:

### 1. Storage Account

A Storage Account is the top-level resource in Azure Storage, providing a unique namespace in Azure for your storage data. Each storage account can contain an unlimited number of containers, and a storage account's name must be globally unique.

### 2. Containers

Containers in Azure Blob Storage are similar to directories in a file system. A container provides a grouping of a set of blobs, and all blobs must be in a container. An account can contain an unlimited number of containers, and a container can store an unlimited number of blobs.

### 3. Blobs

Blob (Binary Large Object) is the fundamental storage entity in Azure Blob Storage. There are three types of blobs:

- **Block Blobs**: Used for storing text or binary files, like documents, media files, etc. They are made up of blocks of data that can be managed individually.
- **Append Blobs**: Optimized for append operations, making them ideal for scenarios like logging.
- **Page Blobs**: Designed for frequent read/write operations. They are used primarily as the backing storage for Azure Virtual Machines (VMs).

### 4. Access Control

Access to blobs and containers is controlled through:

- **Access Keys**: Storage account keys that give full privileges to the storage account.
- **Shared Access Signatures (SAS)**: Provides restricted access rights to containers and blobs, with a defined start time, expiry time, and permissions.
- **Azure Active Directory (Azure AD)**: For RBAC (role-based access control) to manage and control access.

### 5. Access Tiers

Azure Blob Storage offers different access tiers to store data based on the frequency of access:

- **Hot Access Tier**: For data that is accessed frequently. This tier has higher storage costs but lower access and transaction costs.
- **Cool Access Tier**: For data that is infrequently accessed. It has lower storage costs but higher access and transaction costs.
- **Archive Access Tier**: For data that is rarely accessed and stored for at least 180 days. It has the lowest storage cost but higher costs for retrieval.

### 6. Blob Lifecycle Management

You can automate the process of moving blobs to cooler storage tiers or deleting old blobs that are no longer needed using Azure Blob Storage lifecycle management policies.

### 7. Security

Azure Blob Storage provides security mechanisms like:

- **Encryption at Rest**: Azure Storage encrypts your data as it is stored.
- **Encryption in Transit**: Data can be encrypted while it is being transmitted to and from Azure Blob Storage.

### 8. Redundancy

Azure offers several options for storing copies of your data:

- **Locally Redundant Storage (LRS)**: Keeps multiple copies of your data in one datacenter.
- **Zone-Redundant Storage (ZRS)**: Spreads your data across multiple datacenters in a region.
- **Geo-Redundant Storage (GRS)**: Replicates your data to a secondary region (hundreds of miles away).

### Summary

Azure Blob Storage is a powerful and versatile cloud storage service suitable for a wide range of scenarios, from storing backup data and logs to serving images or documents directly to a browser. Its scalability, security, and high availability make it an ideal choice for businesses and developers looking for a cloud storage solution.

---

In Azure Blob Storage, the concept of folders is a bit different from what you might be used to in a traditional file system. Azure Blob Storage is essentially a flat namespace, which means it doesn't have real directories or folders. However, it does support a folder-like structure using naming conventions and delimiters, typically the forward slash (`/`), within blob names.

### How "Folders" Work in Blob Containers

- **Blob Naming Convention**: You can create a virtual hierarchy in your blob names using delimiters like `/`. For example, a blob named `images/products/shoe.jpg` suggests a structure where `images` and `products` mimic folders.
- **Listing Blobs with a Prefix**: When you list blobs, you can specify a prefix and delimiter. For instance, if you list blobs in a container with the prefix `images/products/` and use `/` as a delimiter, you'll get blobs that are in the virtual "folder" `images/products/`.
- **Navigation**: Client tools that interact with Blob Storage, like Azure Storage Explorer or the Azure Portal, display these hierarchies as folders for easy navigation, even though they are just prefixes in the blob names.

### Practical Implications

- **Flat Structure**: Underneath, all blobs are stored in a flat structure. The folder-like hierarchy is a logical view, not a physical structure.
- **Performance**: There is no performance difference between storing blobs in a deep hierarchy versus storing them at the root of the container. The hierarchy is purely a naming convention.

- **Operations on Folders**: Since folders don't exist as physical entities, operations like renaming or deleting a folder require iterating over all blobs with the folder prefix and performing the operation on each blob.

- **Shared Access Signatures (SAS)**: You can create SAS tokens that grant access to all blobs in a virtual folder by specifying the folder path as a prefix.

### Example

If you have a blob named `documents/reports/2021/financial-report.pdf`, the structure implies that:

- `documents`, `reports`, and `2021` mimic folder names.
- `financial-report.pdf` is the actual blob name.
- There are no physical folders, but the path provides a way to organize and access blobs in a hierarchical manner.

### Conclusion

While Azure Blob Storage doesn't have physical folders, it supports a folder-like organizational structure through naming conventions. This approach allows for flexible and scalable data organization within blob containers, suitable for diverse storage scenarios in cloud environments.

---

## Unit testing by mocking the Azure SDK

- The following would be interesting to discuss. Is it worth mocking the SDK if you use ports and adaptors?
  - [Unit testing and mocking with the Azure SDK for .NET](https://learn.microsoft.com/en-us/dotnet/azure/sdk/unit-testing-mocking?tabs=csharp)

## First Azure Function post - DONE

Points

- Local development experience. I.e., F5 to run vs. Lambda function deployment
  - [Create your first C# function in Azure using Visual Studio](https://learn.microsoft.com/en-us/azure/azure-functions/functions-create-your-first-function-visual-studio)
- Old vs New (Isolated worker process)
  - [Guide for running C# Azure Functions in an isolated worker process](https://learn.microsoft.com/en-us/azure/azure-functions/dotnet-isolated-process-guide?tabs=windows)
  - [Differences between the isolated worker model and the in-process model for .NET on Azure Functions](https://learn.microsoft.com/en-us/azure/azure-functions/dotnet-isolated-in-process-differences)
- Logging (TODO: how to get debug locally)
- Remote debugging (TODO: get working)
  - [How to remote debug an HTTP trigger Azure Functions in Visual Studio 2022](https://turbo360.com/blog/remote-debugging-azure-functions-in-visual-studio-2022)
- Unit testing (TODO)
  - [Unit test an Azure Function](https://learn.microsoft.com/en-us/training/modules/develop-test-deploy-azure-functions-with-visual-studio/6-unit-test-azure-functions))
  - [Unit testing and mocking with the Azure SDK for .NET](https://learn.microsoft.com/en-us/dotnet/azure/sdk/unit-testing-mocking?tabs=csharp)

## Purpose of `.pubxml` File

The `.pubxml` file, short for "Publish XML", is a file used in Visual Studio as part of the Web Publishing Pipeline (WPP). It contains settings and configurations for deploying a web application, such as an ASP.NET app, to various destinations like IIS, Azure, or other hosting providers. Here's an overview of its purpose and why it is often best not to check it into source control:

1. **Deployment Configuration**: The `.pubxml` file holds specific settings for deploying your application, like connection strings, deployment methods (Web Deploy, FTP, etc.), and target URLs.

2. **Environment-Specific Settings**: It can contain environment-specific details, such as different settings for development, staging, and production environments.

3. **Custom Publishing Steps**: You can define custom actions in the `.pubxml` file to run during the publishing process, like database script execution or file transformations.

### Reasons Not to Check `.pubxml` into Source Control

1. **Sensitive Information**: The `.pubxml` file can contain sensitive information like usernames, passwords, and connection strings. Checking this file into source control, especially public repositories, can expose sensitive data.

2. **Environment Differences**: Each developer or environment (development, staging, production) might require different deployment settings. Checking in `.pubxml` files can lead to conflicts and inconsistencies among team members or deployment environments.

3. **Personalization**: Developers often have personalized settings that are not relevant or suitable for other team members. These personal preferences should not be imposed on the entire team.

4. **Security Best Practices**: It's a security best practice to keep deployment settings, particularly for production, out of source control. Deployment configurations should be managed securely and separately from the codebase.

#### Best Practices

- **Use `.pubxml.user` for Personal Settings**: For personal or user-specific settings, you should use the `.pubxml.user` file, which is meant to be user-specific and is not checked into source control by default.

- **Environment Variables and Secrets Management**: Instead of hardcoding sensitive information in `.pubxml`, use environment variables or a secure secrets management system, especially for credentials and connection strings.

- **`.gitignore` or Similar**: Ensure your source control ignore file (like `.gitignore` for Git) includes `.pubxml` files to prevent accidental check-ins.

- **Parameterization**: For settings that vary between environments, consider using parameterization. Parameters can be set during deployment without storing environment-specific values in source control.

#### Conclusion

The `.pubxml` file plays an important role in configuring the deployment of web applications. However, due to the potential inclusion of sensitive data and personalized settings, it is generally best practice to exclude this file from source control and handle deployment configurations through more secure and collaborative means.
