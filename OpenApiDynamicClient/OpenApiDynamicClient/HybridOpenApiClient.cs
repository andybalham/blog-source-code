using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

namespace OpenApiDynamicClient;

public static class HybridOpenApiClient
{
    private static readonly JsonSerializerSettings _serializerSettings =
        new()
        {
            MissingMemberHandling = MissingMemberHandling.Ignore,
            NullValueHandling = NullValueHandling.Ignore,
            Converters = [new StringEnumConverter()],
        };

    public static async Task<T> CreateAsync<T>(
        Uri domainUri, Func<OpenApiClientV2, T> createHybridClient) where T : class
    {
        var openApiJson = LoadOpenApiJsonForType<T>();

        var client = await OpenApiClientV2.CreateAsync(openApiJson, domainUri);

        client.OnSuccess = OnSuccess;
        client.OnFailure = OnFailure;

        return createHybridClient(client);
    }

    public static void OnSuccess(
        string operationId,
        IEnumerable<(string, string)> parameters,
        JsonResponse response)
    {
    }

    public static void OnFailure(
        string operationId,
        IEnumerable<(string, string)> parameters,
        JsonResponse response)
    {
        if (response.HttpStatusCode.HasValue)
        {
            throw new OpenApiException(
                $"{operationId} received {(int)response.HttpStatusCode}: " +
                    $"{string.Join(", ", response.FailureReasons)}",
                response.HttpStatusCode.Value);
        }

        throw new OpenApiException(
            $"{operationId} failed: " +
            $"{string.Join(", ", response.FailureReasons)}",
            response.Exception);
    }

    public static string Serialize(object value)
    {
        if (value == null)
        {
            return null;
        }

        var valueJson = JsonConvert.SerializeObject(value, _serializerSettings);

        var isJsonString = valueJson.StartsWith("\"");

        if (isJsonString)
        {
            return valueJson.Trim('"');
        }

        return valueJson;
    }

    public static T Deserialize<T>(JsonResponse response)
    {
        return JsonConvert.DeserializeObject<T>(response.Payload, _serializerSettings);
    }

    private static string LoadOpenApiJsonForType<T>()
    {
        var type = typeof(T);
        var typeName = type.Name;
        var assembly = type.Assembly;
        
        var resourceName = $"{type.Namespace}.{typeName}.OpenAPI.json";

        using var stream = 
            assembly.GetManifestResourceStream(resourceName) 
            ?? throw new FileNotFoundException($"Embedded resource not found: {resourceName}");

        using StreamReader reader = new(stream);

        return reader.ReadToEnd();
    }
}
