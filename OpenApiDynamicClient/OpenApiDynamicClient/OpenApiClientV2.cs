using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Microsoft.OpenApi.Readers;
using Newtonsoft.Json.Linq;
using RestSharp;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Runtime.InteropServices.ComTypes;
using System.Text;
using System.Threading.Tasks;
using static System.Net.Mime.MediaTypeNames;

namespace OpenApiDynamicClient;

public class OpenApiClientV2
{
    #region Members

    private readonly IDictionary<string, ClientOperation> _clientOperations;
    private readonly RestClient _restClient;

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

    public static OpenApiClientV2 Create(string openApiJson, Uri domainUri)
    {
        using var openApiJsonStream =
            new MemoryStream(Encoding.UTF8.GetBytes(openApiJson));

        var openApiDocument =
            new OpenApiStreamReader().Read(openApiJsonStream, out var openApiDiagnostic);

        AssertNoOpenApiErrors(openApiDiagnostic);

        var clientOperations = GetClientOperations(openApiDocument);

        var basePath = SelectBasePath(openApiJson); // basePath not in OpenApiDocument
        var baseUri = new Uri(domainUri, basePath);

        return new OpenApiClientV2(clientOperations, baseUri);
    }

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

        return 
            new JsonResponse
            {
                IsSuccessful = false,
                FailureReasons = [$"Invalid operation id: {operationId}"],
            };
    }

    #endregion

    #region Private

    private static IDictionary<string, ClientOperation> GetClientOperations(
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
                    };

                clientOperations.Add(operation.Value.OperationId, clientOperation);
            }
        }

        return clientOperations;
    }

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
            return new JsonResponse
            {
                IsSuccessful = false,
                FailureReasons = parameterErrors,
            };
        }

        // TODO: Add security headers via delegates

        var restResponse = await _restClient.ExecuteAsync(restRequest);

        /* TODO:
         * If there is a response, map to declared responses
         * If there is a response object, validate the response against the schema
         */

        // TODO: If the response does not match the declared schema, what should we do?

        var jsonResponse = GetJsonResponse(restResponse);

        return jsonResponse;
    }

    private void SetBodyParameter(
        ClientOperation clientOperation,
        IEnumerable<(string, string)> parameters,
        RestRequest restRequest,
        List<string> parameterErrors)
    {
        if (clientOperation.Operation.RequestBody != null)
        {
            var bodyValue =
                GetBodyValue(
                    clientOperation.Operation.RequestBody, parameters, out var errors);

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
                GetParameterValues(openApiParameter, parameters, out var errors);

            if (errors.Any())
            {
                parameterErrors.AddRange(errors);
            }
            else
            {
                SetParameterValues(
                    openApiParameter, parameterValues, restRequest, parameterErrors);
            }
        }
    }

    private string GetBodyValue(
        OpenApiRequestBody requestBody, 
        IEnumerable<(string, string)> parameters, 
        out IEnumerable<string> errors)
    {
        throw new NotImplementedException();
    }

    private static void SetParameterValues(
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

    private static IEnumerable<string> GetParameterValues(
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
            var defaultOpenApiString = (OpenApiString)defaultParameterValue;
            parameterValues = [defaultOpenApiString.Value];
        }

        if (openApiParameter.Required && parameterValues.Count() == 0)
        {
            errors.Add($"{openApiParameter.Name} parameter is required");
        }

        // TODO: Validate against the declared type

        validationErrors = errors;

        return parameterValues;
    }

    private static JsonResponse GetJsonResponse(RestResponse restResponse)
    {
        HttpStatusCode? httpStatusCode =
            restResponse.ResponseStatus == ResponseStatus.Completed
                ? restResponse.StatusCode
                : null;

        IEnumerable<string> failureReasons =
            restResponse.ResponseStatus == ResponseStatus.Completed
                ? []
                : restResponse.ErrorException?.InnerException == null
                    ? [restResponse.ErrorMessage]
                    : [restResponse.ErrorException.InnerException.Message];

        var jsonResponse =
            new JsonResponse
            {
                IsSuccessful = restResponse.IsSuccessful,
                HttpResponseStatus = restResponse.ResponseStatus.ToString(),
                HttpStatusCode = httpStatusCode,
                FailureReasons = failureReasons,
                BodyJson = restResponse.Content,
            };

        return jsonResponse;
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

    #endregion

    #region From Claude.ai

    public static bool ValidateParameterValue(string value, OpenApiParameter parameter)
    {
        try
        {
            // Get the parameter schema
            var schema = parameter.Schema;

            // Validate the value based on the parameter type
            switch (schema.Type)
            {
                case "string":
                    return ValidateStringParameter(value, schema);
                case "integer":
                    return int.TryParse(value, out _);
                case "number":
                    return double.TryParse(value, out _);
                case "boolean":
                    return bool.TryParse(value, out _);
                case "array":
                    return ValidateArrayParameter(value, schema);
                default:
                    return false;
            }
        }
        catch (Exception)
        {
            return false;
        }
    }

    private static bool ValidateStringParameter(string value, OpenApiSchema schema)
    {
        if (schema.Pattern != null)
        {
            return System.Text.RegularExpressions.Regex.IsMatch(value, schema.Pattern);
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

    private static bool ValidateArrayParameter(string value, OpenApiSchema schema)
    {
        try
        {
            // Split the string into an array
            var items = value.Split(',');

            // Validate each item in the array
            foreach (var item in items)
            {
                if (!ValidateParameterValue(
                    item.Trim(), new OpenApiParameter { Schema = schema.Items }))
                {
                    return false;
                }
            }

            return true;
        }
        catch (Exception)
        {
            return false;
        }
    }
    #endregion
}
