# Adding API Management

This is the third post in my [series](TODO) where I explore the world of serverless Azure. I am doing this by building a webhook proxy application using only the serverless Azure services. In the first two posts, I built and deployed an Azure function that receives the webhooks and validates the request body against the corresponding schema. In this post, I look at using [Azure API Management (APIM)](TODO) in front of that function.

## Why use API Management?

As we saw in the [previous post](TODO), the Azure function is accessible from the public internet provided you know the appropriate API key. So why would you need a service such as API Management? A few reasons are listed below.

- Rate limiting, ensuring fair usage among consumers
- Subscription-level control, such as key rotation
- Advanced security, such as OAuth 2.0

API Management has many more features that we won't explore in this post, but include the following:

- Centralized management of APIs
- Customizable API facades
- API Documentation and Developer Portals
- API Analytics and Insights
- Caching Mechanisms
- Versioning and Revision Control

I find so much in software design is down to positioning. By using a service such as API Management, we will position ourselves to provide production-level API.

## Are there any alternatives?

As with other cloud providers, Azure offers services that somewhat overlap in what they offer. In this case, ChatGPT was able to offer the following options amongst some others:

### Azure Application Gateway with Web Application Firewall (WAF)

**Use Case**: If you're primarily looking for API gateway capabilities with security features like a Web Application Firewall, SSL termination, and URL-based routing.

- **Why Use Over APIM**: Offers Layer 7 load balancing with built-in WAF for security-focused scenarios, especially where protection against common web vulnerabilities and exploits is a priority.

### Azure Functions Proxies

**Use Case**: For lightweight API orchestration or when you need a simple facade in front of multiple Azure Functions.

- **Why Use Over APIM**: It's a simple solution to create a single API surface for multiple microservices, particularly when these services are implemented using Azure Functions. However, it's less feature-rich compared to APIM.

### Azure Front Door

**Use Case**: For global routing and load balancing needs, offering capabilities like URL-based routing, SSL termination, and global load balancing.

- **Why Use Over APIM**: It is more focused on content delivery, global routing, and ensuring high availability and performance for your web applications and APIs.

Given the API-focused nature of the application I am building, and the cost, API Management seems to be a good fit.

## Creating the API Management instance

Using the [Expose serverless APIs from HTTP endpoints using Azure API Management](https://learn.microsoft.com/en-gb/azure/azure-functions/functions-openapi-definition) article as a guide, I opened up the Azure portal and navigated to my function app and selected the API Management blade.

![Function App API Management blade](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-03-adding-api-management/01-azure-portal-function-app-api-management.png?raw=true)

This brought up the following option to create a new API Management instance.

![Azure portal create API Management](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-03-adding-api-management/02-azure-portal-function-app-create-new-apim.png?raw=true)

Clicking on 'Create new' brought up the following UI. The Region and Resource name were defaulted and I filled in the other details. To save money, I chose the 'Developer' pricing tier noting that there is no Service Level Agreement (SLA) for this tier.

![Azure portal API Management basics](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-03-adding-api-management/03-azure-portal-function-create-apim-basics.png?raw=true)

The next step gave the option to link the new instance with Application Insights and utilise 'Defender for Could' (sic). I enabled the former, but there wasn't an option to enable the latter. This may have been due to using the cheapest tier.

![Azure portal API Management monitor and secure](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-03-adding-api-management/04-azure-portal-function-create-apim-monitor-and-secure.png?raw=true)

The final step was to choose the network connectivity. As this is to be a public endpoint, I chose 'None'.

![Azure portal API Management network connectivity](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-03-adding-api-management/05-azure-portal-function-create-apim-virtual-network.png?raw=true)

After clicking 'Create' and waiting a while, the new API Management instance was ready to be connected to the function and expose the API.

## Exposing the Azure function as an API

Now when I selected the API Management blade from the function app, it reported that it was now linked with the new instance. However, it had not imported anything automatically and presented me with the option to create a new API.

![API Management UI to add an API](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-03-adding-api-management/06-apim-create-new-api.png?raw=true)

There was nothing promising in the API dropdown, so I selected 'Create New' and clicked on 'Link API'. I was then presented with the following list of Azure Functions.

![API Management UI listing Azure Functions](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-03-adding-api-management/07-apim-select-azure-function.png?raw=true)

Now this was looking more promising. The wizard appears to have recognised my Azure Function. I selected it and tried to progress. However, rather confusingly, I was then prompted to 'Define a new API' by selecting from a list of potential sources. This wasn't what I was expecting, but I selected 'Function App' and clicked to progress.

![API Management UI asking to Define a new API](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-03-adding-api-management/08-apim-define-a-new-api.png?raw=true)

When I was presented with the next screen, I felt that I had somewhat gone round in a circle. It looked very similar to one earlier when my Azure Function was listed. However, I decided to click 'Select' and continue.

![API Management showing Import Azure Functions](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-03-adding-api-management/09-apim-import-azure-functions.png?raw=true)

I was then presented with a list of Function Apps from which to import functions. I selected my Function App and clicked to progress.

![API Management showing Select Azure Function App](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-03-adding-api-management/10-apim-select-azure-function-app.png?raw=true)

The next step defaulted in a set of values, which all seemed reasonable to me. So I simply clicked 'Create'.

![API Management showing Create from Function App](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-03-adding-api-management/11-apim-create-from-function-app.png?raw=true)

Once the creation was complete, I was able to view the 'Design' page for the new API and see the integration with the Azure Function in the backend. I could see how the process had recognised the request parameters and I also noticed the 'Inbound processing' box mentioned modifying the request. Also in the 'Inbound processing' box was the option to add policies. These, it turns out, are where you can do things such as filtering by IP address or rate limiting by key.

![API Management showing design of the API integration](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-03-adding-api-management/12-apim-design-ui.png?raw=true)

My eye was also caught by the 'Test' tab, so I clicked on it and gave it a go.

![API Management showing the test UI](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-03-adding-api-management/13-apim-test-ui-input.png?raw=true)

![TODO](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-03-adding-api-management/14-apim-test-ui-results.png?raw=true)


[Authorization](https://learn.microsoft.com/en-us/azure/api-management/import-function-app-as-api#authorization)

Import of an Azure Function App automatically generates:

- Host key inside the Function App with the name apim-{your Azure API Management service instance name},
- Named value inside the Azure API Management instance with the name {your Azure Function App instance name}-key, which contains the created host key.

![TODO](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-03-adding-api-management/11a-function-app-apim-app-key.png?raw=true)
![TODO](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-03-adding-api-management/11b-apim-function-app-key-named-value.png?raw=true)

## TODO: Specific subscription

![TODO](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-03-adding-api-management/15-apim-rest-client-data.png?raw=true)
![TODO](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-03-adding-api-management/16-apim-subscription-list.png?raw=true)
![TODO](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-03-adding-api-management/17-apim-subscription-warning.png?raw=true)
![TODO](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-03-adding-api-management/17a-apim-create-new-subscription.png?raw=true)
![TODO](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-03-adding-api-management/17b-apim-new-subscription-list.png?raw=true)

## TODO: Disabling public access to the function

![TODO](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-03-adding-api-management/18-function-app-disable-public-access.png?raw=true)
![TODO](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-03-adding-api-management/19-function-app-enable-selected-access.png?raw=true)
![TODO](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-03-adding-api-management/20-function-app-add-service-tag-rule.png?raw=true)
![TODO](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/serverless-azure-03-adding-api-management/21-function-app-rule-list.png?raw=true)

## Links

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
