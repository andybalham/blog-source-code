# Using Microsoft.OpenApiReader to create a dynamic Rest API client

In my [previous post](https://www.10printiamcool.com/validating-json-requests-using-c-and-openapiswagger), I discovered the [Microsoft.OpenApi](https://github.com/microsoft/OpenAPI.NET) packages and used them to extract JSON schemas from an Open API document.

At the end of that post, I pondered if it would be possible to build on my experience to create a client that could be used as follows.

```csharp
var petStoreClient =
    await OpenApiClient.CreateAsync(
        File.ReadAllText("petstore.swagger.json"), "https://petstore.swagger.io");

var getPetByIdResponse =
    await petStoreClient.PerformAsync("getPetById", [("petId", "0")]);
```

Now, there are many good options for creating static clients. According to [Claude.ai](https://claude.ai), these include:

1. Swagger Codegen

   - An open-source tool that can generate client SDKs in various languages, including C#.

2. OpenAPI Generator

   - A fork of Swagger Codegen with additional features and improvements.

3. NSwag

   - A .NET/TypeScript toolchain for OpenAPI.

4. Kiota

   - Microsoft's latest API client generator, designed to be lightweight and adaptable.

5. SwaggerHub

   - Offers code generation capabilities, including C# clients.

Claude.ai also reminded me that Visual Studio Connected Services is built into Visual Studio, and it can generate C# clients from OpenAPI specifications.

Although I would probably go down the static route for a production system, I was still intrigued by the idea of having a single class that I could configure dynamically configure with just the OpenAPI document. Given this I decided to press on.

## How did I get on?

In short, I succeeded. The result is the `OpenApiClientV2` class that can be found in GitHub [here](https://github.com/andybalham/blog-source-code/blob/master/OpenApiDynamicClient/OpenApiDynamicClient/OpenApiClientV2.cs).

Example usage can be seen below:

```csharp
var petStoreClient =
    await OpenApiClientV2.CreateAsync(
        File.ReadAllText("petstore.swagger.json"),
        new Uri("https://petstore.swagger.io"));

var getPetByIdResponse =
    await petStoreClient.PerformAsync("getPetById", [("petId", "2")]);

if (getPetByIdResponse.IsSuccessful)
    Console.WriteLine(getPetByIdResponse.Payload);
```

In addition to using [NJsonSchema](https://github.com/RicoSuter/NJsonSchema) to validate the request bodies, I used the popular [RestSharp](https://restsharp.dev/) package to make the HTTP calls. The main routine panned out as follows.

```csharp
private async Task<JsonResponse> PerformClientOperationAsync(
    ClientOperation clientOperation,
    IEnumerable<(string, string)> parameters)
{
    var restRequest =
        new RestRequest(
            clientOperation.Path, GetMethod(clientOperation.OperationType));

    var parameterErrors = new List<string>();

    SetNonBodyParameters(clientOperation, parameters, restRequest, parameterErrors);

    SetBodyParameter(clientOperation, parameters, restRequest, parameterErrors);

    if (parameterErrors.Count > 0)
    {
        return GetJsonResponse(parameterErrors);
    }

    var restResponse = await _restClient.ExecuteAsync(restRequest);

    var jsonResponse = GetJsonResponse(clientOperation, restResponse);

    return jsonResponse;
}
```

By the time this method is called, the OpenAPI document had been pre-processed. In the factory method, the OpenAPI document is read, checked for errors, then turned into a dictionary of `ClientOperation` instances. The `ClientOperation` class encapsulates the details for a particular operation, as defined in the OpenAPI document.

```csharp
public static async Task<OpenApiClientV2> CreateAsync(string openApiJson, Uri domainUri)
{
    using var openApiJsonStream =
        new MemoryStream(Encoding.UTF8.GetBytes(openApiJson));

    var openApiDocument =
        new OpenApiStreamReader().Read(openApiJsonStream, out var openApiDiagnostic);

    AssertNoOpenApiErrors(openApiDiagnostic);

    var clientOperations = await BuildClientOperationsAsync(openApiDocument);

    return new OpenApiClientV2(clientOperations, baseUri);
}
```

This processing allows an efficient use of the operation details to validate the body and non-body parameters. For example, the JSON schemas for request bodies are generated at the point, to be reused as long as the client instance is held.

The `RestSharp` package greatly simplified the client development. In particular, the `AddUrlSegment` method allowed me to set the request parameters without having to worry about any string parsing or encoding.

```csharp
private static void AddPathParameter(
    OpenApiParameter openApiParameter,
    IEnumerable<string> parameterValues,
    RestRequest restRequest,
    List<string> parameterErrors)
{
    if (parameterValues.Count() > 1)
    {
        parameterErrors.Add(
            $"{openApiParameter.Name} path parameter has multiple values");
        return;
    }

    restRequest.AddUrlSegment(openApiParameter.Name, parameterValues.First());
}
```

It was a similar situation for the other types of parameters. I could write my code without worrying about encodings, so keeping it nice and clean.

```csharp
restRequest.AddQueryParameter(openApiParameter.Name, parameterValue);
restRequest.AddHeader(openApiParameter.Name, parameterValues.First());
```

I do confess to only going so far with validating the non-body parameters. My code does check string lengths and apply the supplied regular expression, if available. However, I did not implement numerical limit checks or support for mixed types as mentioned in the [Swagger data types specification](https://swagger.io/docs/specification/data-models/data-types/).

I also left placeholders for extension points. These would allow customisation of the headers supplied for each call. The idea being that this would allow the appropriate authorisation headers to be set for each call.

One thing that did become apparent during development, was that the `OpenApiDocument` implementation does not contain all possible OpenAPI properties. For example, the `basePath` property is specified in the Petstore example:

![Swagger definition with baseUrl highlighted](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/openapi-posts/swagger-with-baseurl-highlighted.png?raw=true)

However, when inspecting the `OpenApiDocument` instance, it was nowhere to be seen:

![Quick Watch showing no baseUrl in OpenApiDocument](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/openapi-posts/quick-watch-showing-no-baseurl-in-openapi-document.png?raw=true)

As a result, I had to add a `SelectBasePath` method that parsed the OpenAPI document JSON and extracted the value.

```csharp
public static async Task<OpenApiClientV2> CreateAsync(string openApiJson, Uri domainUri)
{
    // <snip>

    var basePath = SelectBasePath(openApiJson); // basePath not in OpenApiDocument
    var baseUri = new Uri(domainUri, basePath);

    return new OpenApiClientV2(clientOperations, baseUri);
}
```

This wasn't a big deal, but is something to be aware of if you are using `OpenApiDocument`. Another example is `collectionFormat`, which specifies how a collection of parameters is packaged.

Overall, I was quite pleased with the final result and felt it had quite a bit of promise.

## Comparing with a statically-generated client

I thought it would be interesting to compare my dynamic client with a statically-generated client. To do this, I thought I would use the built in functionality in Visual Studio.

This is done by right-clicking on a project and adding a connected service.

![Adding a connected service in Visual Studio](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/openapi-posts/adding-a-connected-service.png?raw=true)

The next step is to select the type of connected service. This will depending on the type of your Visual Studio project. I was working with a .NET Framework project, so I only got the option for OpenAPI.

![Connected service list](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/openapi-posts/connected-service-list.png?raw=true)

For .NET Core projects, I believe you get the option of [gRPC](https://grpc.io/) and perhaps others.

Adding an OpenAPI service is as simple as pointing the wizard to the OpenAPI document and providing the namespace, class name, and language of your choice.

![Adding a new OpenAPI service](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/openapi-posts/adding-a-new-openapi-service.png?raw=true)

After the wizard runs, we see a single `.cs` file containing multiple classes for the API client, the API models, and other sundries.

![Generated petstore classes](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/openapi-posts/generated-petstore-classes.png?raw=true)

The wizard adds a number of NuGet packages, but still doesn't compile. For some reason, it fails to add the `System.ComponentModel.DataAnnotations` package.

![Data annotations missing](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/openapi-posts/data-annotations-missing.png?raw=true)

Adding this package was all that was required to get the code compiling and ready for use, an example of which is shown below.

```csharp
HttpClient httpClient = new();

PetstoreClient petstoreClient = new(httpClient);

Pet getPetByIdResponse = await petstoreClient.GetPetByIdAsync(2);
```

I am generally a fan of strong-typing, so this usage does appeal to me.

## Comparing and contrasting the two approaches

### Success Flag vs Exceptions

The dynamic client catches all failures and returns an envelope class with a `IsSuccessful` flag. This includes all parameter validation errors, non-success HTTP status codes, and any exceptions. This provides consistency for the calling code, making the code cleaner.

Depending of the failure mode, the static client throws a variety of exceptions. For example, if you supply an invalid request body then you get a `JsonSerializationException` thrown. If the domain is incorrect, you get a `WebException`, and if you get a non-success HTTP status code then an `ApiException` is thrown. There may be others that I did not find. This does mean that the calling code has to be aware of all of these, if it wants to make the most of them when handling them.

I do like consistency, so here I favoured the approach taken by my dynamic client.

### Runtime checking vs compile-time parameter checking

One clear difference between the two approaches is in the type checking. The dynamic client fits the scenario I had, where the calling code was generating JSON. However, in general, I would favour leaning on the compiler to verify types wherever I can. With this in mind, as a user, I would prefer the static client.

### Code ownership

It was interesting to have a look at the generated code. Below is a snippet from one of the implemented operations. As you can see, there is quite a bit of code and this is largely repeated in each method.

![Snippet of auto-generated client code](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/openapi-posts/snippet-of-auto-generated-client-code.png?raw=true)

I have underlined in green the handling of non-success HTTP status codes, which - as mentioned above - results in `ApiException` instances being thrown.

I have also underlined, this time in red, some of the extension points that are available to you. The client is generated as a [partial class](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/partial-classes-and-methods). This allows you to create your own partial class to provides your own custom implementations for these methods. This allows the generated client class to be regenerated at any time and also avoids using inheritance to provide the extension points.

What struck me about the generate code, was that there was quite a bit of it, and I would have to own it all if it was part of my project. I am not sure whether I would be overly comfortable with that. On the other hand, the dynamic client has much less code. Once the single class has been tested thoroughly, I would feel happier to use that rather than lots of generated code.

## Summary

The combination of the `Microsoft.OpenApi`, `NJsonSchema`, and `RestSharp` packages made is straightforward to implement my vision of a dynamic client that could be used against any REST endpoint with a supporting OpenAPI document. Using this client would provide a consistent way for a codebase to interact with these services.

The comparison with a static client highlighted that you have to own the generated code and its inconsistencies. In the case shown, the exception throwing. However, there is definitely advantages to having strong typing for compile-time checking. With this in mind, I wondered if I could make a hybrid client. Something that could use the automatically-generated models, but would use the dynamic client internally and would have a usage as follows:

```csharp
var client =
    await PetstoreHybridOpenApiClient.CreateAsync(
        new Uri("http://petstore.swagger.io"));

await client.AddPetAsync(new Pet { Name = "Luna" });

Pet pet = await client.GetPetByIdAsync(2999);

ICollection<Pet> pets = await client.FindPetsByStatusAsync([Anonymous.Sold]);
```

One for another post perhaps.