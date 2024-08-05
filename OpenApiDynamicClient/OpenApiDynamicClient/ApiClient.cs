using Microsoft.OpenApi.Models;
using Microsoft.OpenApi.Readers;
using RestSharp.Authenticators;
using RestSharp;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Threading;

namespace OpenApiDynamicClient;

public class ApiClient  
{
    private readonly OpenApiDocument _openApiDocument;
    private readonly string _baseUrl;

    private ApiClient(OpenApiDocument openApiDocument, string baseUrl)
    {
        _openApiDocument = openApiDocument;
        _baseUrl = baseUrl;
    }

    public static ApiClient Create(Stream definitionStream, string baseUrl)
    {
        var openApiDocument =
            new OpenApiStreamReader().Read(definitionStream, out var diagnostic);

        return new ApiClient(openApiDocument, baseUrl);
    }

    public async Task<JsonResponse> PerformOperationAsync(
        string operationId,
        IEnumerable<ApiParameter> parameters)
    {
        var options = new RestClientOptions(_baseUrl)
        {
            //Authenticator = new HttpBasicAuthenticator("username", "password")
        };

        var client = new RestClient(options);
        var request = new RestRequest("/pet", Method.Post);

        request.AddBody(parameters.First().Value, ContentType.Json);

        // The cancellation token comes from the caller. You can still make a call without it.
        var response = await client.GetAsync(request);

        return new JsonResponse
        {
            IsSuccessful = response.IsSuccessful,
            Body = response.Content,
        };
    }
}

