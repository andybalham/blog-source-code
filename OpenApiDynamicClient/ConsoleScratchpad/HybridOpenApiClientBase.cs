using OpenApiDynamicClient;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ConsoleScratchpad;

public abstract class HybridOpenApiClientBase
{
    protected OpenApiClientV2 _client;

    public static async Task<T> CreateAsync<T>(Uri domainUri) 
        where T : HybridOpenApiClientBase, new()
    {
        return
            await HybridOpenApiClient.CreateAsync(
                client => 
                {
                    var hybridClient = new T { _client = client };
                    client.OnSuccess = hybridClient.OnSuccess;
                    client.OnFailure = hybridClient.OnFailure;
                    return hybridClient; 
                },
                domainUri);
    }

    protected virtual void OnSuccess(
        string operationId,
        IEnumerable<(string, string)> parameters,
        JsonResponse response)
    {
    }

    protected virtual void OnFailure(
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
}
