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
            return await PerformClientOperationAsync(clientOperation, parameters);
        }

        return new JsonResponse
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

        // TODO

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

        // TODO: Look at a method with 'out var errors' here
        foreach (var openApiParameter in clientOperation.Operation.Parameters)
        {
            var parameterValues =
                GetParameterValues(openApiParameter, parameters, out var errors);

            if (errors.Any())
            {
                parameterErrors.AddRange(errors);
                continue;
            }

            SetParameterValues(openApiParameter, parameterValues, restRequest);
        }

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

        // TODO: Assert no parameter errors

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
        RestRequest restRequest)
    {
        throw new NotImplementedException();
    }

    private static IEnumerable<string> GetParameterValues(
        OpenApiParameter openApiParameter, 
        IEnumerable<(string, string)> parameters,
        out IEnumerable<string> validationErrors)
    {
        throw new NotImplementedException();
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
}
