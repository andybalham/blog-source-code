# A hybrid experiment

TODO

I liked the strong typing that you get with the static clients, but I was not too keen on having to own the client code. So I wondered if I could make a hybrid client.

Something could use the automatically-generated models and would have a usage as follows:

```csharp
var client =
    await PetstoreHybridOpenApiClient.CreateAsync(
        new Uri("http://petstore.swagger.io"));

await client.AddPetAsync(new Pet { Name = "Luna" });

Pet pet = await client.GetPetByIdAsync(2999);

ICollection<Pet> pets = await client.FindPetsByStatusAsync([Anonymous.Sold]);
```

As a secondary challenge, I wanted to avoid inheritance and only use composition in my solution. Why? Just for the intellectual challenge and to see what the resulting solution looks and feels like.

## Links

- [Generating HTTP API clients using Visual Studio Connected Services](https://devblogs.microsoft.com/dotnet/generating-http-api-clients-using-visual-studio-connected-services/)

---

[microsoft / kiota](https://github.com/microsoft/kiota)

The key here is what is the interesting thing about developing the client?

- Is it exploring the OpenApiReader?
- Is it the process of creating something that works, then something that is neater?
- Is it how easy it is to use OpenAPI, `Microsoft.OpenApi`, `NJsonSchema`, and `RestSharp` to create a dynamic client?
  - I.e., create the best client we can and show how well they fit together.

I think it is the latter. We can point to the first iteration and refer back to [Software in 3 steps: Make it run, make it right, make it fast](https://www.10printiamcool.com/software-in-3-steps-make-it-run-make-it-right-make-it-fast).

![Swagger definition with baseUrl highlighted](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/openapi-posts/swagger-with-baseurl-highlighted.png?raw=true)

![Quick Watch showing no baseUrl in OpenApiDocument](https://github.com/andybalham/blog-source-code/blob/master/blog-posts/images/openapi-posts/quick-watch-showing-no-baseurl-in-openapi-document.png?raw=true)

Talk about how to invert the OpenApi document to index by `operationId` and not path.

Q: Does an Operation have a method?
A: No, so we need something like...

```csharp
class ClientOperation { // Name?
  public OpenApiOperation Operation { get; }
  public OperationType OperationType { get; }
  public string Path { get; }
  // Request schema?
  // Response schemas by response?
  // IsRequestBodyRequired?
}
```

## Chapter 1

Following the [Fred Brooks adage](https://en.wikiquote.org/wiki/Fred_Brooks) of 'plan to throw one away; you will, anyhow', I started by creating a rough and ready prototype which can be found [here](https://github.com/andybalham/blog-source-code/blob/master/OpenApiDynamicClient/OpenApiDynamicClient/OpenApiClientV1.cs).

What I noticed when developing this, was that an OpenAPI document is organised around paths and, within those paths, the methods that can be used.

```jsonc
{
  // ...
  "paths": {
    // ...
    "/pet/{petId}": {
      "get": {
        "operationId": "getPetById"
        // ...
      },
      "post": {
        /* ... */
      },
      "delete": {
        /* ... */
      }
    }
  }
}
```

However, my desired API is based around operations and not paths. As a result, the prototype code had to go back up and down the hierarchy to get the details required. This resulted in quite a bit of code like the following.

```csharp
var operationPath =
    _openApiDocument.Paths
        .FirstOrDefault(p =>
            p.Value.Operations.Any(o => o.Value.OperationId == operationId));

var operation =
    operationPath.Value.Operations
        .FirstOrDefault(o => o.Value.OperationId == operationId);
```

So, on the second time through I had the client pre-process the OpenAPI document and build a dictionary of operations.

```csharp
internal record ClientOperation
{
    public OpenApiOperation Operation { get; set; }
    public OperationType OperationType { get; set; }
    public string Path { get; set; }
    public bool RequestBodyRequired { get; set; }
    public JsonSchema RequestBodyJsonSchema { get; set; }
}

private readonly IDictionary<string, ClientOperation> _clientOperations
```

This simplified verifying the operation id and delegating down to perform it.

```csharp
public async Task<JsonResponse> PerformAsync(
    string operationId,
    IEnumerable<(string, string)> parameters)
{
    if (_clientOperations.TryGetValue(operationId, out var clientOperation))
    {
        var jsonResponse =
            await PerformClientOperationAsync(clientOperation, parameters);
        return jsonResponse;
    }

    // <snip>
}
```

## Chapter 2

The original 'perform' method quickly got overly long, weighing in at over 150 lines. However, that did enable me to understand the steps that were required. Pre-armed with this knowledge, my second try was much cleaner.

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
        return
            new JsonResponse
            {
                IsSuccessful = false,
                FailureReasons = parameterErrors,
            };
    }

    var restResponse = await _restClient.ExecuteAsync(restRequest);

    var jsonResponse = GetJsonResponse(restResponse);

    return jsonResponse;
}
```

Here we can clearly see how we use the OpenAPI details to prepare the `RestRequest` instance. First to set the path and the method, then to set the parameters as defined by the OpenAPI document. The parameters are validated as they are set, recording any errors in the collection that is then inspected before the request is executed.

The final step is to package the response from `RestSharp` into our own `JsonResponse` class. This keeps the outside code decoupled from the `RestSharp` package.

## RestSharp simplified development

`RestSharp` made the client development straightforward. In particular, the `AddUrlSegment` method allowed me to set the path parameters without having to worry about any string parsing or encoding.

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

It was a similar situation for the other types of parameters. I could write my code without worrying about encodings.

## OpenApiDocument doesn't contain all properties

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
