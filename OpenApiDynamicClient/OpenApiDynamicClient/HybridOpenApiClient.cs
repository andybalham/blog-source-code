using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using System;
using System.Collections.Generic;
using System.Diagnostics.Eventing.Reader;
using System.Threading.Tasks;

namespace OpenApiDynamicClient;

public class HybridOpenApiClient
{
    private static readonly JsonSerializerSettings _serializerSettings =
        new()
        {
            MissingMemberHandling = MissingMemberHandling.Ignore,
            NullValueHandling = NullValueHandling.Ignore,
            Converters = [new StringEnumConverter()],
        };

    public static async Task<T> CreateAsync<T>(
        Func<OpenApiClientV2, T> newHybridClient,
        string openApiJson,
        Uri domainUri)
        where T : class
    {
        var client = await OpenApiClientV2.CreateAsync(openApiJson, domainUri);

        client.OnFailure = OnFailure;

        return newHybridClient(client);
    }

    public static void OnFailure(
        string operationId,
        IEnumerable<(string, string)> parameters,
        JsonResponse response)
    {
        if (response.HttpStatusCode.HasValue)
        {
            throw new OpenApiException(
                $"{operationId} received {(int)response.HttpStatusCode} {response.HttpStatusCode}: " +
                $"{string.Join(", ", response.FailureReasons)}");
        }

        throw new OpenApiException(
            $"{operationId}: " +
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
}
