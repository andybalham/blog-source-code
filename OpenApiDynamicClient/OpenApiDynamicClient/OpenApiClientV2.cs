using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Microsoft.OpenApi.Readers;
using Microsoft.OpenApi.Writers;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using NJsonSchema;
using NJsonSchema.Validation;
using RestSharp;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace OpenApiDynamicClient;

public class OpenApiClientV2
{
    #region Members

    public delegate void ResponseHandler(
        string operationId,
        IEnumerable<(string, string)> parameters,
        JsonResponse response);

    private readonly IDictionary<string, ClientOperation> _clientOperations;
    private readonly RestClient _restClient;

    public ResponseHandler OnSuccess { get; set; }
    public ResponseHandler OnFailure { get; set; }

    #endregion

    #region Constructors

    private OpenApiClientV2(
        IDictionary<string, ClientOperation> clientOperations, 
        Uri baseUri)
    {
        _clientOperations = clientOperations;
        _restClient = new RestClient(baseUri);
    }

    #endregion

    #region Public

    public static async Task<OpenApiClientV2> CreateAsync(string openApiJson, Uri domainUri)
    {
        using var openApiJsonStream =
            new MemoryStream(Encoding.UTF8.GetBytes(openApiJson));

        var openApiDocument =
            new OpenApiStreamReader().Read(openApiJsonStream, out var openApiDiagnostic);

        AssertNoOpenApiErrors(openApiDiagnostic);

        var clientOperations = await BuildClientOperationsAsync(openApiDocument);

        // TODO: Get the host as well

        var basePath = SelectBasePath(openApiJson); // basePath not in OpenApiDocument
        var baseUri = new Uri(domainUri, basePath);

        return new OpenApiClientV2(clientOperations, baseUri);
    }

    public async Task<JsonResponse> PerformAsync(
        string operationId,
        IEnumerable<(string, string)> parameters)
    {
        JsonResponse response;

        if (_clientOperations.TryGetValue(operationId, out var clientOperation))
        {
            try
            {
                response =
                    await PerformClientOperationAsync(clientOperation, parameters);
            }
            catch (Exception ex)
            {
                response =
                    new JsonResponse
                    {
                        IsSuccessful = false,
                        FailureReasons = [$"{ex.GetType().FullName}: {ex.Message}"],
                        Exception = ex,
                    };
            }
        }
        else
        {
            response =
                new JsonResponse
                {
                    IsSuccessful = false,
                    FailureReasons = [$"Invalid operation id: {operationId}"],
                };
        }

        if (response.IsSuccessful && OnSuccess != null)
        {
            OnSuccess(operationId, parameters, response);
        }

        if (!response.IsSuccessful && OnFailure != null)
        {
            OnFailure(operationId, parameters, response);
        }

        return response;
    }

    #endregion

    #region Private

    private static async Task<IDictionary<string, ClientOperation>> BuildClientOperationsAsync(
        OpenApiDocument openApiDocument)
    {
        var clientOperations = new Dictionary<string, ClientOperation>();

        foreach (var path in openApiDocument.Paths)
        {
            foreach (var operation in path.Value.Operations)
            {
                var clientOperation =
                    new ClientOperation
                    {
                        Operation = operation.Value,
                        OperationType = operation.Key,
                        Path = path.Key,
                        RequestBodyRequired = 
                            operation.Value.RequestBody?.Required ?? false,
                        RequestBodyJsonSchema = 
                            await GetRequestBodyJsonSchemaAsync(operation.Value.RequestBody),
                    };

                clientOperations.Add(operation.Value.OperationId, clientOperation);
            }
        }

        return clientOperations;
    }

