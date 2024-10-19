using Newtonsoft.Json;
using SharpYaml.Serialization;
using SharpYaml.Tokens;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OpenApiDynamicClient;

public abstract class HybridOpenApiClientBase
{
    protected OpenApiClientV2 Client { get; private set; }

    public static async Task<T> CreateAsync<T>(Uri domainUri)
        where T : HybridOpenApiClientBase, new()
    {
        return
            await HybridOpenApiClient.CreateAsync(
                domainUri,
                client =>
                {
                    var hybridClient = new T { Client = client };
                    client.OnSuccess = hybridClient.OnSuccess;
                    client.OnFailure = hybridClient.OnFailure;
                    return hybridClient;
                });
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
        HybridOpenApiClient.OnFailure(operationId, parameters, response);
    }

    protected static string Serialize(object value)
    {
        return HybridOpenApiClient.Serialize(value);
    }

    protected static T Deserialize<T>(JsonResponse response)
    {
        return Deserialize<T>(response);
    }
}
