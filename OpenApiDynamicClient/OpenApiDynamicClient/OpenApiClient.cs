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

public class OpenApiClient  
{
    private readonly OpenApiDocument _openApiDocument;
    private readonly RestClient _client;

    private OpenApiClient(OpenApiDocument openApiDocument, string baseUrl)
    {
        _openApiDocument = openApiDocument;
        _client = new RestClient(baseUrl);
    }

    public static OpenApiClient Create(Stream openApiStream, string baseUrl)
    {
        var openApiDocument =
            new OpenApiStreamReader().Read(openApiStream, out var diagnostic);

        return new OpenApiClient(openApiDocument, baseUrl);
    }

    public async Task<JsonResponse> PerformAsync(
        string operationId,
        IEnumerable<(string, string)> parameters)
    {
        var operationPath =
            _openApiDocument.Paths
                .FirstOrDefault(p => 
                    p.Value.Operations.Any(o => o.Value.OperationId == operationId));

        if (operationPath.Value == null)
        {
            throw new ArgumentException("Unknown operation", nameof(operationId));
        }

        var operation =
            operationPath.Value.Operations
                .FirstOrDefault(o => o.Value.OperationId == operationId);

        var request = new RestRequest(operationPath.Key, GetMethod(operation.Key));

        /* TODO:
         * Loop through all declared parameters, adding them as appropriate
         * If any required ones are missing then add an error to a list
         * Validate each parameter against the declared type
         * If there is an object body parameter, validate it against the schema
         * 
         * request.AddUrlSegment("partId", "123");
         * request.AddQueryParameter("filter", "active");
         * request.AddStringBody(bodyJson, ContentType.Json);
         */

        // TODO: Should an invalid request result in an exception or an unsuccessful response?

        var bodyJson = parameters.First().Item1;
        request.AddStringBody(bodyJson, ContentType.Json);

        // TODO: Security considerations

        var response = await _client.ExecuteAsync(request);

        /* TODO:
         * If there is a response, map to declared responses
         * If there is a response object, validate the response against the schema
         */

        // TODO: If the response does not match the declared schema, what should we do?

        return new JsonResponse
        {
            IsSuccessful = response.IsSuccessful,
            Body = response.Content,            
        };
    }

    private Method GetMethod(OperationType operationType) => 
        operationType switch
        {
            OperationType.Get => Method.Get,
            OperationType.Post => Method.Post,
            OperationType.Put => Method.Put,
            OperationType.Delete => Method.Delete,
            OperationType.Patch => Method.Patch,
            OperationType.Head => Method.Head,
            OperationType.Options => Method.Options,
            _ => throw new ArgumentException(
                $"Unsupported operation type: {operationType}", nameof(operationType)),
        };
}