    private static async Task<JsonSchema> GetRequestBodyJsonSchemaAsync(
        OpenApiRequestBody requestBody)
    {
        if (requestBody != null 
            && requestBody.Content.TryGetValue("application/json", out var mediaType))
        {
            var schemaData = SerializeOpenApiSchema(mediaType.Schema);
            var jsonSchema = await JsonSchema.FromJsonAsync(schemaData);
            return jsonSchema;
        }
        
        return null;
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

    private async Task<JsonResponse> PerformClientOperationAsync(
        ClientOperation clientOperation,
        IEnumerable<(string, string)> parameters)
    {
        var stopwatch = new Stopwatch();

        try
        {
            var restRequest =
                new RestRequest(
                    clientOperation.Path, GetMethod(clientOperation.OperationType));

            var parameterErrors = new List<string>();

            SetNonBodyParameters(clientOperation, parameters, restRequest, parameterErrors);

            SetBodyParameter(clientOperation, parameters, restRequest, parameterErrors);

            // FUTURE: Allow additional headers to be added, if not part of the specification

            if (parameterErrors.Count > 0)
            {
                return GetJsonResponse(parameterErrors);
            }

            stopwatch.Start();

            var restResponse = await _restClient.ExecuteAsync(restRequest);

            stopwatch.Stop();

            // FUTURE: Use the OpenAPI document to validate the response

            return
                GetJsonResponse(
                    clientOperation, restResponse, stopwatch.ElapsedMilliseconds);
        }
        catch (Exception ex)
        {
            stopwatch.Stop();

            return GetJsonResponse(ex, stopwatch.ElapsedMilliseconds);
        }
    }

    private static void SetBodyParameter(
        ClientOperation clientOperation,
        IEnumerable<(string, string)> parameters,
        RestRequest restRequest,
        List<string> parameterErrors)
    {
        if (clientOperation.Operation.RequestBody != null)
        {
            var bodyValue = GetBodyValue(clientOperation, parameters, out var errors);

            if (errors.Any())
            {
                parameterErrors.AddRange(errors);
            }
            else
            {
                restRequest.AddStringBody(bodyValue, ContentType.Json);
            }
        }
    }

    private static void SetNonBodyParameters(
        ClientOperation clientOperation,
        IEnumerable<(string, string)> parameters,
        RestRequest restRequest,
        List<string> parameterErrors)
    {
        foreach (var openApiParameter in clientOperation.Operation.Parameters)
        {
            var parameterValues =
                GetNonBodyParameterValues(openApiParameter, parameters, out var errors);

            if (errors.Any())
            {
                parameterErrors.AddRange(errors);
            }
            else
            {
                SetNonBodyParameterValues(
                    openApiParameter, parameterValues, restRequest, parameterErrors);
            }
        }
    }

    private static string GetBodyValue(
        ClientOperation clientOperation, 
        IEnumerable<(string, string)> parameters, 
        out IEnumerable<string> errors)
    {
        var bodyValues =
            parameters
                .Where(p => p.Item1 == "body")
                .Select(p => p.Item2);

        if (clientOperation.RequestBodyJsonSchema == null)
        {
            errors = [$"{clientOperation.Operation.OperationId} does not consume JSON"];
            return null;
        }

        if (clientOperation.RequestBodyRequired && bodyValues.Count() == 0)
        {
            errors = [$"body parameter is required"];
            return null;
        }
        
        if (bodyValues.Count() > 1)
        {
            errors = [$"Multiple body parameters found"];
            return null;
        }

        try
        {
            var bodyJson = bodyValues.First();
            var bodyJsonToken = JToken.Parse(bodyJson);
            var bodySchemaErrors = 
                clientOperation.RequestBodyJsonSchema.Validate(bodyJsonToken);

            if (bodySchemaErrors.Count() > 0)
            {
                errors = GetSchemaErrorSummaries(bodySchemaErrors);
                return null;
            }

            errors = [];
            return bodyJson;
        }
        catch (JsonReaderException ex)
        {
            errors = [$"Unable to parse body JSON: {ex.Message}"];
            return null;
        }
    }

    private static IEnumerable<string> GetSchemaErrorSummaries(
        ICollection<ValidationError> schemaErrors)
    {
        var schemaErrorSummaries =
            schemaErrors
                .Select(se =>
                    new {
                        se.Property,
                        se.Path,
                        Kind = se.Kind.ToString(),
                    })
                .Select(se =>
                    $"body parameter error: {JsonConvert.SerializeObject(se)}");

        return schemaErrorSummaries;
    }

    private static void SetNonBodyParameterValues(
        OpenApiParameter openApiParameter,
        IEnumerable<string> parameterValues,
        RestRequest restRequest,
        List<string> parameterErrors)
    {
        switch (openApiParameter.In)
        {
            case ParameterLocation.Header:
                AddHeaderParameter(
                    openApiParameter, parameterValues, restRequest, parameterErrors);
                break;
            case ParameterLocation.Path:
                AddPathParameter(
                    openApiParameter, parameterValues, restRequest, parameterErrors);
                break;
            case ParameterLocation.Query:
                AddQueryParameters(openApiParameter, parameterValues, restRequest);
                break;
            default:
                parameterErrors.Add(
                    $"{openApiParameter.Name} parameter has an unsupported In value " +
                    $"{openApiParameter.In}");
                break;
        }
    }

    private static void AddQueryParameters(
        OpenApiParameter openApiParameter,
        IEnumerable<string> parameterValues,
        RestRequest restRequest)
    {
        // FUTURE: Package according to the collectionFormat (not in OpenApiParameter)

        foreach (var parameterValue in parameterValues)
        {
            restRequest.AddQueryParameter(openApiParameter.Name, parameterValue);
        }
    }

    private static void AddHeaderParameter(
        OpenApiParameter openApiParameter,
        IEnumerable<string> parameterValues,
        RestRequest restRequest,
        List<string> parameterErrors)
    {
        if (parameterValues.Count() > 1)
        {
            parameterErrors.Add(
                $"{openApiParameter.Name} header parameter has multiple values");
            return;
        }

        restRequest.AddHeader(openApiParameter.Name, parameterValues.First());
    }

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

    private static IEnumerable<string> GetNonBodyParameterValues(
        OpenApiParameter openApiParameter, 
        IEnumerable<(string, string)> parameters,
        out IEnumerable<string> validationErrors)
    {
        var errors = new List<string>();

        var parameterValues =
            parameters
                .Where(p => p.Item1 == openApiParameter.Name).Select(p => p.Item2);

        var defaultParameterValue = openApiParameter.Schema?.Items?.Default;

        if (parameterValues.Count() == 0 && defaultParameterValue != null)
        {
            parameterValues = [((OpenApiString)defaultParameterValue).Value];
        }

        if (openApiParameter.Required && parameterValues.Count() == 0)
        {
            errors.Add($"{openApiParameter.Name} parameter is required");
        }

        foreach (var parameterValue in parameterValues)
        {
            if (!ValidateParameterValue(parameterValue, openApiParameter))
            {
                errors.Add(
                    $"{openApiParameter.Name} parameter value is invalid " +
                    $"'{parameterValue}'");
            }
        }

        validationErrors = errors;

        return parameterValues;
    }

    private static JsonResponse GetJsonResponse(List<string> parameterErrors)
    {
        return
            new JsonResponse
            {
                IsSuccessful = false,
                FailureReasons = parameterErrors,
            };
    }

    private JsonResponse GetJsonResponse(Exception ex, long elapsedMilliseconds)
    {
        return
            new JsonResponse
            {
                IsSuccessful = false,
                FailureReasons = [ex.Message],
                Exception = ex,
                ElapsedMilliseconds = elapsedMilliseconds,
            };
    }

    private static JsonResponse GetJsonResponse(
        ClientOperation clientOperation,
        RestResponse restResponse,
        long elapsedMilliseconds)
    {
        HttpStatusCode? httpStatusCode =
            restResponse.ResponseStatus == ResponseStatus.Completed
                ? restResponse.StatusCode
                : null;

        IEnumerable<string> failureReasons =
            restResponse.ResponseStatus == ResponseStatus.Completed
                ? restResponse.IsSuccessful
                    ? []
                    : [GetResponseDescription(restResponse.StatusCode, clientOperation)]
                : restResponse.ErrorException?.InnerException == null
                    ? [restResponse.ErrorMessage]
                    : [restResponse.ErrorException.InnerException.Message];

        var jsonResponse =
            new JsonResponse
            {
                IsSuccessful = restResponse.IsSuccessful,
                ResponseStatus = restResponse.ResponseStatus.ToString(),
                HttpStatusCode = httpStatusCode,
                FailureReasons = failureReasons,
                Payload = restResponse.Content,
                Exception = restResponse.ErrorException,
                ElapsedMilliseconds = elapsedMilliseconds,
            };

        return jsonResponse;
    }

    private static string GetResponseDescription(
        HttpStatusCode statusCode,
        ClientOperation clientOperation)
    {
        if (clientOperation.Operation.Responses.TryGetValue(
            ((int)statusCode).ToString(), out var openApiResponse))
        {
            return openApiResponse.Description;
        }
        
        return statusCode.ToString();
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

    private static string SelectBasePath(string openApiJson)
    {
        var openApiJsonObject = JObject.Parse(openApiJson);

        var basePathToken =
            openApiJsonObject.SelectToken("$.basePath", errorWhenNoMatch: false);

        var basePath = basePathToken?.Value<string>();

        return basePath;
    }

    private static void AssertNoOpenApiErrors(OpenApiDiagnostic openApiDiagnostic)
    {
        if (openApiDiagnostic.Errors.Count > 0)
        {
            throw new ArgumentException(
                $"Errors reading OpenAPI document:\n- " +
                    $"{string.Join("\n- ", openApiDiagnostic.Errors)}");
        }
    }

    public static bool ValidateParameterValue(string value, OpenApiParameter parameter)
    {
        var schema = parameter.Schema;

        /* FUTURE: How far do we go in validating the parameters? Mixed type support?
         * https://swagger.io/docs/specification/data-models/data-types/
            public decimal? Maximum { get; set; }
            public bool? ExclusiveMaximum { get; set; }
            public decimal? Minimum { get; set; }
            public bool? ExclusiveMinimum { get; set; }
            public decimal? MultipleOf { get; set; }
            */

        return schema.Type switch
        {
            "string" => ValidateStringParameter(value, schema),
            "integer" => int.TryParse(value, out _),
            "number" => double.TryParse(value, out _),
            "boolean" => bool.TryParse(value, out _),
            "array" => ValidateParameterValue(
                value, new OpenApiParameter { Schema = schema.Items }),
            _ => true,
        };
    }

    private static bool ValidateStringParameter(string value, OpenApiSchema schema)
    {
        if (schema.Enum != null)
        {
            var enumContainsValue = 
                schema.Enum.Any(e => ((OpenApiString)e).Value == value);
            return enumContainsValue;
        }

        if (schema.Pattern != null)
        {
            // Mitigate against ReDOS (Regular Expression Denial of Service)
            var safePattern = LimitGreedyQuantifiers(schema.Pattern);
            var regexIsMatch = Regex.IsMatch(value, safePattern);
            return regexIsMatch;
        }

        if (schema.MinLength.HasValue && value.Length < schema.MinLength.Value)
        {
            return false;
        }

        if (schema.MaxLength.HasValue && value.Length > schema.MaxLength.Value)
        {
            return false;
        }

        return true;
    }

    public static string LimitGreedyQuantifiers(string pattern, int limit = 1000)
    {
        // FUTURE: Add parameters collection to ClientOperation class with safe patterns

        if (string.IsNullOrEmpty(pattern))
            return pattern;

        // Replace unbounded greedy quantifiers with bounded ones
        string safePattern = 
            Regex.Replace(pattern, @"(\*|\+)(?!\?)(?!\{)", m =>
            {
                return m.Value switch
                {
                    "*" => $"{{0,{limit}}}",
                    "+" => $"{{1,{limit}}}",
                    _ => m.Value,
                };
            });

        // Replace existing bounded quantifiers that exceed the limit
        safePattern = 
            Regex.Replace(safePattern, @"\{(\d+),?\s*(\d+)?\}", m =>
            {
                int min = int.Parse(m.Groups[1].Value);
                int max = m.Groups[2].Success ? int.Parse(m.Groups[2].Value) : int.MaxValue;

                if (max > limit)
                {
                    return $"{{{min},{limit}}}";
                }

                return m.Value;
            });

        return safePattern;
    }

    #endregion
}
