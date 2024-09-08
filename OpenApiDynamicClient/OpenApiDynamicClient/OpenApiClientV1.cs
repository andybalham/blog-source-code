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
using Microsoft.OpenApi.Any;
using NJsonSchema.Validation;
using System.Net;

namespace OpenApiDynamicClient;

public class OpenApiClientV1  
{
    private readonly OpenApiDocument _openApiDocument;
    private readonly RestClient _client;

    private OpenApiClientV1(OpenApiDocument openApiDocument, string baseUrl)
    {
        _openApiDocument = openApiDocument;
        _client = new RestClient(baseUrl);
    }

    public static OpenApiClientV1 Create(Stream openApiStream, string baseUrl)
    {
        var openApiDocument =
            new OpenApiStreamReader().Read(openApiStream, out var diagnostic);

        return new OpenApiClientV1(openApiDocument, baseUrl);
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
                FailureReasons = [$"Invalid operation id: {operationId}"],
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
                    .Where(p => p.Item1 == openApiParameter.Name).Select(p => p.Item2);

            if (parameterValues.Count() == 0 && openApiParameter.Schema?.Items?.Default != null)
            {
                var defaultOpenApiString = (OpenApiString)openApiParameter.Schema.Items.Default;
                parameterValues = [defaultOpenApiString.Value];
            }

            if (openApiParameter.Required && parameterValues.Count() == 0)
            {
                parameterErrors.Add($"{openApiParameter.Name} parameter is required");
                continue;
            }

            // TODO: Validate against the declared type

            switch (openApiParameter.In)
            {
                case ParameterLocation.Header:
                    // TODO: Validate only a single value
                    request.AddHeader(openApiParameter.Name, parameterValues.First());
                    break;
                case ParameterLocation.Path:
                    // TODO: Validate only a single value
                    request.AddUrlSegment(openApiParameter.Name, parameterValues.First());
                    break;
                case ParameterLocation.Query:
                    // TODO: Package according to the array syntax
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

            if (operation.Value.RequestBody.Required && bodyValues.Count() == 0)
            {
                parameterErrors.Add($"body parameter is required");
            }
            else if (bodyValues.Count() > 1)
            {
                parameterErrors.Add($"Multiple body parameters found");
            }
            else if (operation.Value.RequestBody.Content.TryGetValue(
                        "application/json", out var mediaType))
            {
                var schemaData = SerializeOpenApiSchema(mediaType.Schema);
                var jsonSchema = await JsonSchema.FromJsonAsync(schemaData);

                try
                {
                    var bodyJson = bodyValues.First();

                    var bodyJsonToken = JToken.Parse(bodyJson);
                    var bodySchemaErrors = jsonSchema.Validate(bodyJsonToken);

                    if (bodySchemaErrors.Count() > 0)
                    {
                        parameterErrors.Add(
                            $"body parameter has errors " +
                            $"{GetSchemaErrorSummary(bodySchemaErrors)}");
                    }
                    else
                    {
                        request.AddStringBody(bodyJson, ContentType.Json);
                    }
                }
                catch (JsonReaderException ex)
                {
                    return new JsonResponse
                    {
                        IsSuccessful = false,
                        FailureReasons =
                            [$"Unable to parse body JSON: {ex.Message}"],
                    };
                }
            }
            else
            {
                return new JsonResponse
                {
                    IsSuccessful = false,
                    FailureReasons =
                        [$"body does not support application/json"],
                };
            }
        }

        if (parameterErrors.Count > 0)
        {
            return new JsonResponse
            {
                IsSuccessful = false,
                FailureReasons = parameterErrors,
            };
        }

        // TODO: Security considerations

        var response = await _client.ExecuteAsync(request);

        /* TODO:
         * If there is a response, map to declared responses
         * If there is a response object, validate the response against the schema
         */

        // TODO: If the response does not match the declared schema, what should we do?

        HttpStatusCode? httpStatusCode =
            response.ResponseStatus == ResponseStatus.Completed
                ? response.StatusCode 
                : null;

        IEnumerable<string> failureReasons =
            response.ResponseStatus == ResponseStatus.Completed
                ? []
                : response.ErrorException?.InnerException == null
                    ? [response.ErrorMessage]
                    : [response.ErrorException.InnerException.Message];

        return new JsonResponse
        {
            IsSuccessful = response.IsSuccessful,
            ResponseStatus = response.ResponseStatus.ToString(),
            HttpStatusCode = httpStatusCode,
            FailureReasons = failureReasons,
            Payload = response.Content,
        };
    }

    private string GetSchemaErrorSummary(ICollection<ValidationError> schemaErrors)
    {
        var schemaErrorSummary =
            schemaErrors.Select(ve =>
                new {
                    ve.Property,
                    ve.Path,
                    Kind = ve.Kind.ToString(),
                });
        
        return JsonConvert.SerializeObject(schemaErrorSummary);
    }

    private static string SerializeOpenApiSchema(OpenApiSchema schema)
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

        var schemaJson = Encoding.UTF8.GetString(memoryStream.ToArray());

        return schemaJson;
    }

    private static Method GetMethod(OperationType operationType) => 
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

