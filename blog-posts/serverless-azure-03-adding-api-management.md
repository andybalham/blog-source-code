# Adding API Management

- [Expose serverless APIs from HTTP endpoints using Azure API Management](https://learn.microsoft.com/en-gb/azure/azure-functions/functions-openapi-definition)

  - [Create serverless APIs in Visual Studio using Azure Functions and API Management integration](https://learn.microsoft.com/en-gb/azure/azure-functions/openapi-apim-integrate-visual-studio)
  - The OpenAPI and API Management integration featured in this article is currently only supported for in-process C# class library functions. **Isolated worker process C# class library functions and all other language runtimes should instead use Azure API Management integration from the portal.**

- [What is Azure API Management?](https://learn.microsoft.com/en-us/azure/api-management/api-management-key-concepts)

- [Import an Azure Function App as an API in Azure API Management](https://learn.microsoft.com/en-us/azure/api-management/import-function-app-as-api)

- [Quickstart: Create a new Azure API Management instance by using the Azure portal](https://learn.microsoft.com/en-us/azure/api-management/get-started-create-service-instance)

  - [Quickstart: Create a new Azure API Management service instance using Bicep](https://learn.microsoft.com/en-us/azure/api-management/quickstart-bicep?tabs=CLI)

- [Observability in Azure API Management](https://learn.microsoft.com/en-us/azure/api-management/observability)

  - [How to integrate Azure API Management with Azure Application Insights](https://learn.microsoft.com/en-us/azure/api-management/api-management-howto-app-insights?tabs=rest)

- [Authentication and authorization to APIs in Azure API Management](https://learn.microsoft.com/en-us/azure/api-management/authentication-authorization-overview)

- [Enable advanced API security features using Microsoft Defender for Cloud](https://learn.microsoft.com/en-gb/azure/api-management/protect-with-defender-for-apis?WT.mc_id=Portal-Microsoft_Azure_ApiManagement)

## [Authorization](https://learn.microsoft.com/en-us/azure/api-management/import-function-app-as-api#authorization)

Import of an Azure Function App automatically generates:

- Host key inside the Function App with the name apim-{your Azure API Management service instance name},
- Named value inside the Azure API Management instance with the name {your Azure Function App instance name}-key, which contains the created host key.

## Integrating with an Azure Function that isn't publicly accessible

Yes, you can integrate Azure API Management (APIM) with an Azure Function that isn't publicly accessible. This is a common scenario for enhancing security and controlling access to your functions. The Azure Function can be secured and made accessible only through APIM, using several methods:

### Restricting Access to the Function App

You can restrict access to the Azure Function to only allow traffic from your API Management instance. This can be achieved in a couple of ways:

Using Azure Functions Networking Features: Configure your Azure Function to only accept traffic from a specific Virtual Network (VNet) and integrate your APIM instance with that VNet. This is known as VNet Integration.

**_??? IP Restriction: Restrict access to the Function App by setting IP-based firewall rules. Here, you would allow only the outbound IP addresses of the API Management service. These IP restrictions can be set in the Networking section of the Function App settings in the Azure portal. ???_**

### Function Keys

Azure Functions provides function keys that can be used to authorize requests. While function keys aren't a substitute for proper authentication mechanisms, they can add a layer of security:

**_??? Use Function Keys: Create a function key in your Azure Function and configure the APIM API to include this function key in the request headers when forwarding requests to the Azure Function. ???_**

### Managed Identity

**_TODO: Mention that this is the way to go, but not for me on a budget_**

If you're using Azure API Management (Premium tier), you can use a Managed Identity:

Managed Identity: Configure APIM to use a Managed Identity and grant this identity access to the Azure Function. This method is more secure and manageable than function keys.

### Using Azure Private Link

Azure Private Link provides private connectivity from a virtual network to Azure services, like Azure Functions. It simplifies the network architecture and secures the connection between endpoints in Azure:

Private Link for Azure Functions: Set up a Private Link for the Azure Function and then access it from API Management through VNet Integration.

### Azure API Management's Self-Hosted Gateway

Self-Hosted Gateways in APIM can be deployed inside the same VNet as your Azure Functions, enabling access to non-public functions:

Self-Hosted Gateway: Deploy a Self-Hosted Gateway in the same VNet as your Azure Function for secure internal access.

### Conclusion

Integrating Azure API Management with non-public Azure Functions enhances security and allows for the controlled exposure of your functions. Whether through network controls, authentication keys, Managed Identity, Private Link, or Self-Hosted Gateways, you can securely and efficiently manage the communication between API Management and Azure Functions.
