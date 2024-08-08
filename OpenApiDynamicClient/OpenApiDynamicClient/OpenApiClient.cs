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
using System.Web.UI.WebControls;
using Microsoft.OpenApi.Writers;
using Newtonsoft.Json.Linq;
using NJsonSchema;
using Newtonsoft.Json;

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
            return new JsonResponse
            {
                IsSuccessful = false,
                FailureReason = $"Invalid operation id: {operationId}",
            };
        }

        var operation =
            operationPath.Value.Operations
                .FirstOrDefault(o => o.Value.OperationId == operationId);

        var request = new RestRequest(operationPath.Key, GetMethod(operation.Key));

        var parameterErrors = new List<string>();

        foreach (var openApiParameter in operation.Value.Parameters)
        {
            var parameterValues = 
                parameters
                    .Where(p => p.Item1 == openApiParameter.Name)
                    .Select(p => p.Item2);

            if (parameterValues.Count() == 0)
            {
                // TODO: We can provide a default if there is one defined

                if (openApiParameter.Required)
                {
                    parameterErrors.Add($"{openApiParameter.Name} parameter is required");
                }

                continue;
            }

            // TODO: Validate against the declared type

            switch (openApiParameter.In)
            {
                case ParameterLocation.Path:
                    // TODO: Validate only a single value
                    request.AddUrlSegment(openApiParameter.Name, parameterValues.First());
                    break;
                case ParameterLocation.Query:
                    // TODO: Package according to the array syntax (if there is some)
                    foreach (var parameterValue in parameterValues)
                    {
                        request.AddQueryParameter(openApiParameter.Name, parameterValue);
                    }
                    break;
                default:
                    parameterErrors.Add(
                        $"{openApiParameter.Name} parameter has an unsupported In value " +
                        $"{openApiParameter.In}");
                    break;
            }
        }

        if (operation.Value.RequestBody != null)
        {
            var bodyValues =
                parameters
                    .Where(p => p.Item1 == "body")
                    .Select(p => p.Item2);

            if (bodyValues.Count() == 0)
            {
                if (operation.Value.RequestBody.Required)
                {
                    parameterErrors.Add($"body parameter is required");
                }
            }
            else
            {
                if (bodyValues.Count() > 1)
                {
                    parameterErrors.Add($"Multiple body parameters not supported");
                }
                else
                {
                    if (operation.Value.RequestBody.Content.TryGetValue(
                        "application/json", out var mediaType))
                    {
                        var bodyJson = bodyValues.First();

                        // Convert OpenApiSchema to JSON Schema
                        var schemaData = SerializeSchema(mediaType.Schema);
                        var jsonSchema = await JsonSchema.FromJsonAsync(schemaData);

                        // Parse the JSON to validate
                        var jsonToken = JToken.Parse(bodyJson);

                        // Validate the JSON against the schema
                        var schemaErrors = jsonSchema.Validate(jsonToken);

                        if (schemaErrors.Count() > 0)
                        {
                            parameterErrors.Add(
                                $"body parameter has schema errors " +
                                $"({JsonConvert.SerializeObject(schemaErrors)})");
                        }
                        else
                        {
                            request.AddStringBody(bodyJson, ContentType.Json);
                        }
                    }
                    else
                    {
                        return new JsonResponse
                        {
                            IsSuccessful = false,
                            FailureReason =
                                $"body does not support application/json",
                        };
                    }
                }
            }
        }

        if (parameterErrors.Count > 0)
        {
            return new JsonResponse
            {
                IsSuccessful = false,
                FailureReason = 
                    $"Parameter validation failed: {string.Join(", ", parameterErrors)}",
            };
        }

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

    private static string SerializeSchema(OpenApiSchema schema)
    {
        using var memoryStream = new MemoryStream();
        using (var writer = new StreamWriter(memoryStream))
        {
            var writerSettings =
                new OpenApiWriterSettings()
                {
                    InlineLocalReferences = true,
                    InlineExternalReferences = true,
                };

            schema.SerializeAsV2WithoutReference(
                new OpenApiJsonWriter(writer, writerSettings));
        }

        var schemaJson = GetStringFromMemoryStream(memoryStream);
        return schemaJson;
    }

    private static string GetStringFromMemoryStream(MemoryStream memoryStream)
    {
        return Encoding.UTF8.GetString(memoryStream.ToArray());
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

